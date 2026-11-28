import { cellCenter, isDeployable, sameCell } from '../board/board';
import {
  behaviorallyEquivalent,
  createFormulaRegistry,
  recordFormulaUse,
  registerFormula,
  resetFormulaBucket,
} from '../math/quota';
import { sampleTrajectory, trajectoryPointAt } from '../math/sampler';
import { validateFormula } from '../math/engine';
import type { ValidatedFormula, Vec2 } from '../math/types';
import type { Cell, Obstacle } from '../board/board';
import { enemyBalance, unitBalance } from './balance';
import type {
  CommandRejection,
  AssignedFormula,
  EnemyKind,
  EnemyState,
  EffectState,
  EconomyRules,
  PickupState,
  ProjectileState,
  SimulationCommand,
  SimulationEvent,
  SimulationState,
  SimulationStepResult,
  UnitKind,
  UnitState,
  SkillKind,
  WavePhase,
  WaveSpawn,
  FormulaOwnership,
} from './types';

const FIXED_DT = 1 / 60;
const MAX_PROJECTILES = 64;
const MAX_ENEMIES = 60;
const ENERGY_CAP = 999;
const DEFAULT_ECONOMY: EconomyRules = {
  energyProductionTicks: 8 * 60,
  skillProductionTicks: 18 * 60,
  pickupReadyTicks: Math.round(0.6 * 60),
  pickupTtlTicks: 12 * 60,
  pickupCap: 12,
  energyPickupValue: 25,
  relocationCost: 20,
  relocationCooldownTicks: 3 * 60,
  rerollCost: 25,
};
const SKILL_STOCK_CAP = 3;
const SLOW_DURATION_TICKS = 8 * 60;
const FREEZE_DURATION_TICKS = 4 * 60;
const TIME_SKILL_COOLDOWN_TICKS = 2 * 60;

export interface SimulationConfig {
  readonly board: Readonly<{
    columns: number;
    rows: number;
    deploymentColumns: number;
    obstacles?: readonly Obstacle[];
  }>;
  readonly startingEnergy: number;
  readonly hearts: number;
  readonly seed: number;
  readonly startingUnits?: readonly Readonly<{ kind: UnitKind; cell: Cell }>[];
  readonly formulaUseLimit?: number;
  readonly allWavesSpawned?: boolean;
  readonly economy?: Partial<EconomyRules>;
  readonly startingSkills?: Partial<Record<SkillKind, number>>;
  readonly waves?: readonly WaveSpawn[];
  readonly phases?: readonly WavePhase[];
  readonly shopOffers?: readonly UnitKind[];
  readonly shopPool?: readonly UnitKind[];
  readonly quotaActive?: boolean;
  readonly previewAllowed?: boolean;
}

function boardFromConfig(config: SimulationConfig) {
  return {
    columns: config.board.columns,
    rows: config.board.rows,
    deploymentColumns: config.board.deploymentColumns,
    obstacles: config.board.obstacles ?? [],
  };
}

function economyFromConfig(config: SimulationConfig): EconomyRules {
  return { ...DEFAULT_ECONOMY, ...config.economy };
}

function createId(prefix: string, nextId: number): string {
  return `${prefix}-${nextId}`;
}

function nextId(state: SimulationState): Readonly<{ id: string; next: number }> {
  return { id: createId('entity', state.nextId), next: state.nextId + 1 };
}

function attackStateFor(
  unit: Readonly<Pick<UnitState, 'kind' | 'assignedFormula' | 'cooldownUntil'>>,
  tick: number,
): UnitState['attackState'] {
  if (unit.kind === 'nest') return 'DISABLED';
  if (unit.assignedFormula === null) return 'UNCONFIGURED';
  return unit.cooldownUntil > tick ? 'COOLDOWN' : 'READY';
}

function assignedFormula(source: string, canonicalKey: string, tick: number): AssignedFormula {
  return { source, canonicalKey, assignedAtTick: tick };
}

function formulaOwnersFor(units: readonly UnitState[]): readonly FormulaOwnership[] {
  return units.flatMap((unit) =>
    unit.assignedFormula === null
      ? []
      : [
          {
            canonicalKey: unit.assignedFormula.canonicalKey,
            unitId: unit.id,
            source: unit.assignedFormula.source,
          },
        ],
  );
}

function enemyAbility(kind: EnemyKind): EnemyState['ability'] {
  if (kind === 'wallJumper') return 'wallJump';
  if (kind === 'iceGuard') return 'iceShield';
  return 'none';
}

function createEnemy(
  kind: EnemyKind,
  id: string,
  position: Vec2,
  lane: number,
  phaseIndex: number,
): EnemyState {
  const balance = enemyBalance[kind];
  return {
    id,
    kind,
    position,
    previousPosition: position,
    lane,
    health: balance.health,
    maxHealth: balance.health,
    armor: balance.armor,
    maxArmor: balance.armor,
    shield: balance.shield,
    maxShield: balance.shield,
    facingX: -1,
    freezeResistance: balance.freezeResistance,
    ability: enemyAbility(kind),
    phaseIndex,
    jumpUntilTick: 0,
    jumpUsed: false,
    status: {
      burnUntil: 0,
      burnDamage: 0,
      nextBurnTick: 0,
      chillUntil: 0,
      hexUntil: 0,
    },
    radius: balance.radius,
    speed: balance.speed,
  };
}

const DEFAULT_SHOP_POOL: readonly UnitKind[] = [
  'snow',
  'frost',
  'heavy',
  'shield',
  'fire',
  'witch',
  'nest',
];

function normalizeShopOffers(
  offers: readonly UnitKind[] | undefined,
  pool: readonly UnitKind[] | undefined,
): readonly UnitKind[] {
  const source = offers ?? ['snow', 'frost', 'heavy', 'nest'];
  const allowed = pool ?? DEFAULT_SHOP_POOL;
  const filtered = source.filter(
    (kind, index) => allowed.includes(kind) && source.indexOf(kind) === index,
  );
  return filtered.length > 0 ? filtered : ['snow', 'frost', 'heavy'];
}

function phasePlanFromConfig(config: SimulationConfig): readonly WavePhase[] {
  if (config.phases !== undefined && config.phases.length > 0) return config.phases;
  return [
    {
      id: 'phase-1',
      title: 'Làn mở màn',
      intro: 'Những bước chân đầu tiên đang tiến vào vườn.',
      spawns: config.waves ?? [],
      intermissionTicks: 0,
    },
  ];
}

