import { cellCenter, isDeployable, sameCell } from '../board/board';
import {
  createFormulaRegistry,
  recordFormulaUse,
  registerFormula,
  resetFormulaBucket,
} from '../math/quota';
import { sampleTrajectory, trajectoryPointAt } from '../math/sampler';
import { validateFormula } from '../math/engine';
import type { Vec2 } from '../math/types';
import type { Cell, Obstacle } from '../board/board';
import { enemyBalance, unitBalance } from './balance';
import type {
  CommandRejection,
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
  WaveSpawn,
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
    wavePlan: config.waves ?? [],
    nextWaveSpawnIndex: 0,
    bossPhase: 0,
    quotaActive: config.quotaActive ?? false,
    formulaUseLimit: config.formulaUseLimit ?? Number.POSITIVE_INFINITY,
    previewAllowed: config.previewAllowed ?? true,
    formulaRegistry: createFormulaRegistry(),
    selectedUnitId: units[0]?.id ?? null,
    allWavesSpawned: config.allWavesSpawned ?? false,
    nextId: next,
    seed: config.seed,
  };
}

function advanceWaves(
  state: SimulationState,
): Readonly<{ state: SimulationState; events: readonly SimulationEvent[] }> {
  let nextIndex = state.nextWaveSpawnIndex;
  let nextIdValue = state.nextId;
  let enemies = state.enemies;
  const events: SimulationEvent[] = [];
  while (nextIndex < state.wavePlan.length) {
    const spawn = state.wavePlan[nextIndex];
    if (spawn === undefined || spawn.tick > state.tick || enemies.length >= MAX_ENEMIES) break;
    const balance = enemyBalance[spawn.kind];
    const position = { x: spawn.x, y: spawn.lane + 0.5 };
    const enemy: EnemyState = {
      id: createId('enemy', nextIdValue),
      kind: spawn.kind,
      position,
      previousPosition: position,
      lane: spawn.lane,
      health: balance.health,
      radius: balance.radius,
      speed: balance.speed,
    };
    nextIdValue += 1;
    enemies = [...enemies, enemy];
    nextIndex += 1;
    events.push({ type: 'enemySpawned', enemyId: enemy.id });
  }
  return {
    state: {
      ...state,
      enemies,
      nextId: nextIdValue,
      nextWaveSpawnIndex: nextIndex,
      allWavesSpawned:
        state.allWavesSpawned || (state.wavePlan.length > 0 && nextIndex >= state.wavePlan.length),
    },
    events,
  };
}

function rejection(reason: CommandRejection): SimulationEvent {
  return { type: 'commandRejected', reason };
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
  if (unitAtCell(state, command.cell) !== undefined || !isDeployable(command.cell, state.board)) {
    return { state, event: rejection('FORBIDDEN_CELL') };
  }
  const units = state.units.map((current) =>
    current.id === unit.id ? { ...current, cell: { ...command.cell } } : current,
  );
  return {
    state: { ...state, units },
    event: { type: 'unitMoved', unitId: unit.id, cell: { ...command.cell } },
  };
}

function applyFire(
  state: SimulationState,
  command: Extract<SimulationCommand, { type: 'fire' }>,
  formulaUseLimit: number,
): Readonly<{ state: SimulationState; event: SimulationEvent }> {
  if (state.mode !== 'running') return { state, event: rejection('INVALID_MODE') };
  const unit = state.units.find((current) => current.id === command.unitId);
  if (unit === undefined) return { state, event: rejection('NO_UNIT') };
  if (unit.kind === 'nest') return { state, event: rejection('NO_SHOT_UNIT') };
  if (unit.cooldownUntil > state.tick) return { state, event: rejection('COOLDOWN') };
  if (state.projectiles.length >= MAX_PROJECTILES)
    return { state, event: rejection('PROJECTILE_CAPACITY') };
  const formulaResult = validateFormula(command.expression);
  if (!formulaResult.ok) return { state, event: rejection('INVALID_FORMULA') };
  const registryResult = registerFormula(state.formulaRegistry, formulaResult.formula, {
    maxU: state.board.columns,
    seed: state.seed,
  });
  if (!registryResult.ok) return { state, event: rejection('INVALID_FORMULA') };
  if (registryResult.bucket.uses >= formulaUseLimit) return { state, event: rejection('QUOTA') };
  const origin = cellCenter(unit.cell);
  const localPath = sampleTrajectory(formulaResult.formula.expression, {
    maxU: state.board.columns - origin.x,
    minV: -origin.y,
    maxV: state.board.rows - origin.y,
  });
  if (localPath.points.length < 2) return { state, event: rejection('NO_PATH') };
  const useResult = recordFormulaUse(registryResult.registry, registryResult.bucket.id);
  if (!useResult.ok) return { state, event: rejection('INVALID_FORMULA') };
  const generated = nextId(state);
  const balance = unitBalance[unit.kind];
  const damage = state.effects.doubleDamageArmed ? balance.damage * 2 : balance.damage;
  const projectile: ProjectileState = {
    id: generated.id,
    unitId: unit.id,
    origin,
    formula: formulaResult.formula,
    path: localPath.points,
    horizontalSpeed: balance.horizontalSpeed,
    damage,
    radius: balance.radius,
    maxHits: balance.maxHits,
    progressX: 0,
    previousProgressX: 0,
    hitEnemyIds: [],
  };
  const units = state.units.map((current) =>
    current.id === unit.id
      ? { ...current, cooldownUntil: state.tick + balance.cooldownTicks }
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
    event: { type: 'shotFired', projectileId: projectile.id, unitId: unit.id },
  };
}

