import { describe, expect, it } from 'vitest';

import { createSimulation, stepSimulation } from './simulation';

const board = { columns: 10, rows: 5, deploymentColumns: 3 } as const;
const rock = { id: 'rock', minX: 4.1, minY: 1.9, maxX: 4.8, maxY: 3.1 } as const;

describe('strategic phases and defender roster', () => {
  it('clears one phase before opening the next phase', () => {
    let state = createSimulation({
      board,
      startingEnergy: 300,
      hearts: 3,
      seed: 301,
      startingUnits: [{ kind: 'heavy', cell: { col: 0, row: 2 } }],
      phases: [
        {
          id: 'one',
          title: 'Thăm dò',
          intro: 'Một mục tiêu đơn lẻ.',
          spawns: [{ tick: 0, kind: 'rabbit', lane: 2, x: 2 }],
          intermissionTicks: 3,
        },
        {
          id: 'two',
          title: 'Ép làn',
          intro: 'Đợt tiếp viện xuất hiện.',
          spawns: [{ tick: 0, kind: 'rabbit', lane: 2, x: 2 }],
          intermissionTicks: 3,
        },
      ],
    });
    state = stepSimulation(state, [
      { type: 'start' },
      { type: 'assignFormula', unitId: 'unit-1', expression: '0' },
    ]).state;
    expect(state.activePhaseIndex).toBe(0);
    expect(state.allWavesSpawned).toBe(false);

    let phaseCleared = false;
    let phaseStarted = false;
    for (let tick = 0; tick < 80; tick += 1) {
      const result = stepSimulation(state);
      state = result.state;
      phaseCleared ||= result.events.some(
        (event) => event.type === 'phaseCleared' && event.phaseIndex === 0,
      );
      phaseStarted ||= result.events.some(
        (event) => event.type === 'phaseStarted' && event.phaseIndex === 1,
      );
      if (phaseStarted) break;
    }

    expect(phaseCleared).toBe(true);
    expect(phaseStarted).toBe(true);
    expect(state.activePhaseIndex).toBe(1);
    expect(state.enemies.some((enemy) => enemy.phaseIndex === 1)).toBe(true);
  });

  it('rerolls the defender offers deterministically and charges once', () => {
    const initial = createSimulation({
      board,
      startingEnergy: 100,
      hearts: 3,
      seed: 302,
      shopOffers: ['snow', 'fire', 'witch', 'nest'],
    });
    const rolled = stepSimulation(initial, [{ type: 'rerollShop' }]);
    expect(rolled.state.energy).toBe(75);
    expect(rolled.state.shopOffers).not.toEqual(initial.shopOffers);
    expect(rolled.events).toContainEqual({
      type: 'shopRerolled',
      offers: rolled.state.shopOffers,
    });

    const rejected = stepSimulation({ ...rolled.state, energy: 0 }, [{ type: 'rerollShop' }]);
    expect(rejected.state.shopOffers).toEqual(rolled.state.shopOffers);
    expect(rejected.events).toContainEqual({
      type: 'commandRejected',
      reason: 'INSUFFICIENT_ENERGY',
    });
  });

  it('lets the shield swallow block a same-lane breach on its guard cooldown', () => {
    let state = createSimulation({
      board,
      startingEnergy: 250,
      hearts: 3,
      seed: 303,
      startingUnits: [{ kind: 'shield', cell: { col: 1, row: 2 } }],
    });
    const result = stepSimulation(state, [
      { type: 'start' },
      { type: 'spawnEnemy', kind: 'fox', x: 0.01, lane: 2 },
    ]);
    let blocked = stepSimulation(result.state);
    state = blocked.state;
    blocked = stepSimulation(state);
    state = blocked.state;
    expect(state.hearts).toBe(3);
    expect(blocked.events).toContainEqual({
      type: 'enemyBlockedByShield',
      enemyId: 'entity-2',
      unitId: 'unit-1',
    });
    expect(state.units[0]?.guardAvailableTick).toBeGreaterThan(state.tick);
  });

  it('burns and hexes enemies through the new defender projectile effects', () => {
    let fireState = createSimulation({
      board,
      startingEnergy: 300,
      hearts: 3,
      seed: 304,
      startingUnits: [{ kind: 'fire', cell: { col: 0, row: 2 } }],
    });
    fireState = stepSimulation(fireState, [
      { type: 'start' },
      { type: 'assignFormula', unitId: 'unit-1', expression: '0' },
      { type: 'spawnEnemy', kind: 'fox', x: 4, lane: 2 },
    ]).state;
    let burnSeen = false;
    for (let tick = 0; tick < 100; tick += 1) {
      const result = stepSimulation(fireState);
      fireState = result.state;
      burnSeen ||= result.events.some((event) => event.type === 'enemyBurned');
      if (burnSeen) break;
    }
    expect(fireState.enemies[0]?.status.burnUntil).toBeGreaterThan(fireState.tick);
    expect(burnSeen).toBe(true);

    let witchState = createSimulation({
      board,
      startingEnergy: 300,
      hearts: 3,
      seed: 306,
      startingUnits: [{ kind: 'witch', cell: { col: 0, row: 2 } }],
    });
    witchState = stepSimulation(witchState, [
      { type: 'start' },
      { type: 'assignFormula', unitId: 'unit-1', expression: '0' },
      { type: 'spawnEnemy', kind: 'fox', x: 4, lane: 2 },
    ]).state;
    for (let tick = 0; tick < 100; tick += 1) {
      witchState = stepSimulation(witchState).state;
      if ((witchState.enemies[0]?.status.hexUntil ?? 0) > witchState.tick) break;
    }
    expect(witchState.enemies[0]?.status.hexUntil).toBeGreaterThan(witchState.tick);
  });

  it('makes the wall jumper change lanes at a wall and keeps ice guard moving in freeze', () => {
    let state = createSimulation({
      board: { ...board, obstacles: [rock] },
      startingEnergy: 100,
      hearts: 3,
      seed: 305,
      startingSkills: { freeze: 1 },
    });
    const jump = stepSimulation(state, [
      { type: 'start' },
      { type: 'spawnEnemy', kind: 'wallJumper', x: 4.5, lane: 2 },
    ]);
    state = jump.state;
    expect(jump.events).toContainEqual({ type: 'enemyWallJumped', enemyId: 'entity-1', lane: 3 });

    const frozen = stepSimulation(state, [
      { type: 'spawnEnemy', kind: 'iceGuard', x: 5, lane: 1 },
      { type: 'useSkill', skill: 'freeze' },
    ]);
    const guard = frozen.state.enemies.find((enemy) => enemy.kind === 'iceGuard');
    expect(guard?.shield).toBe(90);
    expect(guard?.position.x).toBeLessThan(5);
  });
});