export function createSimulation(config: SimulationConfig): SimulationState {
  const board = boardFromConfig(config);
  const economy = economyFromConfig(config);
  const skillStock: Record<SkillKind, number> = {
    slow: Math.min(config.startingSkills?.slow ?? 0, SKILL_STOCK_CAP),
    freeze: Math.min(config.startingSkills?.freeze ?? 0, SKILL_STOCK_CAP),
    doubleDamage: Math.min(config.startingSkills?.doubleDamage ?? 0, SKILL_STOCK_CAP),
    formulaReset: Math.min(config.startingSkills?.formulaReset ?? 0, 2),
  };
  let next = 1;
  const units = (config.startingUnits ?? []).map((startingUnit) => {
    const unit: UnitState = {
      id: createId('unit', next),
      kind: startingUnit.kind,
      cell: { ...startingUnit.cell },
      cooldownUntil: 0,
      nextAttackTick: 0,
      attackIntervalTicks: unitBalance[startingUnit.kind].cooldownTicks,
      attackState: startingUnit.kind === 'nest' ? 'DISABLED' : 'UNCONFIGURED',
      assignedFormula: null,
      relocationAvailableTick: 0,
      guardAvailableTick: 0,
      production:
        startingUnit.kind === 'nest'
          ? {
              nextEnergyTick: economy.energyProductionTicks,
              nextSkillTick: economy.skillProductionTicks,
            }
          : null,
    };
    next += 1;
    return unit;
  });
  const phasePlan = phasePlanFromConfig(config);
  const shopPool = config.shopPool ?? DEFAULT_SHOP_POOL;
  const shopOffers = normalizeShopOffers(config.shopOffers, shopPool);
  return {
    tick: 0,
    mode: 'ready',
    board,
    energy: Math.min(Math.max(0, Math.floor(config.startingEnergy)), ENERGY_CAP),
    hearts: Math.max(0, Math.floor(config.hearts)),
    units,
    enemies: [],
    projectiles: [],
    pickups: [],
    skillStock,
    economy,
    effects: {
      slowUntil: 0,
      freezeUntil: 0,
      timeSkillCooldownUntil: 0,
      doubleDamageArmed: false,
    },
    wavePlan: phasePlan.flatMap((phase) => phase.spawns),
    phasePlan,
    nextWaveSpawnIndex: 0,
    activePhaseIndex: 0,
    phaseStatus: config.allWavesSpawned ? 'complete' : 'active',
    phaseStartedTick: 0,
    phaseIntermissionUntil: 0,
    shopPool,
    shopOffers,
    shopRoll: 0,
    bossPhase: 0,
    quotaActive: config.quotaActive ?? false,
    formulaUseLimit: config.formulaUseLimit ?? Number.POSITIVE_INFINITY,
    previewAllowed: config.previewAllowed ?? true,
    formulaRegistry: createFormulaRegistry(),
    formulaOwnership: formulaOwnersFor(units),
    selectedUnitId: units[0]?.id ?? null,
    allWavesSpawned: config.allWavesSpawned ?? false,
    nextId: next,
    seed: config.seed,
  };
}

function advanceWaves(
  state: SimulationState,
): Readonly<{ state: SimulationState; events: readonly SimulationEvent[] }> {
  if (
    state.phasePlan.length === 0 ||
    (state.wavePlan.length === 0 && !state.allWavesSpawned) ||
    state.phaseStatus === 'complete'
  ) {
    return { state, events: [] };
  }
  let nextIndex = state.nextWaveSpawnIndex;
  let nextIdValue = state.nextId;
  let enemies = state.enemies;
  let activePhaseIndex = state.activePhaseIndex;
  let phaseStatus = state.phaseStatus;
  let phaseStartedTick = state.phaseStartedTick;
  let phaseIntermissionUntil = state.phaseIntermissionUntil;
  const events: SimulationEvent[] = [];
  if (phaseStatus === 'intermission' && state.tick >= phaseIntermissionUntil) {
    activePhaseIndex += 1;
    phaseStatus = 'active';
    phaseStartedTick = state.tick;
    phaseIntermissionUntil = 0;
    const phase = state.phasePlan[activePhaseIndex];
    if (phase !== undefined) {
      events.push({
        type: 'phaseStarted',
        phaseIndex: activePhaseIndex,
        title: phase.title,
        total: state.phasePlan.length,
      });
    }
  }
  const phase = state.phasePlan[activePhaseIndex];
  let phaseSpawnIndex =
    nextIndex -
    state.phasePlan
      .slice(0, activePhaseIndex)
      .reduce((total, current) => total + current.spawns.length, 0);
  if (phase !== undefined && phaseStatus === 'active') {
    const elapsed = state.tick - phaseStartedTick;
    while (phaseSpawnIndex < phase.spawns.length && enemies.length < MAX_ENEMIES) {
      const spawn = phase.spawns[phaseSpawnIndex];
      if (spawn === undefined || spawn.tick > elapsed) break;
      const position = { x: spawn.x, y: spawn.lane + 0.5 };
      const enemy = createEnemy(
        spawn.kind,
        createId('enemy', nextIdValue),
        position,
        spawn.lane,
        activePhaseIndex,
      );
      nextIdValue += 1;
      enemies = [...enemies, enemy];
      phaseSpawnIndex += 1;
      nextIndex += 1;
      events.push({ type: 'enemySpawned', enemyId: enemy.id });
    }
    if (phaseSpawnIndex >= phase.spawns.length) {
      phaseStatus = 'clearing';
    }
  }
  const finalPhaseSpawned =
    activePhaseIndex >= state.phasePlan.length - 1 && phaseStatus === 'clearing';
  return {
    state: {
      ...state,
      enemies,
      nextId: nextIdValue,
      nextWaveSpawnIndex: nextIndex,
      activePhaseIndex,
      phaseStatus,
      phaseStartedTick,
      phaseIntermissionUntil,
      allWavesSpawned: state.allWavesSpawned || finalPhaseSpawned,
    },
    events,
  };
}

function rejection(reason: CommandRejection): SimulationEvent {
  return { type: 'commandRejected', reason };
}

function applyRerollShop(
  state: SimulationState,
): Readonly<{ state: SimulationState; event: SimulationEvent }> {
  if (state.mode !== 'ready' && state.mode !== 'running') {
    return { state, event: rejection('INVALID_MODE') };
  }
  if (state.energy < state.economy.rerollCost) {
    return { state, event: rejection('INSUFFICIENT_ENERGY') };
  }
  const nextRoll = state.shopRoll + 1;
  const pool = state.shopPool.length > 0 ? state.shopPool : DEFAULT_SHOP_POOL;
  const offers = Array.from(
    { length: Math.min(4, pool.length) },
    (_, index) => pool[(nextRoll * 2 + index) % pool.length],
  ).filter((kind): kind is UnitKind => kind !== undefined);
  return {
    state: {
      ...state,
      energy: state.energy - state.economy.rerollCost,
      shopOffers: offers,
      shopRoll: nextRoll,
    },
    event: { type: 'shopRerolled', offers },
  };
}

