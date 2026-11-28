import type { BoardConfig, Cell } from '../board/board';
import type { FormulaRegistry } from '../math/quota';
import type { ValidatedFormula, Vec2 } from '../math/types';

export type UnitKind = 'snow' | 'frost' | 'heavy' | 'shield' | 'fire' | 'witch' | 'nest';
export type EnemyKind =
  'fox' | 'rabbit' | 'boar' | 'turtle' | 'raven' | 'wolf' | 'wallJumper' | 'iceGuard' | 'guardian';
export type SkillKind = 'slow' | 'freeze' | 'doubleDamage' | 'formulaReset';
export type PickupKind = 'energy' | 'skill';
export type SimulationMode = 'ready' | 'running' | 'paused' | 'won' | 'lost';
export type PhaseStatus = 'active' | 'clearing' | 'intermission' | 'complete';
export type ProjectileEffect = 'normal' | 'chill' | 'burn' | 'hex' | 'ward';
export type EnemyAbility = 'none' | 'wallJump' | 'iceShield';
export type AttackState =
  'UNCONFIGURED' | 'READY' | 'WINDUP' | 'COOLDOWN' | 'FORMULA_LOCKED' | 'DISABLED';

export interface AssignedFormula {
  readonly source: string;
  readonly canonicalKey: string;
  readonly assignedAtTick: number;
}

export interface FormulaOwnership {
  readonly canonicalKey: string;
  readonly unitId: string;
  readonly source: string;
}

export type SimulationCommand =
  | Readonly<{ type: 'start' }>
  | Readonly<{ type: 'pause' }>
  | Readonly<{ type: 'resume' }>
  | Readonly<{ type: 'placeUnit'; kind: UnitKind; cell: Cell }>
  | Readonly<{ type: 'selectUnit'; unitId: string | null }>
  | Readonly<{ type: 'moveUnit'; unitId: string; cell: Cell }>
  | Readonly<{ type: 'assignFormula'; unitId: string; expression: string }>
  | Readonly<{ type: 'fire'; unitId: string; expression: string }>
  | Readonly<{ type: 'rerollShop' }>
  | Readonly<{ type: 'spawnEnemy'; kind: EnemyKind; x: number; lane: number }>
  | Readonly<{ type: 'collectPickup'; pickupId: string }>
  | Readonly<{ type: 'useSkill'; skill: SkillKind; bucketId?: string }>;

export type CommandRejection =
  | 'INVALID_MODE'
  | 'OCCUPIED'
  | 'FORBIDDEN_CELL'
  | 'INSUFFICIENT_ENERGY'
  | 'NO_UNIT'
  | 'COOLDOWN'
  | 'NO_PATH'
  | 'INVALID_FORMULA'
  | 'PROJECTILE_CAPACITY'
  | 'NO_SHOT_UNIT'
  | 'NO_FORMULA'
  | 'FORMULA_CONFLICT'
  | 'QUOTA'
  | 'NO_ENEMY_CAPACITY'
  | 'PICKUP_NOT_FOUND'
  | 'PICKUP_NOT_READY'
  | 'PICKUP_EXPIRED'
  | 'INVENTORY_FULL'
  | 'NEST_STATIONARY'
  | 'SKILL_EMPTY'
  | 'SKILL_COOLDOWN'
  | 'SKILL_ALREADY_ACTIVE'
  | 'RELOCATION_COOLDOWN'
  | 'RESET_INVALID';

export interface UnitState {
  readonly id: string;
  readonly kind: UnitKind;
  readonly cell: Cell;
  readonly cooldownUntil: number;
  readonly nextAttackTick: number;
  readonly attackIntervalTicks: number;
  readonly attackState: AttackState;
  readonly assignedFormula: AssignedFormula | null;
  readonly relocationAvailableTick: number;
  readonly guardAvailableTick: number;
  readonly production: Readonly<{ nextEnergyTick: number; nextSkillTick: number }> | null;
}

export interface PickupState {
  readonly id: string;
  readonly kind: PickupKind;
  readonly skill: SkillKind | null;
  readonly ownerUnitId: string;
  readonly position: Vec2;
  readonly spawnTick: number;
  readonly collectibleTick: number;
  readonly expireTick: number;
}

export interface EconomyRules {
  readonly energyProductionTicks: number;
  readonly skillProductionTicks: number;
  readonly pickupReadyTicks: number;
  readonly pickupTtlTicks: number;
  readonly pickupCap: number;
  readonly energyPickupValue: number;
  readonly relocationCost: number;
  readonly relocationCooldownTicks: number;
  readonly rerollCost: number;
}

export interface WaveSpawn {
  readonly tick: number;
  readonly kind: EnemyKind;
  readonly x: number;
  readonly lane: number;
}

export interface WavePhase {
  readonly id: string;
  readonly title: string;
  readonly intro: string;
  readonly spawns: readonly WaveSpawn[];
  readonly intermissionTicks: number;
}

export interface EffectState {
  readonly slowUntil: number;
  readonly freezeUntil: number;
  readonly timeSkillCooldownUntil: number;
  readonly doubleDamageArmed: boolean;
}

