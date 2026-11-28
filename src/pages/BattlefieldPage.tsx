import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getLevelDefinition } from '../content/levels';
import { GameSession } from '../game/application/session';
import { markLevelWon, readSave, writeSave } from '../game/application/save';
import { cellCenter } from '../game/domain/board/board';
import { sampleTrajectory } from '../game/domain/math/sampler';
import { validateFormula } from '../game/domain/math/engine';
import {
  PhaserBattlefieldCanvas,
  type PreviewTrajectory,
} from '../presentation/phaser/PhaserBattlefieldCanvas';

const unitOptions = [
  {
    kind: 'snow' as const,
    name: 'Én tuyết',
    role: 'Cân bằng',
    cost: 100,
    asset: '/assets/characters/swallows/normal/swallow-normal.svg',
  },
  {
    kind: 'frost' as const,
    name: 'Én băng',
    role: 'Làm chậm',
    cost: 175,
    asset: '/assets/characters/swallows/frost/swallow-frost.svg',
  },
  {
    kind: 'heavy' as const,
    name: 'Én nặng',
    role: 'Cú ném mạnh',
    cost: 250,
    asset: '/assets/characters/swallows/heavy/swallow-heavy.svg',
  },
  {
    kind: 'nest' as const,
    name: 'Tổ may mắn',
    role: 'Tạo vật phẩm',
    cost: 50,
    asset: '/assets/characters/swallows/nest-lucky.svg',
  },
];