function unitAtCell(state: SimulationState, cell: Cell): UnitState | undefined {
  return state.units.find((unit) => sameCell(unit.cell, cell));
}

function applyPlaceUnit(
  state: SimulationState,
  command: Extract<SimulationCommand, { type: 'placeUnit' }>,
): Readonly<{ state: SimulationState; event: SimulationEvent }> {
  const balance = unitBalance[command.kind];
  if (state.mode !== 'ready' && state.mode !== 'running')
    return { state, event: rejection('INVALID_MODE') };
  if (
    !isDeployable(command.cell, state.board) ||
    state.board.obstacles.some((obstacle) => obstacleAtCell(obstacle, command.cell))
  ) {
    return { state, event: rejection('FORBIDDEN_CELL') };
  }
  if (unitAtCell(state, command.cell) !== undefined) return { state, event: rejection('OCCUPIED') };
  if (state.energy < balance.cost) return { state, event: rejection('INSUFFICIENT_ENERGY') };
  const generated = nextId(state);
  const unit: UnitState = {
    id: generated.id,
    kind: command.kind,
    cell: { ...command.cell },
    cooldownUntil: state.tick,
    nextAttackTick: state.tick,
    attackIntervalTicks: balance.cooldownTicks,
    attackState: command.kind === 'nest' ? 'DISABLED' : 'UNCONFIGURED',
    assignedFormula: null,
    relocationAvailableTick: state.tick,
    guardAvailableTick: state.tick,
    production:
      command.kind === 'nest'
        ? {
            nextEnergyTick: state.tick + state.economy.energyProductionTicks,
            nextSkillTick: state.tick + state.economy.skillProductionTicks,
          }
        : null,
  };
  return {
    state: {
      ...state,
      energy: state.energy - balance.cost,
      units: [...state.units, unit],
      formulaOwnership: formulaOwnersFor([...state.units, unit]),
      nextId: generated.next,
    },
    event: { type: 'unitPlaced', unitId: unit.id, kind: unit.kind, cell: unit.cell },
  };
}

function applyMoveUnit(
  state: SimulationState,
  command: Extract<SimulationCommand, { type: 'moveUnit' }>,
): Readonly<{ state: SimulationState; event: SimulationEvent }> {
  const unit = state.units.find((current) => current.id === command.unitId);
  if (unit === undefined) return { state, event: rejection('NO_UNIT') };
  if (unit.kind === 'nest') return { state, event: rejection('NEST_STATIONARY') };
  if (state.mode !== 'ready' && state.mode !== 'running')
    return { state, event: rejection('INVALID_MODE') };
  if (state.tick < unit.relocationAvailableTick) {
    return { state, event: rejection('RELOCATION_COOLDOWN') };
  }
  if (state.energy < state.economy.relocationCost) {
    return { state, event: rejection('INSUFFICIENT_ENERGY') };
  }
  if (unitAtCell(state, command.cell) !== undefined || !isDeployable(command.cell, state.board)) {
    return { state, event: rejection('FORBIDDEN_CELL') };
  }
  const units = state.units.map((current) =>
    current.id === unit.id
      ? {
          ...current,
          cell: { ...command.cell },
          relocationAvailableTick: state.tick + state.economy.relocationCooldownTicks,
        }
      : current,
  );
  return {
    state: { ...state, energy: state.energy - state.economy.relocationCost, units },
    event: { type: 'unitMoved', unitId: unit.id, cell: { ...command.cell } },
  };
}

function applyAssignFormula(
  state: SimulationState,
  command: Extract<SimulationCommand, { type: 'assignFormula' }>,
): Readonly<{ state: SimulationState; event: SimulationEvent }> {
  if (state.mode !== 'ready' && state.mode !== 'running' && state.mode !== 'paused') {
    return { state, event: rejection('INVALID_MODE') };
  }
  const unit = state.units.find((current) => current.id === command.unitId);
  if (unit === undefined) return { state, event: rejection('NO_UNIT') };
  if (unit.kind === 'nest') return { state, event: rejection('NO_SHOT_UNIT') };
  const result = validateFormula(command.expression);
  if (!result.ok) return { state, event: rejection('INVALID_FORMULA') };

  for (const other of state.units) {
    if (other.id === unit.id || other.assignedFormula === null) continue;
    const otherResult = validateFormula(other.assignedFormula.source);
    if (
      otherResult.ok &&
      behaviorallyEquivalent(result.formula, otherResult.formula, {
        maxU: state.board.columns,
        seed: state.seed,
      })
    ) {
      return {
        state,
        event: {
          type: 'formulaConflict',
          unitId: unit.id,
          ownerUnitId: other.id,
          source: result.formula.source,
        },
      };
    }
  }

  if (
    unit.assignedFormula?.source === result.formula.source &&
    unit.assignedFormula.canonicalKey === result.formula.canonicalKey
  ) {
    return {
      state,
      event: {
        type: 'formulaAssigned',
        unitId: unit.id,
        source: result.formula.source,
        idempotent: true,
      },
    };
  }

  const nextAssignedFormula = assignedFormula(
    result.formula.source,
    result.formula.canonicalKey,
    state.tick,
  );
  const units = state.units.map((current) =>
    current.id === unit.id
      ? {
          ...current,
          assignedFormula: nextAssignedFormula,
          attackState: attackStateFor(
            { ...current, assignedFormula: nextAssignedFormula },
            state.tick,
          ),
        }
      : current,
  );
  return {
    state: { ...state, units, formulaOwnership: formulaOwnersFor(units) },
    event: {
      type: 'formulaAssigned',
      unitId: unit.id,
      source: result.formula.source,
      idempotent: false,
    },
  };
}

function applyFire(
  state: SimulationState,
  command: Extract<SimulationCommand, { type: 'fire' }>,
  formulaUseLimit: number,
): Readonly<{ state: SimulationState; events: readonly SimulationEvent[] }> {
  if (state.mode !== 'running') return { state, events: [rejection('INVALID_MODE')] };
  const unit = state.units.find((current) => current.id === command.unitId);
  if (unit === undefined) return { state, events: [rejection('NO_UNIT')] };
  const assignment =
    unit.assignedFormula?.source === command.expression
      ? { state, event: null }
      : applyAssignFormula(state, {
          type: 'assignFormula',
          unitId: command.unitId,
          expression: command.expression,
        });
  if (
    assignment.event?.type === 'commandRejected' ||
    assignment.event?.type === 'formulaConflict'
  ) {
    return { state: assignment.state, events: [assignment.event] };
  }
  const assignedState = assignment.state;
  const assignedUnit = assignedState.units.find((current) => current.id === command.unitId);
  if (assignedUnit === undefined || assignedUnit.assignedFormula === null) {
    return { state: assignedState, events: [rejection('NO_FORMULA')] };
  }
  if (assignedUnit.cooldownUntil > assignedState.tick) {
    return { state: assignedState, events: [rejection('COOLDOWN')] };
  }
  if (assignedState.projectiles.length >= MAX_PROJECTILES) {
    return { state: assignedState, events: [rejection('PROJECTILE_CAPACITY')] };
  }
  const formulaResult = validateFormula(assignedUnit.assignedFormula.source);
  if (!formulaResult.ok) return { state: assignedState, events: [rejection('INVALID_FORMULA')] };
  return emitShot(
    assignedState,
    assignedUnit,
    formulaResult.formula,
    formulaUseLimit,
    assignment.event,
  );
}

