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
  snow: { cost: 100, damage: 25, cooldownTicks: 108, horizontalSpeed: 6, radius: 0.12, maxHits: 2 },
  frost: {
    cost: 175,
    damage: 15,
    cooldownTicks: 132,
    horizontalSpeed: 5,
    radius: 0.15,
    maxHits: 1,
  },
  heavy: {
    cost: 250,
    damage: 65,
    cooldownTicks: 210,
    horizontalSpeed: 4,
    radius: 0.22,
    maxHits: 1,
  },
  nest: { cost: 50, damage: 0, cooldownTicks: 0, horizontalSpeed: 0, radius: 0, maxHits: 0 },
};

export interface EnemyBalance {
  readonly health: number;
  readonly armor: number;
  readonly shield: number;
  readonly speed: number;
  readonly radius: number;
  readonly freezeResistance: number;
}

export const enemyBalance: Readonly<Record<EnemyKind, EnemyBalance>> = {
  fox: { health: 100, armor: 0, shield: 0, speed: 0.28, radius: 0.27, freezeResistance: 0 },
  rabbit: { health: 55, armor: 0, shield: 0, speed: 0.52, radius: 0.23, freezeResistance: 0 },
  boar: { health: 180, armor: 0, shield: 0, speed: 0.18, radius: 0.34, freezeResistance: 0 },
  turtle: { health: 140, armor: 100, shield: 0, speed: 0.14, radius: 0.36, freezeResistance: 0 },
  raven: { health: 90, armor: 0, shield: 0, speed: 0.36, radius: 0.25, freezeResistance: 0 },
  wolf: { health: 160, armor: 0, shield: 0, speed: 0.24, radius: 0.3, freezeResistance: 0.7 },
  guardian: { health: 1500, armor: 0, shield: 0, speed: 0.065, radius: 0.48, freezeResistance: 0 },
};
