import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getLevelDefinition } from '../content/levels';
import { GameSession } from '../game/application/session';
import { markLevelWon, readSave, writeSave } from '../game/application/save';
import { cellCenter, type Cell } from '../game/domain/board/board';
import { sampleTrajectory } from '../game/domain/math/sampler';
import { validateFormula } from '../game/domain/math/engine';
import {
  PhaserBattlefieldCanvas,
  type PreviewTrajectory,
} from '../presentation/phaser/PhaserBattlefieldCanvas';
import type { UnitKind } from '../game/domain/simulation/types';

const unitOptions = [
  {
    kind: 'snow' as const,
    name: 'Én tuyết',
    role: 'Cân bằng',
    cost: 100,
    asset: '/assets/characters/swallows/normal/portrait.png',
  },
  {
    kind: 'frost' as const,
    name: 'Én băng',
    role: 'Làm chậm',
    cost: 175,
    asset: '/assets/characters/swallows/frost/portrait.png',
  },
  {
    kind: 'heavy' as const,
    name: 'Én nặng',
    role: 'Cú ném mạnh',
    cost: 250,
    asset: '/assets/characters/swallows/heavy/portrait.png',
  },
  {
    kind: 'shield' as const,
    name: 'Én khiên',
    role: 'Chặn một lần thủng',
    cost: 140,
    asset: '/assets/characters/swallows/shield/swallow-shield.svg',
  },
  {
    kind: 'fire' as const,
    name: 'Én lửa',
    role: 'Thiêu theo thời gian',
    cost: 210,
    asset: '/assets/characters/swallows/fire/swallow-fire.svg',
  },
  {
    kind: 'witch' as const,
    name: 'Én phù thủy',
    role: 'Nguyền tăng sát thương',
    cost: 260,
    asset: '/assets/characters/swallows/witch/swallow-witch.svg',
  },
  {
    kind: 'nest' as const,
    name: 'Tổ may mắn',
    role: 'Tạo vật phẩm',
    cost: 50,
    asset: '/assets/nests/lucky-nest/portrait.png',
  },
];