function emitShot(
  state: SimulationState,
  unit: UnitState,
  formula: ValidatedFormula,
  formulaUseLimit: number,
  assignmentEvent: SimulationEvent | null = null,
): Readonly<{ state: SimulationState; events: readonly SimulationEvent[] }> {
  const registryResult = registerFormula(state.formulaRegistry, formula, {
    maxU: state.board.columns,
    seed: state.seed,
  });
  if (!registryResult.ok) return { state, events: [rejection('INVALID_FORMULA')] };
  if (registryResult.bucket.uses >= formulaUseLimit) {
    return { state, events: [rejection('QUOTA')] };
  }
  const origin = cellCenter(unit.cell);
  const localPath = sampleTrajectory(formula.expression, {
    maxU: state.board.columns - origin.x,
    minV: -origin.y,
    maxV: state.board.rows - origin.y,
  });
  if (localPath.points.length < 2) return { state, events: [rejection('NO_PATH')] };
  const useResult = recordFormulaUse(registryResult.registry, registryResult.bucket.id);
  if (!useResult.ok) return { state, events: [rejection('INVALID_FORMULA')] };
  const generated = nextId(state);
  const balance = unitBalance[unit.kind];
  const damage = state.effects.doubleDamageArmed ? balance.damage * 2 : balance.damage;
  const projectile: ProjectileState = {
    id: generated.id,
    unitId: unit.id,
    origin,
    formula,
    path: localPath.points,
    horizontalSpeed: balance.horizontalSpeed,
    damage,
    effect: balance.projectileEffect,
    radius: balance.radius,
    maxHits: balance.maxHits,
    progressX: 0,
    previousProgressX: 0,
    hitEnemyIds: [],
  };
  const units = state.units.map((current) =>
    current.id === unit.id
      ? {
          ...current,
          cooldownUntil: state.tick + balance.cooldownTicks,
          nextAttackTick: state.tick + balance.cooldownTicks,
          attackState: 'COOLDOWN' as const,
        }
      : current,
  );
  return {
    state: {
      ...state,
      units,
      projectiles: [...state.projectiles, projectile],
      formulaRegistry: useResult.registry,
      effects: state.effects.doubleDamageArmed
        ? { ...state.effects, doubleDamageArmed: false }
        : state.effects,
      nextId: generated.next,
    },
    events: [
      ...(assignmentEvent === null ? [] : [assignmentEvent]),
      {
        type: 'shotFired',
        projectileId: projectile.id,
        unitId: unit.id,
        formulaKey: formula.canonicalKey,
      },
    ],
  };
}

function applySpawnEnemy(
  state: SimulationState,
  command: Extract<SimulationCommand, { type: 'spawnEnemy' }>,
): Readonly<{ state: SimulationState; event: SimulationEvent }> {
  if (state.enemies.length >= MAX_ENEMIES) return { state, event: rejection('NO_ENEMY_CAPACITY') };
  const generated = nextId(state);
  const position = { x: command.x, y: command.lane + 0.5 };
  const enemy = createEnemy(
    command.kind,
    generated.id,
    position,
    command.lane,
    state.activePhaseIndex,
  );
  return {
    state: { ...state, enemies: [...state.enemies, enemy], nextId: generated.next },
    event: { type: 'enemySpawned', enemyId: enemy.id },
  };
}

function pickupPosition(state: SimulationState, unit: UnitState): Vec2 {
  const center = cellCenter(unit.cell);
  const offsets: readonly Vec2[] = [
    { x: 0.18, y: 0.08 },
    { x: -0.18, y: 0.08 },
    { x: 0.08, y: -0.16 },
    { x: 0.08, y: 0.18 },
  ];
  for (const offset of offsets) {
    const position = { x: center.x + offset.x, y: center.y + offset.y };
    if (
      position.x >= 0 &&
      position.x <= state.board.columns &&
      position.y >= 0 &&
      position.y <= state.board.rows &&
      !state.board.obstacles.some(
        (obstacle) =>
          position.x >= obstacle.minX &&
          position.x <= obstacle.maxX &&
          position.y >= obstacle.minY &&
          position.y <= obstacle.maxY,
      )
    ) {
      return position;
    }
  }
  return center;
}

function advanceProduction(
  state: SimulationState,
): Readonly<{ state: SimulationState; events: readonly SimulationEvent[] }> {
  let pickups = state.pickups;
  let nextIdValue = state.nextId;
  const events: SimulationEvent[] = [];
  const remainingPickups = pickups.filter((pickup) => {
    if (pickup.expireTick > state.tick) return true;
    events.push({ type: 'pickupExpired', pickupId: pickup.id });
    return false;
  });
  pickups = remainingPickups;
  const units = state.units.map((unit) => {
    if (unit.kind !== 'nest' || unit.production === null) return unit;
    let production = unit.production;
    const maybeProduce = (kind: 'energy' | 'skill'): void => {
      if (pickups.length >= state.economy.pickupCap) {
        production = {
          ...production,
          ...(kind === 'energy'
            ? { nextEnergyTick: state.tick + 1 }
            : { nextSkillTick: state.tick + 1 }),
        };
        return;
      }
      if (
        kind === 'skill' &&
        pickups.some((pickup) => pickup.ownerUnitId === unit.id && pickup.kind === 'skill')
      ) {
        production = { ...production, nextSkillTick: state.tick + 1 };
        return;
      }
      const pickup: PickupState = {
        id: createId('pickup', nextIdValue),
        kind,
        skill: kind === 'skill' ? 'slow' : null,
        ownerUnitId: unit.id,
        position: pickupPosition(state, unit),
        spawnTick: state.tick,
        collectibleTick: state.tick + state.economy.pickupReadyTicks,
        expireTick: state.tick + state.economy.pickupReadyTicks + state.economy.pickupTtlTicks,
      };
      nextIdValue += 1;
      pickups = [...pickups, pickup];
      events.push({ type: 'pickupProduced', pickupId: pickup.id, kind: pickup.kind });
      production = {
        ...production,
        ...(kind === 'energy'
          ? { nextEnergyTick: state.tick + state.economy.energyProductionTicks }
          : { nextSkillTick: state.tick + state.economy.skillProductionTicks }),
      };
    };
    if (state.tick >= production.nextEnergyTick) maybeProduce('energy');
    if (state.tick >= production.nextSkillTick) maybeProduce('skill');
    return { ...unit, production };
  });
  return { state: { ...state, units, pickups, nextId: nextIdValue }, events };
}

