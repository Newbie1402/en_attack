import type { EnemyKind, UnitKind } from './types';

export interface UnitBalance {
  readonly cost: number;
  readonly damage: number;
  readonly cooldownTicks: number;
  readonly horizontalSpeed: number;
  readonly radius: number;
  readonly maxHits: number;
}

export const unitBalance: Readonly<Record<UnitKind, UnitBalance>> = {
  snow: { cost: 100, damage: 60, cooldownTicks: 90, horizontalSpeed: 6, radius: 0.12, maxHits: 2 },
  frost: {
    cost: 175,
    damage: 40,
    cooldownTicks: 120,
    horizontalSpeed: 5,
    radius: 0.15,
    maxHits: 1,
  },
  heavy: {
    cost: 250,
    damage: 100,
    cooldownTicks: 210,
    horizontalSpeed: 4,
    radius: 0.22,
    maxHits: 1,
  },
  nest: { cost: 50, damage: 0, cooldownTicks: 0, horizontalSpeed: 0, radius: 0, maxHits: 0 },
};

export interface EnemyBalance {
  readonly health: number;
  readonly speed: number;
  readonly radius: number;
}

export const enemyBalance: Readonly<Record<EnemyKind, EnemyBalance>> = {
  fox: { health: 90, speed: 0.28, radius: 0.27 },
  boar: { health: 220, speed: 0.18, radius: 0.34 },
  raven: { health: 120, speed: 0.36, radius: 0.25 },
  guardian: { health: 1000, speed: 0.065, radius: 0.48 },
};
