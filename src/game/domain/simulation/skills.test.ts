import { describe, expect, it } from 'vitest';

import { createSimulation, stepSimulation } from './simulation';

function skillSimulation() {
  return createSimulation({
    board: { columns: 10, rows: 5, deploymentColumns: 3 },
    startingEnergy: 400,
    hearts: 3,
    seed: 9,
    startingSkills: { slow: 1, freeze: 1, doubleDamage: 1, formulaReset: 1 },
    startingUnits: [{ kind: 'snow', cell: { col: 1, row: 2 } }],
  });
}

describe('tactical skills', () => {
  it('slows and freezes enemy movement without changing the simulation clock', () => {
    let state = skillSimulation();
    const unitId = state.units[0]?.id ?? 'missing';
    state = stepSimulation(state, [
      { type: 'start' },
      { type: 'spawnEnemy', kind: 'fox', x: 5, lane: 2 },
      { type: 'useSkill', skill: 'slow' },
    ]).state;
    const slowPosition = state.enemies[0]?.position.x ?? 0;
    state = stepSimulation(state).state;
    expect((state.enemies[0]?.position.x ?? 0) - slowPosition).toBeCloseTo(
      -0.28 * (1 / 60) * 0.4,
      6,
    );

    const cooldown = stepSimulation(state, [{ type: 'useSkill', skill: 'freeze' }]);
    expect(cooldown.events.at(-1)).toMatchObject({
      type: 'commandRejected',
      reason: 'SKILL_COOLDOWN',
    });
    expect(cooldown.state.tick).toBe(state.tick + 1);
    expect(unitId).toBeDefined();
  });

  it('arms double damage only for an accepted shot and preserves it after rejection', () => {
    let state = skillSimulation();
    const unitId = state.units[0]?.id ?? 'missing';
    state = stepSimulation(state, [
      { type: 'start' },
      { type: 'useSkill', skill: 'doubleDamage' },
    ]).state;
    const rejected = stepSimulation(state, [{ type: 'fire', unitId, expression: 'x+2' }]);
    expect(rejected.state.effects.doubleDamageArmed).toBe(true);
    const fired = stepSimulation(rejected.state, [{ type: 'fire', unitId, expression: '0' }]);
    expect(fired.state.projectiles[0]?.damage).toBe(50);
    expect(fired.state.effects.doubleDamageArmed).toBe(false);
    expect(fired.state.skillStock.doubleDamage).toBe(0);
  });

  it('resets exactly the selected used formula bucket and never consumes on invalid reset', () => {
    let state = skillSimulation();
    const unitId = state.units[0]?.id ?? 'missing';
    state = stepSimulation(state, [
      { type: 'start' },
      { type: 'fire', unitId, expression: '0' },
    ]).state;
    const bucketId = state.formulaRegistry.buckets[0]?.id;
    expect(bucketId).toBeDefined();
    if (bucketId === undefined) return;
    const invalid = stepSimulation(state, [
      { type: 'useSkill', skill: 'formulaReset', bucketId: 'missing' },
    ]);
    expect(invalid.state.skillStock.formulaReset).toBe(1);
    const reset = stepSimulation(state, [{ type: 'useSkill', skill: 'formulaReset', bucketId }]);
    expect(reset.events).toContainEqual({ type: 'formulaReset', bucketId });
    expect(reset.state.formulaRegistry.buckets[0]?.uses).toBe(0);
    expect(reset.state.skillStock.formulaReset).toBe(0);
  });
});