function applyCollectPickup(
  state: SimulationState,
  command: Extract<SimulationCommand, { type: 'collectPickup' }>,
): Readonly<{ state: SimulationState; event: SimulationEvent }> {
  if (state.mode !== 'running') return { state, event: rejection('INVALID_MODE') };
  const pickup = state.pickups.find((current) => current.id === command.pickupId);
  if (pickup === undefined) return { state, event: rejection('PICKUP_NOT_FOUND') };
  if (state.tick < pickup.collectibleTick) return { state, event: rejection('PICKUP_NOT_READY') };
  if (state.tick >= pickup.expireTick) return { state, event: rejection('PICKUP_EXPIRED') };
  if (pickup.kind === 'energy') {
    const credited = Math.min(state.economy.energyPickupValue, ENERGY_CAP - state.energy);
    if (credited <= 0) return { state, event: rejection('INVENTORY_FULL') };
    return {
      state: {
        ...state,
        energy: state.energy + credited,
        pickups: state.pickups.filter((current) => current.id !== pickup.id),
      },
      event: { type: 'pickupCollected', pickupId: pickup.id, kind: pickup.kind, credited },
    };
  }
  if (pickup.skill === null || state.skillStock[pickup.skill] >= SKILL_STOCK_CAP) {
    return { state, event: rejection('INVENTORY_FULL') };
  }
  const skill = pickup.skill;
  const skillStock = { ...state.skillStock, [skill]: state.skillStock[skill] + 1 };
  return {
    state: {
      ...state,
      skillStock,
      pickups: state.pickups.filter((current) => current.id !== pickup.id),
    },
    event: { type: 'pickupCollected', pickupId: pickup.id, kind: pickup.kind, credited: 1 },
  };
}

function decrementSkillStock(
  stock: Readonly<Record<SkillKind, number>>,
  skill: SkillKind,
): Readonly<Record<SkillKind, number>> {
  return { ...stock, [skill]: Math.max(0, stock[skill] - 1) };
}

function applyUseSkill(
  state: SimulationState,
  command: Extract<SimulationCommand, { type: 'useSkill' }>,
): Readonly<{ state: SimulationState; event: SimulationEvent }> {
  if (state.mode !== 'running') return { state, event: rejection('INVALID_MODE') };
  if (state.skillStock[command.skill] <= 0) return { state, event: rejection('SKILL_EMPTY') };
  if (
    (command.skill === 'slow' || command.skill === 'freeze') &&
    state.effects.timeSkillCooldownUntil > state.tick
  ) {
    return { state, event: rejection('SKILL_COOLDOWN') };
  }
  if (command.skill === 'doubleDamage' && state.effects.doubleDamageArmed) {
    return { state, event: rejection('SKILL_ALREADY_ACTIVE') };
  }
  if (command.skill === 'formulaReset') {
    if (command.bucketId === undefined) return { state, event: rejection('RESET_INVALID') };
    const reset = resetFormulaBucket(state.formulaRegistry, command.bucketId);
    if (!reset.ok) return { state, event: rejection('RESET_INVALID') };
    const resetUnits = state.units.map((unit) =>
      unit.assignedFormula?.canonicalKey === reset.bucket.representative.canonicalKey
        ? { ...unit, attackState: attackStateFor(unit, state.tick) }
        : unit,
    );
    return {
      state: {
        ...state,
        formulaRegistry: reset.registry,
        units: resetUnits,
        skillStock: decrementSkillStock(state.skillStock, command.skill),
      },
      event: { type: 'formulaReset', bucketId: command.bucketId },
    };
  }
  const effects: EffectState =
    command.skill === 'slow'
      ? {
          ...state.effects,
          slowUntil: Math.max(state.effects.slowUntil, state.tick) + SLOW_DURATION_TICKS,
          timeSkillCooldownUntil: state.tick + TIME_SKILL_COOLDOWN_TICKS,
        }
      : command.skill === 'freeze'
        ? {
            ...state.effects,
            freezeUntil: Math.max(state.effects.freezeUntil, state.tick) + FREEZE_DURATION_TICKS,
            timeSkillCooldownUntil: state.tick + TIME_SKILL_COOLDOWN_TICKS,
          }
        : { ...state.effects, doubleDamageArmed: true };
  return {
    state: { ...state, effects, skillStock: decrementSkillStock(state.skillStock, command.skill) },
    event: { type: 'skillActivated', skill: command.skill },
  };
}

