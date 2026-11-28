import { describe, expect, it } from 'vitest';

import { createSimulation, stepSimulation } from './simulation';

describe('authored wave scheduler', () => {
  it('spawns only due entries and marks completion after the final entry', () => {
    let state = createSimulation({
      board: { columns: 10, rows: 5, deploymentColumns: 3 },
      startingEnergy: 200,
      hearts: 3,
      seed: 21,
      waves: [
        { tick: 0, kind: 'fox', x: 8, lane: 2 },
        { tick: 2, kind: 'boar', x: 9, lane: 1 },
      ],
    });
    state = stepSimulation(state, [{ type: 'start' }]).state;
    expect(state.enemies).toHaveLength(1);
    expect(state.allWavesSpawned).toBe(false);
    state = stepSimulation(state).state;
    expect(state.enemies).toHaveLength(1);
    state = stepSimulation(state).state;
    expect(state.enemies).toHaveLength(2);
    expect(state.allWavesSpawned).toBe(true);
  });
});
