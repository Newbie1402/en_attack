import { describe, expect, it } from 'vitest';

import { createSimulation, stepSimulation } from './simulation';

function nestSimulation(startingEnergy = 100) {
  return createSimulation({
    board: { columns: 10, rows: 5, deploymentColumns: 3 },
    startingEnergy,
    hearts: 3,
    seed: 7,
    allWavesSpawned: false,
    startingUnits: [{ kind: 'nest', cell: { col: 1, row: 2 } }],
    economy: {
      energyProductionTicks: 3,
      skillProductionTicks: 99,
      pickupReadyTicks: 2,
      pickupTtlTicks: 4,
    },
  });
}

function advance(state: ReturnType<typeof nestSimulation>, count: number) {
  let current = state;
  for (let index = 0; index < count; index += 1) current = stepSimulation(current).state;
  return current;
}

describe('nest economy and pickup lifecycle', () => {
  it('produces a non-collectable pickup, credits once after readiness, and rejects duplicate collection', () => {
    let state = nestSimulation();
    state = stepSimulation(state, [{ type: 'start' }]).state;
    state = advance(state, 2);
    const produced = stepSimulation(state);
    state = produced.state;
    const pickupId = produced.events.find((event) => event.type === 'pickupProduced')?.pickupId;
    expect(pickupId).toBeDefined();
    if (pickupId === undefined) return;

    const tooEarly = stepSimulation(state, [{ type: 'collectPickup', pickupId }]);
    expect(tooEarly.events.at(-1)).toMatchObject({
      type: 'commandRejected',
      reason: 'PICKUP_NOT_READY',
    });
    state = advance(tooEarly.state, 2);
    const collected = stepSimulation(state, [{ type: 'collectPickup', pickupId }]);
    expect(collected.state.energy).toBe(125);
    expect(collected.events).toContainEqual({
      type: 'pickupCollected',
      pickupId,
      kind: 'energy',
      credited: 25,
    });
    const duplicate = stepSimulation(collected.state, [{ type: 'collectPickup', pickupId }]);
    expect(duplicate.events.at(0)).toMatchObject({
      type: 'commandRejected',
      reason: 'PICKUP_NOT_FOUND',
    });
  });

  it('keeps a full energy pickup on the field and expires it at the domain deadline', () => {
    let state = nestSimulation(999);
    state = stepSimulation(state, [{ type: 'start' }]).state;
    state = advance(state, 2);
    const produced = stepSimulation(state);
    state = produced.state;
    const pickupId = produced.events.find((event) => event.type === 'pickupProduced')?.pickupId;
    expect(pickupId).toBeDefined();
    if (pickupId === undefined) return;
    state = advance(state, 1);
    const full = stepSimulation(state, [{ type: 'collectPickup', pickupId }]);
    expect(full.events.at(-1)).toMatchObject({ type: 'commandRejected', reason: 'INVENTORY_FULL' });
    expect(full.state.pickups).toHaveLength(1);
    state = advance(full.state, 4);
    const expired = stepSimulation(state, [{ type: 'collectPickup', pickupId }]);
    expect(expired.events).toContainEqual({ type: 'commandRejected', reason: 'PICKUP_NOT_FOUND' });
    expect(expired.state.pickups.some((pickup) => pickup.id === pickupId)).toBe(false);
  });

  it('freezes production while paused and keeps nests stationary', () => {
    let state = nestSimulation();
    const unitId = state.units[0]?.id ?? 'missing';
    state = stepSimulation(state, [{ type: 'start' }, { type: 'pause' }]).state;
    const paused = advance(state, 20);
    expect(paused.tick).toBe(state.tick);
    const moved = stepSimulation(paused, [{ type: 'moveUnit', unitId, cell: { col: 2, row: 2 } }]);
    expect(moved.events.at(0)).toMatchObject({
      type: 'commandRejected',
      reason: 'NEST_STATIONARY',
    });
  });
});