function scheduleAutomaticAttacks(
  state: SimulationState,
): Readonly<{ state: SimulationState; events: readonly SimulationEvent[] }> {
  if (state.enemies.length === 0) return { state, events: [] };
  let current = state;
  const events: SimulationEvent[] = [];
  const formulaUseLimit = current.quotaActive ? current.formulaUseLimit : Number.POSITIVE_INFINITY;
  for (const candidate of state.units) {
    const unit = current.units.find((item) => item.id === candidate.id);
    if (
      unit === undefined ||
      unit.kind === 'nest' ||
      unit.assignedFormula === null ||
      unit.attackState === 'FORMULA_LOCKED' ||
      unit.cooldownUntil > current.tick
    ) {
      continue;
    }
    const formulaResult = validateFormula(unit.assignedFormula.source);
    if (!formulaResult.ok) continue;
    const result = emitShot(current, unit, formulaResult.formula, formulaUseLimit);
    const rejectionEvent = result.events.find((event) => event.type === 'commandRejected');
    if (rejectionEvent?.type === 'commandRejected' && rejectionEvent.reason === 'QUOTA') {
      current = {
        ...current,
        units: current.units.map((item) =>
          item.id === unit.id ? { ...item, attackState: 'FORMULA_LOCKED' } : item,
        ),
      };
      events.push(rejectionEvent);
      continue;
    }
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

function applyCommand(
  state: SimulationState,
  command: SimulationCommand,
  formulaUseLimit: number,
): Readonly<{ state: SimulationState; events: readonly SimulationEvent[] }> {
  switch (command.type) {
    case 'start':
      return state.mode === 'ready'
        ? { state: { ...state, mode: 'running' }, events: [] }
        : { state, events: [rejection('INVALID_MODE')] };
    case 'pause':
      return state.mode === 'running'
        ? { state: { ...state, mode: 'paused' }, events: [] }
        : { state, events: [rejection('INVALID_MODE')] };
    case 'resume':
      return state.mode === 'paused'
        ? { state: { ...state, mode: 'running' }, events: [] }
        : { state, events: [rejection('INVALID_MODE')] };
    case 'placeUnit': {
      const result = applyPlaceUnit(state, command);
      return { state: result.state, events: [result.event] };
    }
    case 'selectUnit':
      return { state: { ...state, selectedUnitId: command.unitId }, events: [] };
    case 'moveUnit': {
      const result = applyMoveUnit(state, command);
      return { state: result.state, events: [result.event] };
    }
    case 'assignFormula': {
      const result = applyAssignFormula(state, command);
      return { state: result.state, events: [result.event] };
    }
    case 'fire': {
      const result = applyFire(state, command, formulaUseLimit);
      return { state: result.state, events: result.events };
    }
    case 'rerollShop': {
      const result = applyRerollShop(state);
      return { state: result.state, events: [result.event] };
    }
    case 'spawnEnemy': {
      const result = applySpawnEnemy(state, command);
      return { state: result.state, events: [result.event] };
    }
    case 'collectPickup': {
      const result = applyCollectPickup(state, command);
      return { state: result.state, events: [result.event] };
    }
    case 'useSkill': {
      const result = applyUseSkill(state, command);
      return { state: result.state, events: [result.event] };
    }
  }
}

function obstacleAtCell(obstacle: Obstacle, cell: Cell): boolean {
  const center = cellCenter(cell);
  return (
    center.x > obstacle.minX &&
    center.x < obstacle.maxX &&
    center.y > obstacle.minY &&
    center.y < obstacle.maxY
  );
}

function interpolate(left: Vec2, right: Vec2, ratio: number): Vec2 {
  return { x: left.x + (right.x - left.x) * ratio, y: left.y + (right.y - left.y) * ratio };
}

function segmentIntersectsObstacle(
  left: Vec2,
  right: Vec2,
  obstacle: Obstacle,
  padding: number,
): boolean {
  const minX = obstacle.minX - padding;
  const maxX = obstacle.maxX + padding;
  const minY = obstacle.minY - padding;
  const maxY = obstacle.maxY + padding;
  let t0 = 0;
  let t1 = 1;
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const slabs: readonly [number, number][] = [
    [-dx, left.x - minX],
    [dx, maxX - left.x],
    [-dy, left.y - minY],
    [dy, maxY - left.y],
  ];
  for (const [coefficient, value] of slabs) {
    if (coefficient === 0) {
      if (value < 0) return false;
      continue;
    }
    const ratio = value / coefficient;
    if (coefficient < 0) t0 = Math.max(t0, ratio);
    else t1 = Math.min(t1, ratio);
    if (t0 > t1) return false;
  }
  return true;
}

interface Contact {
  readonly type: 'obstacle' | 'enemy';
  readonly id: string;
  readonly time: number;
}

function projectileWorldPoint(projectile: ProjectileState, localX: number): Vec2 | null {
  const local = trajectoryPointAt(projectile.path, localX);
  return local === null
    ? null
    : { x: projectile.origin.x + local.x, y: projectile.origin.y + local.y };
}

function sweptEnemyTime(
  projectileStart: Vec2,
  projectileEnd: Vec2,
  enemyStart: Vec2,
  enemyEnd: Vec2,
  radius: number,
): number | null {
  const relativeStart = {
    x: projectileStart.x - enemyStart.x,
    y: projectileStart.y - enemyStart.y,
  };
  const relativeEnd = { x: projectileEnd.x - enemyEnd.x, y: projectileEnd.y - enemyEnd.y };
  const delta = { x: relativeEnd.x - relativeStart.x, y: relativeEnd.y - relativeStart.y };
  const denominator = delta.x * delta.x + delta.y * delta.y;
  const ratio =
    denominator === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, -(relativeStart.x * delta.x + relativeStart.y * delta.y) / denominator),
        );
  const closest = interpolate(relativeStart, relativeEnd, ratio);
  return Math.hypot(closest.x, closest.y) <= radius ? ratio : null;
}

function polylineContacts(
  projectile: ProjectileState,
  startX: number,
  endX: number,
  enemies: readonly EnemyState[],
  obstacles: readonly Obstacle[],
): readonly Contact[] {
  const contacts: Contact[] = [];
  const pathXs = projectile.path.map((point) => point.x).filter((x) => x > startX && x <= endX);
  const breakpoints = [startX, ...pathXs, endX];
  for (let index = 1; index < breakpoints.length; index += 1) {
    const segmentStartX = breakpoints[index - 1];
    const segmentEndX = breakpoints[index];
    if (segmentStartX === undefined || segmentEndX === undefined || segmentEndX <= segmentStartX)
      continue;
    const start = projectileWorldPoint(projectile, segmentStartX);
    const end = projectileWorldPoint(projectile, segmentEndX);
    if (start === null || end === null) continue;
    const segmentRatio = (segmentStartX - startX) / Math.max(endX - startX, Number.EPSILON);
    const endRatio = (segmentEndX - startX) / Math.max(endX - startX, Number.EPSILON);
    for (const obstacle of obstacles) {
      if (segmentIntersectsObstacle(start, end, obstacle, projectile.radius)) {
        contacts.push({ type: 'obstacle', id: obstacle.id, time: segmentRatio });
      }
    }
    for (const enemy of enemies) {
      if (projectile.hitEnemyIds.includes(enemy.id)) continue;
      const enemyStart = interpolate(enemy.previousPosition, enemy.position, segmentRatio);
      const enemyEnd = interpolate(enemy.previousPosition, enemy.position, endRatio);
      const hitTime = sweptEnemyTime(
        start,
        end,
        enemyStart,
        enemyEnd,
        projectile.radius + enemy.radius,
      );
      if (hitTime !== null)
        contacts.push({
          type: 'enemy',
          id: enemy.id,
          time: segmentRatio + hitTime * (endRatio - segmentRatio),
        });
    }
  }
  return contacts.sort((first, second) => {
    const typeOrder = first.type === second.type ? 0 : first.type === 'obstacle' ? -1 : 1;
    return first.time - second.time || typeOrder || first.id.localeCompare(second.id);
  });
}

function projectileTravelDirection(projectile: ProjectileState, localX: number): Vec2 {
  const start = projectileWorldPoint(projectile, Math.max(0, localX - 0.08));
  const end = projectileWorldPoint(projectile, localX + 0.08);
  const left = start ?? projectile.origin;
  const right = end ?? { x: left.x + 1, y: left.y };
  const length = Math.hypot(right.x - left.x, right.y - left.y) || 1;
  return { x: (right.x - left.x) / length, y: (right.y - left.y) / length };
}