export function BattlefieldPage(): React.JSX.Element {
  const { levelId = 'L1' } = useParams();
  const level = getLevelDefinition(levelId);
  const session = useMemo(() => new GameSession(level.config), [level.config]);
  const [state, setState] = useState(session.getState());
  const [formula, setFormula] = useState('0');
  const [feedback, setFeedback] = useState('');
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo<PreviewTrajectory | null>(() => {
    if (!state.previewAllowed) return null;
    const unit =
      state.units.find((current) => current.id === state.selectedUnitId) ?? state.units[0];
    if (unit === undefined || unit.kind === 'nest') return null;
    const result = validateFormula(formula);
    if (!result.ok) return null;
    const origin = cellCenter(unit.cell);
    const path = sampleTrajectory(result.formula.expression, {
      maxU: state.board.columns - origin.x,
      minV: -origin.y,
      maxV: state.board.rows - origin.y,
    });
    return path.points.length > 1 ? { origin, path: path.points } : null;
  }, [formula, state.board, state.previewAllowed, state.selectedUnitId, state.units]);

  useEffect(() => {
    return session.subscribe((nextState, events) => {
      if (events.length > 0 || nextState.tick % 6 === 0) setState(nextState);
      const rejected = events.find((event) => event.type === 'commandRejected');
      if (events.some((event) => event.type === 'matchEnded' && event.result === 'won')) {
        writeSave(markLevelWon(readSave(), levelId));
      }
      if (events.some((event) => event.type === 'matchEnded')) {
        setFeedback('');
      } else if (rejected?.type === 'commandRejected') {
        const messages: Record<string, string> = {
          INVALID_FORMULA: 'Công thức chưa hợp lệ hoặc không đi qua (0, 0).',
          QUOTA: 'Đường cong này đã chạm giới hạn của màn.',
          COOLDOWN: 'Én đang lấy đà, thử lại sau một nhịp.',
          SKILL_COOLDOWN: 'Kỹ năng thời gian đang hồi.',
          PICKUP_NOT_READY: 'Vật phẩm vẫn đang nở, hãy đợi một chút.',
          INVENTORY_FULL: 'Kho đã đầy; vật phẩm vẫn ở trên sân.',
        };
        setFeedback(messages[rejected.reason] ?? 'Lệnh chưa thể thực hiện.');
      } else if (
        events.some((event) => event.type === 'shotFired' || event.type === 'skillActivated')
      ) {
        setFeedback('');
      }
    });
  }, [levelId, session]);

  useEffect(() => () => session.dispose(), [session]);

  const firstUnitId = state.units[0]?.id;
  const selectedUnitId = state.selectedUnitId ?? firstUnitId;
  const selectedUnit = state.units.find((unit) => unit.id === selectedUnitId);
  const waveCount = state.wavePlan.length;
  const waveProgress = Math.min(state.nextWaveSpawnIndex, waveCount);
  const modeLabel =
    state.mode === 'ready'
      ? 'Sẵn sàng cất cánh'
      : state.mode === 'running'
        ? 'Đang giữ khu vườn'
        : state.mode === 'paused'
          ? 'Đang tạm dừng'
          : state.mode === 'won'
            ? 'Khu vườn an toàn'
            : 'Cần thử lại';
  const start = () => {
    session.dispatch({ type: 'start' });
  };
  const fire = () => {
    if (selectedUnitId !== undefined) {
      session.dispatch({ type: 'fire', unitId: selectedUnitId, expression: formula });
    }
  };
  const togglePause = () => {
    if (state.mode === 'running') session.dispatch({ type: 'pause' });
    if (state.mode === 'paused') session.dispatch({ type: 'resume' });
  };
  const resetMatch = () => {
    session.reset();
    setFeedback('');
  };
  const insertFormula = (token: string) => {
    const input = formulaInputRef.current;
    if (input === null) {
      setFormula((current) => `${current}${token}`);
      return;
    }
    const start = input.selectionStart ?? formula.length;
    const end = input.selectionEnd ?? start;
    const next = `${formula.slice(0, start)}${token}${formula.slice(end)}`;
    setFormula(next);
    requestAnimationFrame(() => {
      input.focus();
      const caret = start + token.length;
      input.setSelectionRange(caret, caret);
    });
  };
  const placeUnit = (kind: 'snow' | 'frost' | 'heavy' | 'nest') => {
    const occupied = new Set(state.units.map((unit) => `${unit.cell.col}:${unit.cell.row}`));
    for (let row = 0; row < state.board.rows; row += 1) {
      for (let col = 0; col < state.board.deploymentColumns; col += 1) {
        if (!occupied.has(`${col}:${row}`)) {
          session.dispatch({ type: 'placeUnit', kind, cell: { col, row } });
          return;
        }
      }
    }
  };
  const activateSkill = (skill: 'slow' | 'freeze' | 'doubleDamage' | 'formulaReset') => {
    const bucketId = state.formulaRegistry.buckets.find((bucket) => bucket.uses > 0)?.id;
    if (skill === 'formulaReset' && bucketId === undefined) return;
    session.dispatch({
      type: 'useSkill',
      skill,
      ...(skill === 'formulaReset' ? { bucketId } : {}),
    });
  };

  return (
    <section className={`battlefield-page ${level.theme}`}>
      <header className="game-hud">
        <div className="level-identity">
          <span className="chapter-mark">01</span>
          <div>
            <p className="hud-kicker">
              {level.theme === 'winter' ? 'Thung lũng đông' : 'Vườn xuân'}
            </p>
            <h1>{level.title}</h1>
          </div>
        </div>
        <div className="wave-meter" aria-label={`Tiến độ ${waveProgress} trên ${waveCount} đợt`}>
          <span className="wave-label">Làn phòng thủ</span>
          <strong>
            {waveProgress}
            <small> / {waveCount}</small>
          </strong>
          <span className="wave-track">
            <span style={{ width: `${waveCount === 0 ? 0 : (waveProgress / waveCount) * 100}%` }} />
          </span>
        </div>
        <div className="resource-cluster">
          <div className="resource-pill" aria-label="Năng lượng hiện có">
            <span className="resource-icon energy-icon" aria-hidden="true" />
            <strong>{state.energy}</strong>
          </div>
          <div className="heart-pill" aria-label={`Còn ${state.hearts} tim`}>
            <span className="resource-icon heart-icon" aria-hidden="true" />
            <strong>{state.hearts}</strong>
          </div>
          <button
            className="hud-pause"
            type="button"
            onClick={togglePause}
            disabled={state.mode !== 'running' && state.mode !== 'paused'}
          >
            {state.mode === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
          </button>
          <Link className="hud-exit" to="/campaign">
            Bản đồ
          </Link>
        </div>
      </header>

      <div className="game-layout">
        <aside className="unit-rail" aria-label="Đội hình chim én">
          <div className="rail-heading">
            <span className="eyebrow">Đội hình</span>
            <span className="rail-count">{state.units.length}/12</span>
          </div>
          <p className="rail-hint">Chọn một phi công để điều khiển đường bay.</p>
          <div className="unit-shop">
            {unitOptions.map((option) => (
              <button
                className="unit-card"
                key={option.kind}
                type="button"
                disabled={state.energy < option.cost || !['ready', 'running'].includes(state.mode)}
                onClick={() => placeUnit(option.kind)}
              >
                <img src={option.asset} alt="" aria-hidden="true" />
                <span className="unit-card-copy">
                  <strong>{option.name}</strong>
                  <small>{option.role}</small>
                  <em>
                    <span className="mini-energy" aria-hidden="true" />
                    {option.cost}
                  </em>
                </span>
              </button>
            ))}
          </div>
          <div className="selected-pilot">
            <span className="eyebrow">Đang chọn</span>
            <strong>
              {selectedUnit?.kind === 'frost'
                ? 'Én băng'
                : selectedUnit?.kind === 'heavy'
                  ? 'Én nặng'
                  : selectedUnit?.kind === 'nest'
                    ? 'Tổ may mắn'
                    : 'Én tuyết'}
            </strong>
            <small>
              {selectedUnit?.kind === 'nest'
                ? 'Tổ không phóng tuyết cầu'
                : 'Công thức sẽ bắt đầu tại ô này'}
            </small>
          </div>
        </aside>

        <main className="battlefield-column">
          <div className="stage-caption">
            <span>
              <i className="status-dot" />
              {modeLabel}
            </span>
            <span>
              {state.pickups.length > 0
                ? `${state.pickups.length} vật phẩm đang chờ bạn`
                : level.theme === 'winter'
                  ? 'Gió lạnh · mục tiêu tiến từ phía đông'
                  : 'Nắng nhẹ · mục tiêu tiến từ phía đông'}
            </span>
          </div>
          <div className="battlefield-stage">
            <PhaserBattlefieldCanvas session={session} preview={preview} theme={level.theme} />
          </div>
        </main>
      </div>

      <section className="trajectory-dock" aria-label="Phòng thí nghiệm đường bay">
        <div className="tactical-strip" aria-label="Kỹ năng chiến thuật">
          <div className="dock-heading">
            <span className="eyebrow">Túi chiến thuật</span>
            <small>Vật phẩm thu thập được</small>
          </div>
          <button
            type="button"
            disabled={state.skillStock.slow === 0 || state.mode !== 'running'}
            onClick={() => activateSkill('slow')}
          >
            <span className="skill-glyph slow-glyph" aria-hidden="true" />
            Chậm <strong>{state.skillStock.slow}</strong>
          </button>
          <button
            type="button"
            disabled={state.skillStock.freeze === 0 || state.mode !== 'running'}
            onClick={() => activateSkill('freeze')}
          >
            <span className="skill-glyph freeze-glyph" aria-hidden="true" />
            Đóng băng <strong>{state.skillStock.freeze}</strong>
          </button>
          <button
            type="button"
            disabled={state.skillStock.doubleDamage === 0 || state.mode !== 'running'}
            onClick={() => activateSkill('doubleDamage')}
          >
            <span className="skill-glyph damage-glyph" aria-hidden="true" />
            Tăng lực <strong>{state.skillStock.doubleDamage}</strong>
          </button>
          <button
            type="button"
            disabled={
              state.skillStock.formulaReset === 0 ||
              state.mode !== 'running' ||
              !state.formulaRegistry.buckets.some((bucket) => bucket.uses > 0)
            }
            onClick={() => activateSkill('formulaReset')}
          >
            <span className="skill-glyph reset-glyph" aria-hidden="true" />
            Reset <strong>{state.skillStock.formulaReset}</strong>
          </button>
        </div>
        <div className="formula-lab">
          <div className="lab-title-row">
            <div>
              <span className="eyebrow">Trajectory lab</span>
              <strong>
                Vẽ đường bay cho{' '}
                {selectedUnit?.kind === 'nest' ? 'phi công kế tiếp' : 'phi công đã chọn'}
              </strong>
            </div>
            <span className="lab-origin">
              Gốc tại ô{' '}
              {selectedUnit ? `${selectedUnit.cell.col + 1}:${selectedUnit.cell.row + 1}` : '—'}
            </span>
          </div>
          <div className="formula-input-row">
            <label htmlFor="formula">Đường bay y = f(x)</label>
            <input
              ref={formulaInputRef}
              id="formula"
              value={formula}
              onChange={(event) => setFormula(event.target.value)}
              aria-describedby="formula-help"
            />
            {state.mode === 'ready' && (
              <button className="button button-primary" type="button" onClick={start}>
                Bắt đầu
              </button>
            )}
            {state.mode === 'running' && (
              <button
                className="button button-primary"
                type="button"
                onClick={fire}
                disabled={selectedUnit?.kind === 'nest'}
              >
                Phóng tuyết cầu
              </button>
            )}
            {(state.mode === 'won' || state.mode === 'lost') && (
              <button className="button button-primary" type="button" onClick={resetMatch}>
                Chơi lại
              </button>
            )}
          </div>
          <div className="formula-shortcuts" aria-label="Phím tắt toán học">
            {['x', 'x^2', 'sin(', 'cos(', 'abs(', 'sqrt(', '(', ')', '+', '−', '×', '÷'].map(
              (token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() =>
                    insertFormula(
                      token === '−' ? '-' : token === '×' ? '*' : token === '÷' ? '/' : token,
                    )
                  }
                >
                  {token}
                </button>
              ),
            )}
          </div>
          <div className="formula-lab-meta">
            <span id="formula-help">
              Đi qua (0, 0) · thử <code>0.5x</code> hoặc <code>-0.08x^2 + 0.6x</code>
            </span>
            <span className="formula-feedback" role="status">
              {feedback}
            </span>
          </div>
          <div className="formula-history" aria-label="Lịch sử công thức">
            {state.formulaRegistry.buckets.length === 0 ? (
              <span>Chưa có đường bay nào được ghi nhận.</span>
            ) : (
              state.formulaRegistry.buckets.slice(-3).map((bucket) => (
                <span key={bucket.id}>
                  <code>{bucket.representative.source}</code>
                  <b>{bucket.uses}</b>
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {(state.mode === 'won' || state.mode === 'lost') && (
        <div
          className="result-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={state.mode === 'won' ? 'Hoàn thành màn chơi' : 'Kết thúc màn chơi'}
        >
          <div className="result-card">
            <span className={`result-stamp ${state.mode === 'won' ? 'win-stamp' : 'loss-stamp'}`}>
              {state.mode === 'won' ? 'Tốt lắm' : 'Giữ bình tĩnh'}
            </span>
            <p className="eyebrow">
              {level.theme === 'winter' ? 'Thung lũng đông' : 'Vườn xuân'} · Màn {levelId}
            </p>
            <h2>{state.mode === 'won' ? 'Khu vườn đã bình yên' : 'Bầy địch đã vượt qua'}</h2>
            <p>
              {state.mode === 'won'
                ? 'Đường bay của bạn đã giữ được tổ chim. Màn tiếp theo đã sẵn sàng trên bản đồ.'
                : 'Hãy đổi góc phóng hoặc giữ lại năng lượng cho đợt cuối.'}
            </p>
            <div className="result-actions">
              <button className="button button-primary" type="button" onClick={resetMatch}>
                Chơi lại
              </button>
              <Link className="button button-secondary" to="/campaign">
                Về bản đồ
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