export function BattlefieldPage(): React.JSX.Element {
  const { levelId = 'L1' } = useParams();
  const level = getLevelDefinition(levelId);
  const session = useMemo(() => new GameSession(level.config), [level.config]);
  const preferences = useMemo(() => readSave(), []);
  const initialState = session.getState();
  const [state, setState] = useState(initialState);
  const [formula, setFormula] = useState(
    initialState.units.find((unit) => unit.id === initialState.selectedUnitId)?.assignedFormula
      ?.source ?? '',
  );
  const [feedback, setFeedback] = useState('');
  const [placementKind, setPlacementKind] = useState<UnitKind | null>(null);
  const [relocationUnitId, setRelocationUnitId] = useState<string | null>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const editorUnitRef = useRef<string | null>(initialState.selectedUnitId);
  const modeRef = useRef(initialState.mode);
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
      if (nextState.selectedUnitId !== editorUnitRef.current) {
        editorUnitRef.current = nextState.selectedUnitId;
        setFormula(
          nextState.units.find((unit) => unit.id === nextState.selectedUnitId)?.assignedFormula
            ?.source ?? '',
        );
      }
      const modeChanged = modeRef.current !== nextState.mode;
      modeRef.current = nextState.mode;
      if (events.length > 0 || nextState.tick % 6 === 0 || modeChanged) setState(nextState);
      const rejected = events.find((event) => event.type === 'commandRejected');
      if (events.some((event) => event.type === 'matchEnded' && event.result === 'won')) {
        writeSave(markLevelWon(readSave(), levelId));
      }
      if (events.some((event) => event.type === 'matchEnded')) {
        setFeedback('');
      } else if (events.some((event) => event.type === 'shopRerolled')) {
        setFeedback('Đội hình mới đã sẵn sàng. Chọn một ô để triển khai.');
      } else if (events.some((event) => event.type === 'phaseStarted')) {
        const started = events.find((event) => event.type === 'phaseStarted');
        if (started?.type === 'phaseStarted') setFeedback(`Pha mới: ${started.title}.`);
      } else if (events.some((event) => event.type === 'enemyBlockedByShield')) {
        setFeedback('Én khiên đã chặn một kẻ địch lọt qua.');
      } else if (rejected?.type === 'commandRejected') {
        const messages: Record<string, string> = {
          INVALID_FORMULA: 'Công thức chưa hợp lệ hoặc không đi qua (0, 0).',
          QUOTA: 'Đường cong này đã chạm giới hạn của màn.',
          COOLDOWN: 'Én đang lấy đà, thử lại sau một nhịp.',
          SKILL_COOLDOWN: 'Kỹ năng thời gian đang hồi.',
          PICKUP_NOT_READY: 'Vật phẩm vẫn đang nở, hãy đợi một chút.',
          INVENTORY_FULL: 'Kho đã đầy; vật phẩm vẫn ở trên sân.',
          NO_FORMULA: 'Phi công này chưa có công thức hoạt động.',
          FORMULA_CONFLICT: 'Công thức này đang được dùng bởi một phi công khác.',
          RELOCATION_COOLDOWN: 'Én vừa đổi vị trí; hãy đợi hồi chiêu di chuyển.',
          INSUFFICIENT_ENERGY: 'Không đủ năng lượng cho thao tác này.',
          FORBIDDEN_CELL: 'Ô này không thể triển khai hoặc đang bị chặn.',
          NEST_STATIONARY: 'Tổ may mắn không thể di chuyển.',
        };
        setFeedback(messages[rejected.reason] ?? 'Lệnh chưa thể thực hiện.');
      } else if (events.some((event) => event.type === 'formulaConflict')) {
        const conflict = events.find((event) => event.type === 'formulaConflict');
        if (conflict?.type === 'formulaConflict') {
          const ownerNumber =
            nextState.units.findIndex((unit) => unit.id === conflict.ownerUnitId) + 1;
          setFeedback(`Công thức này đang được sử dụng bởi Én số ${Math.max(ownerNumber, 1)}.`);
        }
      } else if (events.some((event) => event.type === 'formulaAssigned')) {
        setFeedback('Đã gắn công thức. Phi công sẽ tự phóng khi có mục tiêu.');
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
  const activePhase = state.phasePlan[state.activePhaseIndex];
  const previousPhaseSpawnCount = state.phasePlan
    .slice(0, state.activePhaseIndex)
    .reduce((total, phase) => total + phase.spawns.length, 0);
  const phaseSpawnProgress = activePhase
    ? Math.min(
        activePhase.spawns.length,
        Math.max(0, state.nextWaveSpawnIndex - previousPhaseSpawnCount),
      )
    : 0;
  const phaseCount = state.phasePlan.length;
  const phaseNumber = Math.min(state.activePhaseIndex + 1, Math.max(phaseCount, 1));
  const phaseLabel =
    state.phaseStatus === 'intermission'
      ? 'Nghỉ chiến thuật'
      : state.phaseStatus === 'complete'
        ? 'Đã dọn sạch'
        : (activePhase?.title ?? 'Chuẩn bị');
  const phasePercent =
    phaseCount === 0
      ? 0
      : ((state.activePhaseIndex +
          (activePhase === undefined || activePhase.spawns.length === 0
            ? 0
            : phaseSpawnProgress / activePhase.spawns.length)) /
          phaseCount) *
        100;
  const availableUnitOptions = unitOptions.filter((option) =>
    state.shopOffers.includes(option.kind),
  );
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
  const applyFormula = () => {
    if (selectedUnitId !== undefined && selectedUnit?.kind !== 'nest') {
      session.dispatch({ type: 'assignFormula', unitId: selectedUnitId, expression: formula });
    }
  };
  const togglePause = () => {
    if (state.mode === 'running') session.dispatch({ type: 'pause' });
    if (state.mode === 'paused') session.dispatch({ type: 'resume' });
  };

  const handleEscape = useCallback(
    (event: { readonly key: string; preventDefault: () => void }) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (placementKind !== null || relocationUnitId !== null) {
        setPlacementKind(null);
        setRelocationUnitId(null);
        return;
      }
      const currentMode = session.getState().mode;
      if (currentMode === 'running') session.dispatch({ type: 'pause' });
      if (currentMode === 'paused') session.dispatch({ type: 'resume' });
    },
    [placementKind, relocationUnitId, session],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

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
  const selectPlacement = (kind: UnitKind) => {
    setRelocationUnitId(null);
    setPlacementKind((current) => (current === kind ? null : kind));
  };
  const handleBoardCell = (cell: Cell) => {
    if (placementKind !== null) {
      session.dispatch({ type: 'placeUnit', kind: placementKind, cell });
      setPlacementKind(null);
      return;
    }
    if (relocationUnitId !== null) {
      session.dispatch({ type: 'moveUnit', unitId: relocationUnitId, cell });
      setRelocationUnitId(null);
    }
  };
  const beginRelocation = () => {
    if (selectedUnit !== undefined && selectedUnit.kind !== 'nest') {
      setPlacementKind(null);
      setRelocationUnitId(selectedUnit.id);
    }
  };
  const cancelBoardMode = () => {
    setPlacementKind(null);
    setRelocationUnitId(null);
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
    <section className={`battlefield-page ${level.theme}`} onKeyDownCapture={handleEscape}>
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
        <div
          className="wave-meter"
          aria-label={`Pha ${phaseNumber} trên ${phaseCount}: ${phaseLabel}`}
        >
          <span className="wave-label">{phaseLabel}</span>
          <strong>
            Pha {phaseNumber}
            <small> / {phaseCount}</small>
          </strong>
          <span className="wave-track">
            <span style={{ width: `${phasePercent}%` }} />
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
            {availableUnitOptions.map((option) => (
              <button
                className="unit-card"
                key={option.kind}
                type="button"
                disabled={state.energy < option.cost || !['ready', 'running'].includes(state.mode)}
                aria-pressed={placementKind === option.kind}
                draggable
                onDragStart={() => selectPlacement(option.kind)}
                onClick={() => selectPlacement(option.kind)}
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
            <button
              className="unit-roll"
              type="button"
              onClick={() => session.dispatch({ type: 'rerollShop' })}
              disabled={
                state.energy < state.economy.rerollCost ||
                !['ready', 'running'].includes(state.mode)
              }
            >
              Đổi đội hình · {state.economy.rerollCost}
            </button>
          </div>
          <div className="selected-pilot">
            <span className="eyebrow">Đang chọn</span>
            <strong>
              {selectedUnit?.kind === 'frost'
                ? 'Én băng'
                : selectedUnit?.kind === 'heavy'
                  ? 'Én nặng'
                  : selectedUnit?.kind === 'shield'
                    ? 'Én khiên'
                    : selectedUnit?.kind === 'fire'
                      ? 'Én lửa'
                      : selectedUnit?.kind === 'witch'
                        ? 'Én phù thủy'
                        : selectedUnit?.kind === 'nest'
                          ? 'Tổ may mắn'
                          : 'Én tuyết'}
            </strong>
            <small>
              {selectedUnit === undefined
                ? 'Chưa chọn phi công'
                : selectedUnit.kind === 'nest'
                  ? 'Tổ không phóng tuyết cầu'
                  : selectedUnit.assignedFormula === null
                    ? 'Chưa có công thức · cần gắn trước khi tự chiến đấu'
                    : `${selectedUnit.attackState} · ${selectedUnit.assignedFormula.source}`}
            </small>
            {selectedUnit !== undefined && selectedUnit.kind !== 'nest' && (
              <button className="rail-action" type="button" onClick={beginRelocation}>
                Đổi vị trí · {state.economy.relocationCost}
              </button>
            )}
            {(placementKind !== null || relocationUnitId !== null) && (
              <button className="rail-cancel" type="button" onClick={cancelBoardMode}>
                Hủy thao tác
              </button>
            )}
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
                : state.phaseStatus === 'intermission'
                  ? 'Khoảng nghỉ · chuẩn bị đội hình mới'
                  : (activePhase?.intro ??
                    (level.theme === 'winter'
                      ? 'Gió lạnh · mục tiêu tiến từ phía đông'
                      : 'Nắng nhẹ · mục tiêu tiến từ phía đông'))}
            </span>
          </div>
          <div className="battlefield-stage">
            <PhaserBattlefieldCanvas
              session={session}
              preview={preview}
              theme={level.theme}
              muted={preferences.muted}
              reducedMotion={preferences.reducedMotion}
              placementKind={placementKind}
              relocationUnitId={relocationUnitId}
              onBoardCell={handleBoardCell}
              onCancel={cancelBoardMode}
            />
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
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyFormula();
                }
              }}
              aria-describedby={preferences.hints ? 'formula-help' : undefined}
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
                onClick={applyFormula}
                disabled={selectedUnit?.kind === 'nest'}
              >
                Áp dụng công thức
              </button>
            )}
            {state.mode === 'ready' && (
              <button
                className="button button-secondary"
                type="button"
                onClick={applyFormula}
                disabled={selectedUnit?.kind === 'nest'}
              >
                Gắn công thức
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
            {preferences.hints && (
              <span id="formula-help">
                Đi qua (0, 0) · tự động phóng khi có mục tiêu · thử <code>0.5x</code> hoặc{' '}
                <code>-0.08x^2 + 0.6x</code>
              </span>
            )}
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