function resolveProjectileDamage(
  enemy: EnemyState,
  projectile: ProjectileState,
  contactProgress: number,
  tick: number,
): Readonly<{ enemy: EnemyState; healthDamage: number; absorbed: number; blocked: boolean }> {
  let remaining = enemy.status.hexUntil > tick ? projectile.damage * 1.35 : projectile.damage;
  const originalDamage = remaining;
  if (enemy.kind === 'boar') {
    const direction = projectileTravelDirection(projectile, contactProgress);
    const incomingFrom = { x: -direction.x, y: -direction.y };
    const facingDot = incomingFrom.x * enemy.facingX + incomingFrom.y * 0;
    if (facingDot >= Math.cos(Math.PI / 3)) remaining = Math.round(remaining * 0.35);
  }
  const shieldDamage = Math.min(enemy.shield, remaining);
  remaining -= shieldDamage;
  const armorDamage = Math.min(enemy.armor, remaining);
  remaining -= armorDamage;
  const healthDamage = Math.min(enemy.health, remaining);
  const status =
    projectile.effect === 'burn'
      ? {
          ...enemy.status,
          burnUntil: Math.max(enemy.status.burnUntil, tick + 3 * 60),
          burnDamage: Math.max(enemy.status.burnDamage, 6),
          nextBurnTick: Math.max(enemy.status.nextBurnTick, tick + 30),
        }
      : projectile.effect === 'hex'
        ? { ...enemy.status, hexUntil: Math.max(enemy.status.hexUntil, tick + 4 * 60) }
        : projectile.effect === 'chill'
          ? { ...enemy.status, chillUntil: Math.max(enemy.status.chillUntil, tick + 3 * 60) }
          : enemy.status;
  const nextEnemy = {
    ...enemy,
    shield: enemy.shield - shieldDamage,
    armor: enemy.armor - armorDamage,
    health: enemy.health - healthDamage,
    status,
  };
  return {
    enemy: nextEnemy,
    healthDamage,
    absorbed: originalDamage - healthDamage,
    blocked: originalDamage > healthDamage,
  };
}

function advanceEnemies(state: SimulationState): Readonly<{
  enemies: readonly EnemyState[];
  events: readonly SimulationEvent[];
  defeatedIds: readonly string[];
}> {
  const events: SimulationEvent[] = [];
  const defeatedIds: string[] = [];
  const enemies = state.enemies.map((enemy) => {
    let nextEnemy = enemy;
    if (
      enemy.status.burnUntil > state.tick &&
      state.tick >= enemy.status.nextBurnTick &&
      enemy.health > 0
    ) {
      const damage = Math.min(enemy.status.burnDamage, enemy.health);
      nextEnemy = {
        ...nextEnemy,
        health: enemy.health - damage,
        status: { ...enemy.status, nextBurnTick: state.tick + 30 },
      };
      events.push({ type: 'enemyBurned', enemyId: enemy.id, damage });
      if (nextEnemy.health <= 0) {
        defeatedIds.push(enemy.id);
        events.push({ type: 'enemyDefeated', enemyId: enemy.id });
      }
    }
    const obstacle =
      nextEnemy.ability === 'wallJump' && !nextEnemy.jumpUsed
        ? state.board.obstacles.find(
            (candidate) =>
              nextEnemy.position.x <= candidate.maxX + 0.18 &&
              nextEnemy.position.x >= candidate.minX - 0.18 &&
              nextEnemy.position.y >= candidate.minY - 0.5 &&
              nextEnemy.position.y <= candidate.maxY + 0.5,
          )
        : undefined;
    const jumpLane =
      obstacle === undefined
        ? nextEnemy.lane
        : nextEnemy.lane + 1 < state.board.rows
          ? nextEnemy.lane + 1
          : nextEnemy.lane - 1;
    if (obstacle !== undefined && nextEnemy.health > 0) {
      nextEnemy = {
        ...nextEnemy,
        lane: jumpLane,
        jumpUntilTick: state.tick + 30,
        jumpUsed: true,
      };
      events.push({ type: 'enemyWallJumped', enemyId: enemy.id, lane: jumpLane });
    }
    const enemyTimeFactor =
      state.tick < state.effects.freezeUntil
        ? nextEnemy.freezeResistance
        : state.tick < state.effects.slowUntil
          ? 0.4
          : 1;
    const localFactor = nextEnemy.status.chillUntil > state.tick ? 0.6 : 1;
    const laneShift =
      nextEnemy.kind === 'raven'
        ? Math.sin((state.tick + nextEnemy.id.length * 17) / 38) * 0.42
        : 0;
    const jumpOffset = nextEnemy.jumpUntilTick > state.tick ? 0.62 : 0;
    return {
      ...nextEnemy,
      previousPosition: nextEnemy.position,
      position: {
        x: Math.max(
          0,
          nextEnemy.position.x - nextEnemy.speed * FIXED_DT * enemyTimeFactor * localFactor,
        ),
        y: nextEnemy.lane + 0.5 + laneShift + jumpOffset,
      },
    };
  });
  return { enemies, events, defeatedIds };
}

function advancePhaseLifecycle(
  state: SimulationState,
  enemies: readonly EnemyState[],
  projectiles: readonly ProjectileState[],
): Readonly<{ state: SimulationState; events: readonly SimulationEvent[] }> {
  if (state.phaseStatus !== 'clearing') return { state, events: [] };
  if (
    enemies.some((enemy) => enemy.phaseIndex === state.activePhaseIndex) ||
    projectiles.length > 0
  ) {
    return { state, events: [] };
  }
  const phase = state.phasePlan[state.activePhaseIndex];
  if (phase === undefined) return { state, events: [] };
  const nextPhaseExists = state.activePhaseIndex + 1 < state.phasePlan.length;
  if (!nextPhaseExists) {
    return {
      state: { ...state, allWavesSpawned: true, phaseStatus: 'complete' },
      events: [{ type: 'phaseCleared', phaseIndex: state.activePhaseIndex }],
    };
  }
  return {
    state: {
      ...state,
      phaseStatus: 'intermission',
      phaseIntermissionUntil: state.tick + phase.intermissionTicks,
    },
    events: [{ type: 'phaseCleared', phaseIndex: state.activePhaseIndex }],
  };
}

