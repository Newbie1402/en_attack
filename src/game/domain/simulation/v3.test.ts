import { describe, expect, it } from 'vitest';

import { createSimulation, stepSimulation } from './simulation';

const board = { columns: 10, rows: 5, deploymentColumns: 3 } as const;

function combatSimulation() {
  return createSimulation({
    board,
    startingEnergy: 500,
    hearts: 3,
    seed: 88,
    startingUnits: [
      { kind: 'snow', cell: { col: 0, row: 1 } },
      { kind: 'snow', cell: { col: 0, row: 2 } },
      { kind: 'snow', cell: { col: 0, row: 3 } },
    ],
    waves: [{ tick: 0, kind: 'fox', lane: 2, x: 9.5 }],
  });
}

describe('V3 automatic combat and formula ownership', () => {
  it('assigns independent formulas and schedules automatic shots without Fire commands', () => {
    const initial = combatSimulation();
    const result = stepSimulation(initial, [
      { type: 'start' },
      { type: 'assignFormula', unitId: 'unit-1', expression: '0' },
      { type: 'assignFormula', unitId: 'unit-2', expression: '0.5x' },
      { type: 'assignFormula', unitId: 'unit-3', expression: '-0.5x' },
    ]);

    expect(result.events.filter((event) => event.type === 'shotFired')).toHaveLength(3);
    expect(result.state.projectiles.map((projectile) => projectile.formula.source)).toEqual([
      '0',
      '0.5x',
      '-0.5x',
    ]);
    expect(result.state.units.every((unit) => unit.attackState === 'COOLDOWN')).toBe(true);
  });

  it('rejects equivalent active formulas and preserves the previous assignment', () => {
    let state = combatSimulation();
    state = stepSimulation(state, [
      { type: 'assignFormula', unitId: 'unit-1', expression: '2x' },
    ]).state;
    const conflict = stepSimulation(state, [
      { type: 'assignFormula', unitId: 'unit-2', expression: 'x+x' },
    ]);

    expect(conflict.events.at(0)).toMatchObject({
      type: 'formulaConflict',
      ownerUnitId: 'unit-1',
    });
    expect(conflict.state.units.find((unit) => unit.id === 'unit-2')?.assignedFormula).toBeNull();
  });

  it('keeps the old formula and cooldown when an invalid or in-flight reassignment is attempted', () => {
    let state = combatSimulation();
    state = stepSimulation(state, [
      { type: 'start' },
      { type: 'assignFormula', unitId: 'unit-1', expression: '0' },
    ]).state;
    const before = state.units.find((unit) => unit.id === 'unit-1');
    const invalid = stepSimulation(state, [
      { type: 'assignFormula', unitId: 'unit-1', expression: 'sin(' },
    ]);
    expect(invalid.state.units.find((unit) => unit.id === 'unit-1')?.assignedFormula).toEqual(
      before?.assignedFormula,
    );
    const reassigned = stepSimulation(state, [
      { type: 'assignFormula', unitId: 'unit-1', expression: '0.25x' },
    ]);
    expect(reassigned.state.units.find((unit) => unit.id === 'unit-1')?.cooldownUntil).toBe(
      before?.cooldownUntil,
    );
  });

  it('places a nest only at the player-selected tile and preserves formula ownership on relocation', () => {
    let state = createSimulation({
      board,
      startingEnergy: 250,
      hearts: 3,
      seed: 90,
      startingUnits: [{ kind: 'snow', cell: { col: 0, row: 2 } }],
    });
    state = stepSimulation(state, [
      { type: 'assignFormula', unitId: 'unit-1', expression: '0' },
      { type: 'placeUnit', kind: 'nest', cell: { col: 2, row: 4 } },
    ]).state;
    expect(state.units.find((unit) => unit.kind === 'nest')?.cell).toEqual({ col: 2, row: 4 });
    state = stepSimulation(state, [
      { type: 'moveUnit', unitId: 'unit-1', cell: { col: 1, row: 1 } },
    ]).state;
    expect(state.units.find((unit) => unit.id === 'unit-1')?.assignedFormula?.source).toBe('0');
    expect(state.formulaOwnership).toContainEqual({
      canonicalKey: 'poly(0:0)',
      unitId: 'unit-1',
      source: '0',
    });
    const blockedRelocation = stepSimulation(state, [
      { type: 'moveUnit', unitId: 'unit-1', cell: { col: 1, row: 2 } },
    ]);
    expect(blockedRelocation.events).toContainEqual({
      type: 'commandRejected',
      reason: 'RELOCATION_COOLDOWN',
    });
  });
});

describe('V3 enemy defense state', () => {
  it('absorbs turtle damage through armor before health', () => {
    let state = createSimulation({
      board,
      startingEnergy: 250,
      hearts: 3,
      seed: 91,
      startingUnits: [{ kind: 'snow', cell: { col: 0, row: 2 } }],
    });
    state = stepSimulation(state, [
      { type: 'start' },
      { type: 'assignFormula', unitId: 'unit-1', expression: '0' },
      { type: 'spawnEnemy', kind: 'turtle', x: 5, lane: 2 },
    ]).state;
    let hit;
    for (let index = 0; index < 60; index += 1) {
      const result = stepSimulation(state);
      state = result.state;
      hit ??= result.events.find((event) => event.type === 'hit');
    }
    expect(hit).toMatchObject({ type: 'hit', blocked: true });
    expect(state.enemies[0]?.armor).toBeLessThan(100);
    expect(state.enemies[0]?.health).toBe(140);
  });

  it('reduces frontal boar damage and lets a frost-resistant wolf keep moving during freeze', () => {
    let state = createSimulation({
      board,
      startingEnergy: 250,
      hearts: 3,
      seed: 92,
      startingSkills: { freeze: 1 },
      startingUnits: [{ kind: 'snow', cell: { col: 0, row: 2 } }],
    });
    state = stepSimulation(state, [
      { type: 'start' },
      { type: 'assignFormula', unitId: 'unit-1', expression: '0' },
      { type: 'spawnEnemy', kind: 'boar', x: 5, lane: 2 },
      { type: 'spawnEnemy', kind: 'wolf', x: 6, lane: 1 },
      { type: 'useSkill', skill: 'freeze' },
    ]).state;
    const boarId = state.enemies.find((enemy) => enemy.kind === 'boar')?.id;
    let boarHit;
    for (let index = 0; index < 60; index += 1) {
      const result = stepSimulation(state);
      state = result.state;
      boarHit ??= result.events.find((event) => event.type === 'hit' && event.enemyId === boarId);
    }
    expect(boarHit).toMatchObject({ type: 'hit', blocked: true });
    expect(state.enemies.find((enemy) => enemy.kind === 'boar')?.health).toBeGreaterThan(150);
    expect(state.enemies.find((enemy) => enemy.kind === 'wolf')?.position.x).toBeLessThan(6);
  });
});
