import { describe, expect, it } from 'vitest';

import { createScreenLayout, screenToWorld, worldToScreen } from '../board/board';
import { createSimulation, stepSimulation } from './simulation';
import type { SimulationEvent } from './types';

const board = { columns: 10, rows: 5, deploymentColumns: 3 } as const;

function initialSimulation(
  obstacles: readonly { id: string; minX: number; minY: number; maxX: number; maxY: number }[] = [],
) {
  return createSimulation({
    board: { ...board, obstacles },
    startingEnergy: 250,
    hearts: 3,
    seed: 42,
    startingUnits: [{ kind: 'snow', cell: { col: 1, row: 2 } }],
  });
}

function run(state: ReturnType<typeof initialSimulation>, count: number) {
  let current = state;
  const events: SimulationEvent[] = [];
  for (let index = 0; index < count; index += 1) {
    const result = stepSimulation(current);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

describe('board coordinate contract', () => {
  it('keeps world coordinates square and invertible at a letterboxed size', () => {
    const layout = createScreenLayout({ ...board, obstacles: [] }, 1000, 500);
    const screen = worldToScreen({ x: 1, y: 1 }, { ...board, obstacles: [] }, layout);
    expect(screen).toEqual({ x: 100, y: 400 });
    expect(screenToWorld(screen, { ...board, obstacles: [] }, layout)).toEqual({ x: 1, y: 1 });
  });
});

describe('fixed-step simulation commands', () => {
  it('checks placement atomically and charges only one valid click', () => {
    const state = initialSimulation();
    const result = stepSimulation(state, [
      { type: 'placeUnit', kind: 'frost', cell: { col: 4, row: 1 } },
      { type: 'placeUnit', kind: 'frost', cell: { col: 2, row: 1 } },
      { type: 'placeUnit', kind: 'frost', cell: { col: 2, row: 1 } },
    ]);
    expect(result.state.energy).toBe(75);
    expect(result.state.units).toHaveLength(2);
    expect(result.events.map((event) => event.type)).toEqual([
      'commandRejected',
      'unitPlaced',
      'commandRejected',
    ]);
  });

  it('sweeps a moving enemy and applies a shot once', () => {
    let state = initialSimulation();
    const started = stepSimulation(state, [
      { type: 'start' },
      { type: 'spawnEnemy', kind: 'fox', x: 5, lane: 2 },
      { type: 'fire', unitId: state.units[0]?.id ?? 'missing', expression: '0' },
    ]);
    state = started.state;
    const result = run(state, 50);
    const hits = result.events.filter((event) => event.type === 'hit');
    expect(hits).toHaveLength(1);
    expect(result.state.enemies[0]?.health).toBe(75);
  });

  it('stops a projectile at an obstacle before an enemy behind it', () => {
    let state = initialSimulation([{ id: 'rock-1', minX: 3.1, minY: 2, maxX: 3.4, maxY: 3 }]);
    state = stepSimulation(state, [
      { type: 'start' },
      { type: 'spawnEnemy', kind: 'fox', x: 5, lane: 2 },
      { type: 'fire', unitId: state.units[0]?.id ?? 'missing', expression: '0' },
    ]).state;
    const result = run(state, 50);
    expect(result.events.some((event) => event.type === 'hit')).toBe(false);
    expect(result.state.enemies).toHaveLength(1);
    expect(result.state.projectiles).toHaveLength(0);
  });

  it('keeps the launch origin immutable while the unit moves and pauses the clock', () => {
    let state = initialSimulation();
    state = stepSimulation(state, [
      { type: 'start' },
      { type: 'fire', unitId: state.units[0]?.id ?? 'missing', expression: '0.5x' },
    ]).state;
    const origin = state.projectiles[0]?.origin;
    state = stepSimulation(state, [
      { type: 'moveUnit', unitId: state.units[0]?.id ?? 'missing', cell: { col: 2, row: 1 } },
    ]).state;
    expect(state.projectiles[0]?.origin).toEqual(origin);
    const paused = stepSimulation(state, [{ type: 'pause' }]).state;
    const frozen = stepSimulation(paused);
    expect(frozen.state.tick).toBe(paused.tick);
    expect(frozen.state.projectiles[0]?.progressX).toBe(paused.projectiles[0]?.progressX);
  });

  it('replays the same seed and commands to the same state', () => {
    const makeRun = () => {
      let state = initialSimulation();
      state = stepSimulation(state, [
        { type: 'start' },
        { type: 'spawnEnemy', kind: 'raven', x: 7, lane: 3 },
      ]).state;
      return run(state, 20).state;
    };
    expect(makeRun()).toEqual(makeRun());
  });
});
