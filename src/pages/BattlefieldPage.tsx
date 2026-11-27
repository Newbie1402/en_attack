import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

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

export function BattlefieldPage(): React.JSX.Element {
  const { levelId = 'L1' } = useParams();
  const level = getLevelDefinition(levelId);
  const session = useMemo(() => new GameSession(level.config), [level.config]);
  const [state, setState] = useState(session.getState());
  const [formula, setFormula] = useState('0');
  const [feedback, setFeedback] = useState('');
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
      if (rejected?.type === 'commandRejected') {
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
  const start = () => {
    if (firstUnitId === undefined) return;
    session.dispatch({ type: 'start' });
  };
  const fire = () => {
    if (firstUnitId !== undefined) {
      session.dispatch({ type: 'fire', unitId: firstUnitId, expression: formula });
    }
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
    <section className="battlefield-page">
      <div className="battlefield-toolbar">
        <div>
          <p className="eyebrow">
            Màn {levelId} · {state.mode === 'ready' ? 'Sẵn sàng' : state.mode}
          </p>
          <h1>{level.title}</h1>
        </div>
        <div className="battlefield-resources">
          <div className="resource-pill" aria-label="Năng lượng hiện có">
            ☀ <strong>{state.energy}</strong>
          </div>
          <div className="heart-pill" aria-label={`Còn ${state.hearts} tim`}>
            {'♥'.repeat(state.hearts)}
            {'♡'.repeat(Math.max(0, 3 - state.hearts))}
          </div>
        </div>
      </div>
      <div className="shop-panel" aria-label="Cửa hàng chim én">
        <span className="shop-title">Đội hình</span>
        <button type="button" disabled={state.energy < 100} onClick={() => placeUnit('snow')}>
          <span className="shop-avatar basic-avatar" aria-hidden="true">
            ◒
          </span>
          <span>
            Én tuyết <strong>100</strong>
          </span>
        </button>
        <button type="button" disabled={state.energy < 175} onClick={() => placeUnit('frost')}>
          <span className="shop-avatar frost-avatar" aria-hidden="true">
            ❄
          </span>
          <span>
            Én băng <strong>175</strong>
          </span>
        </button>
        <button type="button" disabled={state.energy < 250} onClick={() => placeUnit('heavy')}>
          <span className="shop-avatar heavy-avatar" aria-hidden="true">
            ●
          </span>
          <span>
            Én nặng <strong>250</strong>
          </span>
        </button>
        <button type="button" disabled={state.energy < 50} onClick={() => placeUnit('nest')}>
          <span className="shop-avatar nest-avatar" aria-hidden="true">
            ⌒
          </span>
          <span>
            Tổ may mắn <strong>50</strong>
          </span>
        </button>
      </div>
      <PhaserBattlefieldCanvas session={session} preview={preview} />
      <div className="skills-panel" aria-label="Kỹ năng chiến thuật">
        <span className="shop-title">Kỹ năng</span>
        <button
          type="button"
          disabled={state.skillStock.slow === 0 || state.mode !== 'running'}
          onClick={() => activateSkill('slow')}
        >
          Chậm <strong>{state.skillStock.slow}</strong>
        </button>
        <button
          type="button"
          disabled={state.skillStock.freeze === 0 || state.mode !== 'running'}
          onClick={() => activateSkill('freeze')}
        >
          Đóng băng <strong>{state.skillStock.freeze}</strong>
        </button>
        <button
          type="button"
          disabled={state.skillStock.doubleDamage === 0 || state.mode !== 'running'}
          onClick={() => activateSkill('doubleDamage')}
        >
          Tăng damage <strong>{state.skillStock.doubleDamage}</strong>
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
          Reset đường bay <strong>{state.skillStock.formulaReset}</strong>
        </button>
      </div>
      <div className="formula-dock">
        <label htmlFor="formula">Đường bay y = f(x)</label>
        <input
          id="formula"
          value={formula}
          onChange={(event) => setFormula(event.target.value)}
          aria-describedby="formula-help"
        />
        <span id="formula-help">
          Nhập công thức đi qua (0, 0), ví dụ: 0.5x hoặc -0.08x^2 + 0.6x
        </span>
        <span className="formula-feedback" role="status">
          {feedback}
        </span>
        {state.mode === 'ready' && (
          <button className="button button-primary" type="button" onClick={start}>
            Bắt đầu
          </button>
        )}
        {state.mode === 'running' && (
          <button className="button button-primary" type="button" onClick={fire}>
            Phóng tuyết cầu
          </button>
        )}
        {(state.mode === 'won' || state.mode === 'lost') && (
          <button className="button button-primary" type="button" onClick={() => session.reset()}>
            Chơi lại
          </button>
        )}
      </div>
    </section>
  );
}