function applySpawnEnemy(
  state: SimulationState,
  command: Extract<SimulationCommand, { type: 'spawnEnemy' }>,
): Readonly<{ state: SimulationState; event: SimulationEvent }> {
  if (state.enemies.length >= MAX_ENEMIES) return { state, event: rejection('NO_ENEMY_CAPACITY') };
  const generated = nextId(state);
  const balance = enemyBalance[command.kind];
  const position = { x: command.x, y: command.lane + 0.5 };
  const enemy: EnemyState = {
    id: generated.id,
    kind: command.kind,
    position,
    previousPosition: position,
    lane: command.lane,
    health: balance.health,
    radius: balance.radius,
    speed: balance.speed,
  };
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
    return {
      state: {
        ...state,
        formulaRegistry: reset.registry,
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
    case 'fire': {
      const result = applyFire(state, command, formulaUseLimit);
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

function advanceState(
  state: SimulationState,
): Readonly<{ state: SimulationState; events: readonly SimulationEvent[] }> {
  if (state.mode !== 'running') return { state, events: [] };
  const scheduled = advanceWaves(state);
  const produced = advanceProduction(scheduled.state);
  const baseState = produced.state;
  const enemyTimeFactor =
    baseState.tick < baseState.effects.freezeUntil
      ? 0
      : baseState.tick < baseState.effects.slowUntil
        ? 0.4
        : 1;
  const enemies = baseState.enemies.map((enemy) => ({
    ...enemy,
    previousPosition: enemy.position,
    position: {
      x: Math.max(0, enemy.position.x - enemy.speed * FIXED_DT * enemyTimeFactor),
      y: enemy.position.y,
    },
  }));
  const events: SimulationEvent[] = [...scheduled.events, ...produced.events];
  const defeated = new Set<string>();
  const projectiles: ProjectileState[] = [];
  let currentEnemies = enemies;
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
      if (enemy === undefined) continue;
      hitIds.push(enemy.id);
      hitCount += 1;
      const nextHealth = enemy.health - projectile.damage;
      currentEnemies = currentEnemies.map((current) =>
        current.id === enemy.id ? { ...current, health: nextHealth } : current,
      );
      events.push({
        type: 'hit',
        projectileId: projectile.id,
        enemyId: enemy.id,
        damage: projectile.damage,
      });
      if (nextHealth <= 0) {
        defeated.add(enemy.id);
        events.push({ type: 'enemyDefeated', enemyId: enemy.id });
      }
      if (enemy.kind === 'guardian') {
        const healthRatio = nextHealth / enemyBalance.guardian.health;
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
            const add: EnemyState = {
              id: createId('enemy', nextIdValue),
              kind: 'fox',
              position,
              previousPosition: position,
              lane,
              health: enemyBalance.fox.health,
              radius: enemyBalance.fox.radius,
              speed: enemyBalance.fox.speed,
            };
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
  currentEnemies = currentEnemies.filter((enemy) => {
    if (enemy.position.x > 0) return true;
    hearts = Math.max(0, hearts - 1);
    events.push({ type: 'enemyBreached', enemyId: enemy.id, heartsRemaining: hearts });
    return false;
  });
  const won =
    baseState.allWavesSpawned &&
    currentEnemies.length === 0 &&
    projectiles.length === 0 &&
    baseState.tick > 0;
  const lost = hearts <= 0;
  const mode = lost ? 'lost' : won ? 'won' : 'running';
  if (mode === 'won' || mode === 'lost') events.push({ type: 'matchEnded', result: mode });
  return {
    state: {
      ...baseState,
      tick: baseState.tick + 1,
      board: currentBoard,
      bossPhase,
      quotaActive,
      previewAllowed,
      nextId: nextIdValue,
      hearts,
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