export interface EnemyState {
  readonly id: string;
  readonly kind: EnemyKind;
  readonly position: Vec2;
  readonly previousPosition: Vec2;
  readonly lane: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly armor: number;
  readonly maxArmor: number;
  readonly shield: number;
  readonly maxShield: number;
  readonly facingX: -1 | 1;
  readonly freezeResistance: number;
  readonly ability: EnemyAbility;
  readonly phaseIndex: number;
  readonly jumpUntilTick: number;
  readonly jumpUsed: boolean;
  readonly status: Readonly<{
    readonly burnUntil: number;
    readonly burnDamage: number;
    readonly nextBurnTick: number;
    readonly chillUntil: number;
    readonly hexUntil: number;
  }>;
  readonly radius: number;
  readonly speed: number;
}

export interface ProjectileState {
  readonly id: string;
  readonly unitId: string;
  readonly origin: Vec2;
  readonly formula: ValidatedFormula;
  readonly path: readonly Vec2[];
  readonly horizontalSpeed: number;
  readonly damage: number;
  readonly effect: ProjectileEffect;
  readonly radius: number;
  readonly maxHits: number;
  readonly progressX: number;
  readonly previousProgressX: number;
  readonly hitEnemyIds: readonly string[];
}

export interface SimulationState {
  readonly tick: number;
  readonly mode: SimulationMode;
  readonly board: BoardConfig;
  readonly energy: number;
  readonly hearts: number;
  readonly units: readonly UnitState[];
  readonly enemies: readonly EnemyState[];
  readonly projectiles: readonly ProjectileState[];
  readonly pickups: readonly PickupState[];
  readonly skillStock: Readonly<Record<SkillKind, number>>;
  readonly economy: EconomyRules;
  readonly effects: EffectState;
  readonly wavePlan: readonly WaveSpawn[];
  readonly phasePlan: readonly WavePhase[];
  readonly nextWaveSpawnIndex: number;
  readonly activePhaseIndex: number;
  readonly phaseStatus: PhaseStatus;
  readonly phaseStartedTick: number;
  readonly phaseIntermissionUntil: number;
  readonly shopPool: readonly UnitKind[];
  readonly shopOffers: readonly UnitKind[];
  readonly shopRoll: number;
  readonly bossPhase: 0 | 1 | 2;
  readonly quotaActive: boolean;
  readonly formulaUseLimit: number;
  readonly previewAllowed: boolean;
  readonly formulaRegistry: FormulaRegistry;
  readonly formulaOwnership: readonly FormulaOwnership[];
  readonly selectedUnitId: string | null;
  readonly allWavesSpawned: boolean;
  readonly nextId: number;
  readonly seed: number;
}

export type SimulationEvent =
  | Readonly<{ type: 'unitPlaced'; unitId: string; kind: UnitKind; cell: Cell }>
  | Readonly<{ type: 'unitMoved'; unitId: string; cell: Cell }>
  | Readonly<{ type: 'formulaAssigned'; unitId: string; source: string; idempotent: boolean }>
  | Readonly<{ type: 'formulaConflict'; unitId: string; ownerUnitId: string; source: string }>
  | Readonly<{ type: 'shotFired'; projectileId: string; unitId: string; formulaKey: string }>
  | Readonly<{
      type: 'hit';
      projectileId: string;
      enemyId: string;
      damage: number;
      absorbed: number;
      blocked: boolean;
      armorRemaining: number;
      shieldRemaining: number;
    }>
  | Readonly<{ type: 'enemyDefeated'; enemyId: string }>
  | Readonly<{ type: 'enemyBurned'; enemyId: string; damage: number }>
  | Readonly<{ type: 'enemyWallJumped'; enemyId: string; lane: number }>
  | Readonly<{ type: 'enemyBlockedByShield'; enemyId: string; unitId: string }>
  | Readonly<{ type: 'enemyBreached'; enemyId: string; heartsRemaining: number }>
  | Readonly<{ type: 'enemySpawned'; enemyId: string }>
  | Readonly<{ type: 'phaseStarted'; phaseIndex: number; title: string; total: number }>
  | Readonly<{ type: 'phaseCleared'; phaseIndex: number }>
  | Readonly<{ type: 'shopRerolled'; offers: readonly UnitKind[] }>
  | Readonly<{ type: 'pickupProduced'; pickupId: string; kind: PickupKind }>
  | Readonly<{ type: 'pickupCollected'; pickupId: string; kind: PickupKind; credited: number }>
  | Readonly<{ type: 'pickupExpired'; pickupId: string }>
  | Readonly<{ type: 'skillActivated'; skill: SkillKind }>
  | Readonly<{ type: 'formulaReset'; bucketId: string }>
  | Readonly<{ type: 'bossPhaseChanged'; phase: 1 | 2 }>
  | Readonly<{ type: 'formulaLockActivated'; limit: number }>
  | Readonly<{ type: 'matchEnded'; result: 'won' | 'lost' }>
  | Readonly<{ type: 'commandRejected'; reason: CommandRejection }>;

export interface SimulationStepResult {
  readonly state: SimulationState;
  readonly events: readonly SimulationEvent[];
}