function advanceState(
  state: SimulationState,
): Readonly<{ state: SimulationState; events: readonly SimulationEvent[] }> {
  if (state.mode !== 'running') return { state, events: [] };
  const scheduled = advanceWaves(state);
  const produced = advanceProduction(scheduled.state);
  const automatic = scheduleAutomaticAttacks(produced.state);
  const baseState = automatic.state;
  const advancedEnemies = advanceEnemies(baseState);
  const events: SimulationEvent[] = [
    ...scheduled.events,
    ...produced.events,
    ...automatic.events,
    ...advancedEnemies.events,
  ];
  const defeated = new Set(advancedEnemies.defeatedIds);
  const projectiles: ProjectileState[] = [];
  let currentEnemies = advancedEnemies.enemies;
  let currentBoard = baseState.board;
  let bossPhase: 0 | 1 | 2 = baseState.bossPhase;
  let quotaActive = baseState.quotaActive;
  let previewAllowed = baseState.previewAllowed;
  let nextIdValue = baseState.nextId;
  for (const projectile of baseState.projectiles) {
    const maxX = projectile.path.at(-1)?.x ?? 0;
    const nextProgressX = Math.min(
      maxX,
      projectile.progressX + projectile.horizontalSpeed * FIXED_DT,
    );
    const contacts = polylineContacts(
      projectile,
      projectile.progressX,
      nextProgressX,
      currentEnemies,
      currentBoard.obstacles,
    );
    let stopped = false;
    let hitCount = projectile.hitEnemyIds.length;
    const hitIds = [...projectile.hitEnemyIds];
    for (const contact of contacts) {
      if (contact.type === 'obstacle') {
        stopped = true;
        break;
      }
      if (hitCount >= projectile.maxHits || hitIds.includes(contact.id)) continue;
      const enemy = currentEnemies.find((current) => current.id === contact.id);
      if (enemy === undefined || enemy.health <= 0) continue;
      hitIds.push(enemy.id);
      hitCount += 1;
      const contactProgress =
        projectile.progressX + (nextProgressX - projectile.progressX) * contact.time;
      const damageResult = resolveProjectileDamage(
        enemy,
        projectile,
        contactProgress,
        baseState.tick,
      );
      const nextHealth = damageResult.enemy.health;
      currentEnemies = currentEnemies.map((current) =>
        current.id === enemy.id ? damageResult.enemy : current,
      );
      events.push({
        type: 'hit',
        projectileId: projectile.id,
        enemyId: enemy.id,
        damage: damageResult.healthDamage,
        absorbed: damageResult.absorbed,
        blocked: damageResult.blocked,
        armorRemaining: damageResult.enemy.armor,
        shieldRemaining: damageResult.enemy.shield,
      });
      if (nextHealth <= 0) {
        defeated.add(enemy.id);
        events.push({ type: 'enemyDefeated', enemyId: enemy.id });
      }
      if (enemy.kind === 'guardian') {
        const healthRatio = nextHealth / enemy.maxHealth;
        if (healthRatio <= 0.7 && bossPhase < 1) {
          bossPhase = 1;
          quotaActive = true;
          currentBoard = {
            ...currentBoard,
            obstacles: [
              ...currentBoard.obstacles,
              { id: 'boss-obstacle-1', minX: 5.2, minY: 0.9, maxX: 5.8, maxY: 2.1 },
            ],
          };
          events.push({ type: 'bossPhaseChanged', phase: 1 });
          events.push({ type: 'formulaLockActivated', limit: baseState.formulaUseLimit });
        }
        if (healthRatio <= 0.3 && bossPhase < 2) {
          bossPhase = 2;
          previewAllowed = false;
          events.push({ type: 'bossPhaseChanged', phase: 2 });
          for (const lane of [1, 3]) {
            if (currentEnemies.length >= MAX_ENEMIES) break;
            const position = { x: Math.min(state.board.columns - 0.5, 8.5), y: lane + 0.5 };
            const add = createEnemy(
              'fox',
              createId('enemy', nextIdValue),
              position,
              lane,
              baseState.activePhaseIndex,
            );
            nextIdValue += 1;
            currentEnemies = [...currentEnemies, add];
            events.push({ type: 'enemySpawned', enemyId: add.id });
          }
        }
      }
      if (hitCount >= projectile.maxHits) {
        stopped = true;
        break;
      }
    }
    if (!stopped && nextProgressX < maxX - Number.EPSILON) {
      projectiles.push({
        ...projectile,
        previousProgressX: projectile.progressX,
        progressX: nextProgressX,
        hitEnemyIds: hitIds,
      });
    }
  }
  currentEnemies = currentEnemies.filter((enemy) => !defeated.has(enemy.id));
  let hearts = baseState.hearts;
  let units = baseState.units;
  currentEnemies = currentEnemies.filter((enemy) => {
    if (enemy.position.x > 0) return true;
    const guard = units.find(
      (unit) =>
        unit.kind === 'shield' &&
        unit.cell.row === enemy.lane &&
        unit.guardAvailableTick <= baseState.tick,
    );
    if (guard !== undefined) {
      units = units.map((unit) =>
        unit.id === guard.id
          ? {
              ...unit,
              guardAvailableTick: baseState.tick + unitBalance.shield.guardCooldownTicks,
            }
          : unit,
      );
      events.push({ type: 'enemyBlockedByShield', enemyId: enemy.id, unitId: guard.id });
      return false;
    }
    hearts = Math.max(0, hearts - 1);
    events.push({ type: 'enemyBreached', enemyId: enemy.id, heartsRemaining: hearts });
    return false;
  });
  const phaseLifecycle = advancePhaseLifecycle(
    {
      ...baseState,
      enemies: currentEnemies,
      projectiles,
    },
    currentEnemies,
    projectiles,
  );
  events.push(...phaseLifecycle.events);
  const phaseState = phaseLifecycle.state;
  const won =
    phaseState.allWavesSpawned &&
    currentEnemies.length === 0 &&
    projectiles.length === 0 &&
    baseState.tick > 0;
  const lost = hearts <= 0;
  const mode = lost ? 'lost' : won ? 'won' : 'running';
  if (mode === 'won' || mode === 'lost') events.push({ type: 'matchEnded', result: mode });
  units = units.map((unit) => ({
    ...unit,
    attackState:
      unit.attackState === 'FORMULA_LOCKED'
        ? unit.attackState
        : attackStateFor(unit, baseState.tick),
  }));
  return {
    state: {
      ...baseState,
      ...phaseState,
      tick: baseState.tick + 1,
      board: currentBoard,
      bossPhase,
      quotaActive,
      previewAllowed,
      nextId: nextIdValue,
      hearts,
      units,
      enemies: currentEnemies,
      projectiles,
      mode,
      formulaRegistry: baseState.formulaRegistry,
    },
    events,
  };
}

export function stepSimulation(
  state: SimulationState,
  commands: readonly SimulationCommand[] = [],
  formulaUseLimit = Number.POSITIVE_INFINITY,
): SimulationStepResult {
  let current = state;
  const events: SimulationEvent[] = [];
  for (const command of commands) {
    const limit = current.quotaActive
      ? Math.min(current.formulaUseLimit, formulaUseLimit)
      : formulaUseLimit;
    const result = applyCommand(current, command, limit);
    current = result.state;
    events.push(...result.events);
  }
  const advanced = advanceState(current);
  return { state: advanced.state, events: [...events, ...advanced.events] };
}
