import { describe, expect, it } from 'vitest';

import { getLevelDefinition } from '../../../content/levels';
import { createSimulation, stepSimulation } from './simulation';

describe('simulation performance safety', () => {
  it('keeps a ten-minute simulated boss session within entity caps', () => {
    const config = getLevelDefinition('L6').config;
    let state = createSimulation(config);
    const startedAt = performance.now();
    let emittedEvents = 0;

    for (let tick = 0; tick < 36_000; tick += 1) {
      const commands =
        tick === 0
          ? [
              { type: 'start' as const },
              { type: 'placeUnit' as const, kind: 'snow' as const, cell: { col: 1, row: 0 } },
              { type: 'placeUnit' as const, kind: 'snow' as const, cell: { col: 1, row: 1 } },
              { type: 'placeUnit' as const, kind: 'snow' as const, cell: { col: 1, row: 3 } },
            ]
          : state.units.some((unit) => unit.assignedFormula === null)
            ? state.units
                .filter((unit) => unit.assignedFormula === null)
                .map((unit, index) => ({
                  type: 'assignFormula' as const,
                  unitId: unit.id,
                  expression: index === 0 ? '0' : `${index / 100}x`,
                }))
            : [];
      const result = stepSimulation(state, commands);
      state = result.state;
      emittedEvents += result.events.length;
    }

    const elapsedMs = performance.now() - startedAt;
    console.info(
      `simulation-profile ticks=36000 elapsedMs=${elapsedMs.toFixed(2)} events=${emittedEvents}`,
    );
    expect(state.enemies.length).toBeLessThanOrEqual(60);
    expect(state.projectiles.length).toBeLessThanOrEqual(64);
    expect(state.pickups.length).toBeLessThanOrEqual(12);
    expect(Number.isFinite(elapsedMs)).toBe(true);
  });
});
