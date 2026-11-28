import { describe, expect, it } from 'vitest';

import { createSimulation, stepSimulation } from './simulation';
import type { SimulationEvent } from './types';

function advance(state: ReturnType<typeof createSimulation>, count: number) {
  let current = state;
  const events: SimulationEvent[] = [];
  for (let index = 0; index < count; index += 1) {
    const result = stepSimulation(current);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

describe('quota and boss phases', () => {
  it('rejects the fourth accepted use of a quota bucket without charging it', () => {
    let state = createSimulation({
      board: { columns: 10, rows: 5, deploymentColumns: 3 },
      startingEnergy: 400,
      hearts: 3,
      seed: 31,
      formulaUseLimit: 3,
      quotaActive: true,
      startingUnits: [{ kind: 'snow', cell: { col: 1, row: 2 } }],
    });
    const unitId = state.units[0]?.id ?? 'missing';
    state = stepSimulation(state, [{ type: 'start' }]).state;
    for (let index = 0; index < 3; index += 1) {
      state = stepSimulation(state, [{ type: 'fire', unitId, expression: '0' }]).state;
      state = advance(state, 110).state;
    }
    const rejected = stepSimulation(state, [{ type: 'fire', unitId, expression: '0' }]);
    expect(rejected.events.at(0)).toMatchObject({ type: 'commandRejected', reason: 'QUOTA' });
    expect(rejected.state.formulaRegistry.buckets[0]?.uses).toBe(3);
  });

  it('fires both boss thresholds once and summons adds before win evaluation', () => {
    let state = createSimulation({
      board: { columns: 10, rows: 5, deploymentColumns: 3 },
      startingEnergy: 400,
      hearts: 3,
      seed: 32,
      formulaUseLimit: 3,
      allWavesSpawned: true,
      startingUnits: [{ kind: 'heavy', cell: { col: 1, row: 2 } }],
    });
    const unitId = state.units[0]?.id ?? 'missing';
    state = stepSimulation(state, [
      { type: 'start' },
      { type: 'spawnEnemy', kind: 'guardian', x: 9, lane: 2 },
    ]).state;
    const phaseEvents: string[] = [];
    for (let index = 0; index < 30; index += 1) {
      const expression = `${(index + 1) / 100}x`;
      const result = stepSimulation(state, [{ type: 'fire', unitId, expression }]);
      const advanced = advance(result.state, 220);
      state = advanced.state;
      phaseEvents.push(
        ...[...result.events, ...advanced.events]
          .filter((event) => event.type === 'bossPhaseChanged')
          .map((event) => `phase-${event.phase}`),
      );
      if (phaseEvents.includes('phase-2')) break;
    }
    expect(new Set(phaseEvents)).toEqual(new Set(['phase-1', 'phase-2']));
    expect(state.bossPhase).toBe(2);
    expect(state.previewAllowed).toBe(false);
    expect(state.enemies.some((enemy) => enemy.kind === 'fox')).toBe(true);
  });
});
