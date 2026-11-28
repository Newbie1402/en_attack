import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

import {
  cellCenter,
  createScreenLayout,
  screenToWorld,
  worldToScreen,
} from '../../game/domain/board/board';
import type {
  EnemyState,
  SimulationEvent,
  SimulationState,
  UnitState,
} from '../../game/domain/simulation/types';
import type { GameSession } from '../../game/application/session';
import type { Vec2 } from '../../game/domain/math/types';

export interface PreviewTrajectory {
  readonly origin: Vec2;
  readonly path: readonly Vec2[];
}

interface PreviewStore {
  current: PreviewTrajectory | null;
}

interface BattlefieldSceneData {
  readonly session: GameSession;
  readonly previewStore: PreviewStore;
  readonly theme: 'spring' | 'winter';
}

class BattlefieldScene extends Phaser.Scene {
  private session: GameSession | null = null;

  private unsubscribe: (() => void) | null = null;

  private state: SimulationState | null = null;

  private graphics: Phaser.GameObjects.Graphics | null = null;

  private title: Phaser.GameObjects.Text | null = null;

  private previewStore: PreviewStore | null = null;

  private theme: 'spring' | 'winter' = 'spring';

  private readonly unitSprites = new Map<string, Phaser.GameObjects.Image>();

  private readonly enemySprites = new Map<string, Phaser.GameObjects.Image>();

  private readonly pickupSprites = new Map<string, Phaser.GameObjects.Image>();

  private readonly projectileSprites = new Map<string, Phaser.GameObjects.Image>();

  private readonly collectingPickups = new Map<string, Phaser.GameObjects.Image>();

  private environmentSprite: Phaser.GameObjects.Image | null = null;

  public constructor() {
    super('battlefield-scene');
  }

  public init(data: BattlefieldSceneData): void {
    this.session = data.session;
    this.previewStore = data.previewStore;
    this.theme = data.theme;
    this.state = data.session.getState();
  }

  public preload(): void {
    this.load.svg('swallow-normal', '/assets/characters/swallows/normal/swallow-normal.svg', {
      width: 160,
      height: 128,
    });
    this.load.svg('swallow-frost', '/assets/characters/swallows/frost/swallow-frost.svg', {
      width: 160,
      height: 128,
    });
    this.load.svg('swallow-heavy', '/assets/characters/swallows/heavy/swallow-heavy.svg', {
      width: 176,
      height: 144,
    });
    this.load.svg('nest-lucky', '/assets/characters/swallows/nest-lucky.svg', {
      width: 160,
      height: 128,
    });
    this.load.svg('enemy-fox', '/assets/characters/enemies/fox/fox.svg', {
      width: 144,
      height: 128,
    });
    this.load.svg('enemy-boar', '/assets/characters/enemies/boar/boar.svg', {
      width: 176,
      height: 144,
    });
    this.load.svg('enemy-raven', '/assets/characters/enemies/raven/raven.svg', {
      width: 160,
      height: 144,
    });
    this.load.svg('enemy-guardian', '/assets/characters/enemies/boss/guardian.svg', {
      width: 224,
      height: 192,
    });
    this.load.svg('pickup-energy', '/assets/pickups/energy.svg', { width: 80, height: 80 });
    this.load.svg('pickup-skill', '/assets/pickups/skill.svg', { width: 80, height: 80 });
    this.load.svg('projectile-snowball', '/assets/projectiles/snowball.svg', {
      width: 64,
      height: 64,
    });
    this.load.svg('environment-spring', '/assets/environments/spring/garden-backdrop.svg', {
      width: 1200,
      height: 600,
    });
    this.load.svg('environment-winter', '/assets/environments/winter/valley-backdrop.svg', {
      width: 1200,
      height: 600,
    });
  }

  public create(): void {
    if (this.session === null) return;
    this.graphics = this.add.graphics();
    this.environmentSprite = this.add
      .image(0, 0, this.theme === 'winter' ? 'environment-winter' : 'environment-spring')
      .setOrigin(0, 0)
      .setDepth(-2)
      .setAlpha(0.58);
    this.title = this.add.text(24, 18, 'Vườn xuân · đường bay thực', {
      color: '#26354d',
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      fontStyle: 'bold',
    });
    this.unsubscribe = this.session.subscribe((state, events) => {
      this.state = state;
      this.handleSimulationEvents(events);
    });
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.renderScene, this);
    this.renderScene();
  }

  public update(): void {
    this.renderScene();
  }

  public shutdown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.renderScene, this);
    this.destroySprites(this.unitSprites);
    this.destroySprites(this.enemySprites);
    this.destroySprites(this.pickupSprites);
    this.destroySprites(this.projectileSprites);
    this.destroySprites(this.collectingPickups);
    this.environmentSprite?.destroy();
    this.environmentSprite = null;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const state = this.state;
    const session = this.session;
    if (state === null || session === null) return;
    const baseLayout = createScreenLayout(
      state.board,
      this.scale.width - 40,
      this.scale.height - 86,
    );
    const layout = {
      ...baseLayout,
      boardLeft: baseLayout.boardLeft + 20,
      boardTop: baseLayout.boardTop + 58,
    };
    const world = screenToWorld({ x: pointer.x, y: pointer.y }, state.board, layout);
    const pickup = state.pickups.find(
      (current) => Math.hypot(current.position.x - world.x, current.position.y - world.y) <= 0.42,
    );
    if (pickup !== undefined) {
      session.dispatch({ type: 'collectPickup', pickupId: pickup.id });
      return;
    }
    const unit = state.units.find((current) => {
      const center = cellCenter(current.cell);
      return Math.hypot(center.x - world.x, center.y - world.y) <= 0.42;
    });
    if (unit !== undefined) {
      session.dispatch({ type: 'selectUnit', unitId: unit.id });
      return;
    }
  }

  private renderScene(): void {
    const state = this.state;
    const graphics = this.graphics;
    if (state === null || graphics === null) return;
    const width = this.scale.width;
    const height = this.scale.height;
    const baseLayout = createScreenLayout(state.board, width - 40, height - 86);
    const layout = {
      ...baseLayout,
      boardLeft: baseLayout.boardLeft + 20,
      boardTop: baseLayout.boardTop + 58,
    };
    this.environmentSprite?.setPosition(0, 0).setDisplaySize(width, height);
    graphics.clear();

    graphics.fillStyle(this.theme === 'winter' ? 0xc9e1e5 : 0xc7dfaa, 1);
    graphics.fillRoundedRect(
      layout.boardLeft - 8,
      layout.boardTop - 8,
      layout.cellPx * state.board.columns + 16,
      layout.cellPx * state.board.rows + 16,
      24,
    );
    this.drawEnvironment(graphics, state, layout);
    for (let row = 0; row < state.board.rows; row += 1) {
      for (let col = 0; col < state.board.columns; col += 1) {
        const color =
          this.theme === 'winter'
            ? (row + col) % 2 === 0
              ? 0xcde1d8
              : 0xbdd5cc
            : (row + col) % 2 === 0
              ? 0xb6d486
              : 0xa9c977;
        graphics.fillStyle(color, 1);
        graphics.fillRoundedRect(
          layout.boardLeft + col * layout.cellPx + 2,
          layout.boardTop + (state.board.rows - row - 1) * layout.cellPx + 2,
          layout.cellPx - 4,
          layout.cellPx - 4,
          10,
        );
      }
    }
    graphics.lineStyle(2, this.theme === 'winter' ? 0xf2fbf5 : 0xe8f5d8, 0.48);
    for (let col = 0; col <= state.board.columns; col += 1) {
      graphics.lineBetween(
        layout.boardLeft + col * layout.cellPx,
        layout.boardTop,
        layout.boardLeft + col * layout.cellPx,
        layout.boardTop + state.board.rows * layout.cellPx,
      );
    }
    for (let row = 0; row <= state.board.rows; row += 1) {
      graphics.lineBetween(
        layout.boardLeft,
        layout.boardTop + row * layout.cellPx,
        layout.boardLeft + state.board.columns * layout.cellPx,
        layout.boardTop + row * layout.cellPx,
      );
    }
    for (const obstacle of state.board.obstacles) {
      const topLeft = worldToScreen({ x: obstacle.minX, y: obstacle.maxY }, state.board, layout);
      graphics.fillStyle(0x6f7d78, 1);
      graphics.fillRoundedRect(
        topLeft.x,
        topLeft.y,
        (obstacle.maxX - obstacle.minX) * layout.cellPx,
        (obstacle.maxY - obstacle.minY) * layout.cellPx,
        10,
      );
      graphics.fillStyle(0xb0c0bb, 0.8);
      graphics.fillCircle(
        topLeft.x + layout.cellPx * 0.35,
        topLeft.y + layout.cellPx * 0.3,
        layout.cellPx * 0.12,
      );
    }
    this.syncUnitSprites(state, layout);
    this.syncEnemySprites(state, layout);
    this.syncPickupSprites(state, layout);
    this.syncProjectileSprites(state, layout);
    this.drawPreview(graphics, state, layout);
    this.drawEntityShadows(graphics, state, layout);
    this.drawHealthBars(graphics, state, layout);
    this.drawProjectileTrails(graphics, state, layout);
    this.title?.setText(
      state.mode === 'running'
        ? this.theme === 'winter'
          ? `Thung lũng đông · ${state.tick}`
          : `Vườn xuân · ${state.tick}`
        : this.theme === 'winter'
          ? 'Thung lũng đông'
          : 'Vườn xuân',
    );
  }

  private handleSimulationEvents(events: readonly SimulationEvent[]): void {
    for (const event of events) {
      if (event.type === 'shotFired') {
        const sprite = this.unitSprites.get(event.unitId);
        if (sprite !== undefined) {
          this.tweens.add({
            targets: sprite,
            scaleX: 0.88,
            scaleY: 0.88,
            duration: 80,
            yoyo: true,
            ease: 'Sine.easeOut',
          });
        }
      }
      if (event.type === 'hit') {
        const sprite = this.enemySprites.get(event.enemyId);
        if (sprite !== undefined) {
          sprite.setTint(0xffffff);
          this.time.delayedCall(100, () => sprite.clearTint());
          const state = this.state;
          const enemy = state?.enemies.find((current) => current.id === event.enemyId);
          if (state !== null && enemy !== undefined) {
            const baseLayout = createScreenLayout(
              state.board,
              this.scale.width - 40,
              this.scale.height - 86,
            );
            const layout = {
              ...baseLayout,
              boardLeft: baseLayout.boardLeft + 20,
              boardTop: baseLayout.boardTop + 58,
            };
            const point = worldToScreen(enemy.position, state.board, layout);
            const label = this.add
              .text(point.x, point.y - layout.cellPx * 0.55, `-${Math.round(event.damage)}`, {
                color: '#fff8e8',
                fontFamily: 'Trebuchet MS, sans-serif',
                fontSize: `${Math.max(13, layout.cellPx * 0.18)}px`,
                fontStyle: 'bold',
                stroke: '#a94e3b',
                strokeThickness: 4,
              })
              .setOrigin(0.5)
              .setDepth(16);
            this.tweens.add({
              targets: label,
              y: label.y - layout.cellPx * 0.35,
              alpha: 0,
              duration: 420,
              ease: 'Quad.easeOut',
              onComplete: () => label.destroy(),
            });
          }
        }
      }
      if (event.type === 'pickupCollected') this.animatePickupCollection(event.pickupId);
    }
  }

  private animatePickupCollection(pickupId: string): void {
    const sprite = this.pickupSprites.get(pickupId);
    if (sprite === undefined) return;
    this.pickupSprites.delete(pickupId);
    this.collectingPickups.set(pickupId, sprite);
    sprite.setDepth(20);
    this.tweens.add({
      targets: sprite,
      x: this.scale.width - 72,
      y: 34,
      alpha: 0,
      scaleX: 0.35,
      scaleY: 0.35,
      duration: 350,
      ease: 'Quad.easeIn',
      onComplete: () => {
        sprite.destroy();
        this.collectingPickups.delete(pickupId);
      },
    });
  }

  private drawEnvironment(
    graphics: Phaser.GameObjects.Graphics,
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    const left = layout.boardLeft - 18;
    const top = layout.boardTop - 18;
    const width = layout.cellPx * state.board.columns + 36;
    const height = layout.cellPx * state.board.rows + 36;
    graphics.fillStyle(this.theme === 'winter' ? 0xeaf5f1 : 0xdcebc1, 0.92);
    graphics.fillRoundedRect(left, top, width, height, 22);
    graphics.lineStyle(4, this.theme === 'winter' ? 0xb6d4d4 : 0x9dbd78, 0.9);
    graphics.strokeRoundedRect(left, top, width, height, 22);

    if (this.theme === 'winter') {
      graphics.fillStyle(0xffffff, 0.65);
      for (let index = 0; index < state.board.columns; index += 1) {
        const x = layout.boardLeft + index * layout.cellPx + layout.cellPx * 0.2;
        graphics.fillEllipse(x, top + 3, layout.cellPx * 0.6, 12);
        graphics.fillEllipse(x + layout.cellPx * 0.55, top + 6, layout.cellPx * 0.45, 9);
      }
      graphics.lineStyle(3, 0xbad8dc, 0.9);
      for (let index = 0; index < 9; index += 1) {
        const x = left + 12 + ((index * 67) % Math.max(30, width - 24));
        const y = top + 18 + ((index * 41) % Math.max(30, height - 28));
        graphics.lineBetween(x - 4, y, x + 4, y);
        graphics.lineBetween(x, y - 4, x, y + 4);
      }
    } else {
      graphics.lineStyle(5, 0x8db16d, 0.82);
      graphics.lineBetween(left + 14, top + 12, left + width - 14, top + 12);
      for (let index = 0; index < 9; index += 1) {
        const x = left + 24 + ((index * 83) % Math.max(40, width - 48));
        const y = top + height - 12 - ((index * 17) % 17);
        graphics.lineBetween(x, y, x + 4, y - 13);
        graphics.lineBetween(x + 4, y - 7, x + 11, y - 11);
        graphics.fillStyle(index % 2 === 0 ? 0xf4a548 : 0xf48ba9, 0.95);
        graphics.fillCircle(x + 5, y - 15, 3.5);
        graphics.fillCircle(x + 10, y - 12, 3.5);
      }
      graphics.fillStyle(0x8e6c45, 0.9);
      graphics.fillRoundedRect(left + 10, top + 12, 12, height - 24, 5);
      graphics.fillRoundedRect(left + width - 22, top + 12, 12, height - 24, 5);
    }
  }

  private syncUnitSprites(
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    const active = new Set<string>();
    for (const unit of state.units) {
      active.add(unit.id);
      const key =
        unit.kind === 'nest'
          ? 'nest-lucky'
          : unit.kind === 'snow'
            ? 'swallow-normal'
            : `swallow-${unit.kind}`;
      let sprite = this.unitSprites.get(unit.id);
      if (sprite === undefined) {
        sprite = this.add.image(0, 0, key).setOrigin(0.5).setDepth(7);
        this.unitSprites.set(unit.id, sprite);
      }
      if (sprite.texture.key !== key) sprite.setTexture(key);
      const center = worldToScreen(cellCenter(unit.cell), state.board, layout);
      const bob =
        unit.kind === 'nest' ? Math.sin(state.tick / 18) * 1.5 : Math.sin(state.tick / 8) * 2.5;
      const width = layout.cellPx * (unit.kind === 'heavy' ? 0.78 : 0.7);
      sprite.setPosition(center.x, center.y + bob);
      sprite.setDisplaySize(width, width * 0.8);
      sprite.setAlpha(unit.cooldownUntil > state.tick ? 0.74 : 1);
      sprite.setRotation(
        unit.kind === 'nest' ? Math.sin(state.tick / 24) * 0.02 : Math.sin(state.tick / 14) * 0.025,
      );
    }
    this.removeInactiveSprites(this.unitSprites, active);
  }

  private syncEnemySprites(
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    const active = new Set<string>();
    for (const enemy of state.enemies) {
      active.add(enemy.id);
      const key = `enemy-${enemy.kind}`;
      let sprite = this.enemySprites.get(enemy.id);
      if (sprite === undefined) {
        sprite = this.add.image(0, 0, key).setOrigin(0.5).setDepth(6);
        this.enemySprites.set(enemy.id, sprite);
      }
      if (sprite.texture.key !== key) sprite.setTexture(key);
      const center = worldToScreen(enemy.position, state.board, layout);
      const size = layout.cellPx * (enemy.kind === 'guardian' ? 1.06 : enemy.radius * 2.35);
      const bob = enemy.kind === 'raven' ? Math.sin(state.tick / 7 + enemy.position.x) * 4 : 0;
      sprite.setPosition(center.x, center.y + bob);
      sprite.setDisplaySize(size, size * 0.88);
      sprite.setRotation(enemy.kind === 'raven' ? Math.sin(state.tick / 9) * 0.06 : 0);
    }
    this.removeInactiveSprites(this.enemySprites, active);
  }

  private syncPickupSprites(
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    const active = new Set<string>();
    for (const pickup of state.pickups) {
      active.add(pickup.id);
      const key = pickup.kind === 'energy' ? 'pickup-energy' : 'pickup-skill';
      let sprite = this.pickupSprites.get(pickup.id);
      if (sprite === undefined) {
        sprite = this.add.image(0, 0, key).setOrigin(0.5).setDepth(9);
        this.pickupSprites.set(pickup.id, sprite);
      }
      if (sprite.texture.key !== key) sprite.setTexture(key);
      const center = worldToScreen(pickup.position, state.board, layout);
      const ready = state.tick >= pickup.collectibleTick;
      const pulse = ready ? 1 + Math.sin(state.tick / 10) * 0.08 : 0.9;
      sprite.setPosition(center.x, center.y - Math.sin(state.tick / 9) * 3);
      sprite.setDisplaySize(layout.cellPx * 0.34 * pulse, layout.cellPx * 0.34 * pulse);
      sprite.setAlpha(ready ? 1 : 0.62);
      sprite.setRotation(ready ? state.tick / 90 : 0);
    }
    this.removeInactiveSprites(this.pickupSprites, active);
  }

  private syncProjectileSprites(
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    const active = new Set<string>();
    for (const projectile of state.projectiles) {
      active.add(projectile.id);
      let sprite = this.projectileSprites.get(projectile.id);
      if (sprite === undefined) {
        sprite = this.add.image(0, 0, 'projectile-snowball').setOrigin(0.5).setDepth(10);
        this.projectileSprites.set(projectile.id, sprite);
      }
      const local = this.pathPointAtProgress(projectile.path, projectile.progressX);
      if (local === null) continue;
      const point = worldToScreen(
        { x: projectile.origin.x + local.x, y: projectile.origin.y + local.y },
        state.board,
        layout,
      );
      const size = Math.max(16, layout.cellPx * projectile.radius * 2.8);
      sprite.setPosition(point.x, point.y);
      sprite.setDisplaySize(size, size);
      sprite.setRotation(state.tick / 3);
    }
    this.removeInactiveSprites(this.projectileSprites, active);
  }

  private drawEntityShadows(
    graphics: Phaser.GameObjects.Graphics,
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    graphics.fillStyle(0x2d4a3c, 0.16);
    for (const unit of state.units) {
      const center = worldToScreen(cellCenter(unit.cell), state.board, layout);
      graphics.fillEllipse(
        center.x,
        center.y + layout.cellPx * 0.23,
        layout.cellPx * 0.36,
        layout.cellPx * 0.1,
      );
    }
    for (const enemy of state.enemies) {
      const center = worldToScreen(enemy.position, state.board, layout);
      graphics.fillEllipse(
        center.x,
        center.y + layout.cellPx * 0.24,
        layout.cellPx * 0.44,
        layout.cellPx * 0.12,
      );
    }
  }

  private drawHealthBars(
    graphics: Phaser.GameObjects.Graphics,
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    for (const enemy of state.enemies) {
      const center = worldToScreen(enemy.position, state.board, layout);
      const radius = layout.cellPx * (enemy.kind === 'guardian' ? 0.56 : enemy.radius * 1.18);
      const maxHealth =
        enemy.kind === 'boar'
          ? 220
          : enemy.kind === 'guardian'
            ? 1000
            : enemy.kind === 'raven'
              ? 120
              : 90;
      graphics.fillStyle(0x273449, 0.9);
      graphics.fillRoundedRect(center.x - radius, center.y - radius * 1.26, radius * 2, 6, 3);
      graphics.fillStyle(enemy.kind === 'guardian' ? 0xf1b84b : 0xe85b57, 1);
      graphics.fillRoundedRect(
        center.x - radius,
        center.y - radius * 1.26,
        radius * 2 * Math.max(0, enemy.health / maxHealth),
        6,
        3,
      );
    }
  }

  private drawProjectileTrails(
    graphics: Phaser.GameObjects.Graphics,
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    for (const projectile of state.projectiles) {
      const local = this.pathPointAtProgress(projectile.path, projectile.progressX);
      if (local === null) continue;
      const point = worldToScreen(
        { x: projectile.origin.x + local.x, y: projectile.origin.y + local.y },
        state.board,
        layout,
      );
      graphics.lineStyle(5, 0xf3fbff, 0.38);
      graphics.lineBetween(
        point.x - layout.cellPx * 0.3,
        point.y,
        point.x - layout.cellPx * 0.05,
        point.y,
      );
      graphics.fillStyle(0xffffff, 0.62);
      graphics.fillCircle(point.x - layout.cellPx * 0.34, point.y, 3);
    }
  }

  private removeInactiveSprites(
    sprites: Map<string, Phaser.GameObjects.Image>,
    active: Set<string>,
  ): void {
    for (const [id, sprite] of sprites) {
      if (active.has(id)) continue;
      sprite.destroy();
      sprites.delete(id);
    }
  }

  private destroySprites(sprites: Map<string, Phaser.GameObjects.Image>): void {
    for (const sprite of sprites.values()) sprite.destroy();
    sprites.clear();
  }

  private drawPreview(
    graphics: Phaser.GameObjects.Graphics,
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    const preview = this.previewStore?.current;
    if (!state.previewAllowed || preview === null || preview === undefined) return;
    for (let index = 1; index < preview.path.length; index += 1) {
      if (index % 2 === 0) continue;
      const left = preview.path[index - 1];
      const right = preview.path[index];
      if (left === undefined || right === undefined) continue;
      const start = worldToScreen(
        { x: preview.origin.x + left.x, y: preview.origin.y + left.y },
        state.board,
        layout,
      );
      const end = worldToScreen(
        { x: preview.origin.x + right.x, y: preview.origin.y + right.y },
        state.board,
        layout,
      );
      graphics.lineStyle(3, 0xfaf8ff, 0.74);
      graphics.lineBetween(start.x, start.y, end.x, end.y);
    }
  }

  private pathPointAtProgress(
    points: readonly { readonly x: number; readonly y: number }[],
    progress: number,
  ): { readonly x: number; readonly y: number } | null {
    for (let index = points.length - 1; index >= 0; index -= 1) {
      const point = points[index];
      if (point !== undefined && point.x <= progress) return point;
    }
    return points[0] ?? null;
  }

  private drawUnit(
    graphics: Phaser.GameObjects.Graphics,
    unit: UnitState,
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    const center = worldToScreen(
      { x: unit.cell.col + 0.5, y: unit.cell.row + 0.5 },
      state.board,
      layout,
    );
    const radius = layout.cellPx * 0.28;
    const selected = unit.id === state.selectedUnitId;
    if (selected) {
      graphics.lineStyle(4, 0xffdc4a, 1);
      graphics.strokeCircle(center.x, center.y, layout.cellPx * 0.42);
    }
    if (unit.kind === 'nest') {
      graphics.fillStyle(0x8b5e34, 1);
      graphics.fillEllipse(center.x, center.y + radius * 0.35, radius * 2.5, radius * 1.1);
      graphics.fillStyle(0xfff5e5, 1);
      graphics.fillCircle(center.x - radius * 0.45, center.y - radius * 0.05, radius * 0.42);
      graphics.fillCircle(center.x + radius * 0.35, center.y - radius * 0.1, radius * 0.42);
      return;
    }
    graphics.fillStyle(unit.kind === 'frost' ? 0x7dd3fc : 0xfff5e5, 1);
    graphics.fillCircle(center.x, center.y, radius);
    graphics.fillStyle(0x26354d, 1);
    graphics.fillTriangle(
      center.x + radius * 1.15,
      center.y,
      center.x + radius * 0.45,
      center.y - radius * 0.35,
      center.x + radius * 0.45,
      center.y + radius * 0.35,
    );
    graphics.fillStyle(0xf97316, 1);
    graphics.fillTriangle(
      center.x - radius * 0.15,
      center.y,
      center.x - radius * 1.25,
      center.y - radius * 0.7,
      center.x - radius * 0.95,
      center.y + radius * 0.4,
    );
    graphics.fillStyle(0x26354d, 1);
    graphics.fillCircle(center.x + radius * 0.35, center.y - radius * 0.27, radius * 0.13);
    graphics.fillStyle(0xf97316, 1);
    graphics.fillRoundedRect(
      center.x - radius * 0.75,
      center.y + radius * 0.35,
      radius * 1.6,
      radius * 0.22,
      5,
    );
  }

  private drawEnemy(
    graphics: Phaser.GameObjects.Graphics,
    enemy: EnemyState,
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    const center = worldToScreen(enemy.position, state.board, layout);
    const radius = layout.cellPx * enemy.radius;
    graphics.fillStyle(
      enemy.kind === 'boar' ? 0x6f4f43 : enemy.kind === 'raven' ? 0x433759 : 0xe87542,
      1,
    );
    graphics.fillCircle(center.x, center.y, radius);
    graphics.fillStyle(0xfff5e5, 1);
    graphics.fillCircle(center.x - radius * 0.15, center.y - radius * 0.2, radius * 0.18);
    graphics.fillStyle(0x26354d, 1);
    graphics.fillCircle(center.x - radius * 0.1, center.y - radius * 0.2, radius * 0.08);
    graphics.fillStyle(0x26354d, 1);
    graphics.fillRect(center.x - radius, center.y - radius * 1.5, radius * 2, 5);
    graphics.fillStyle(0xef4444, 1);
    const maxHealth =
      enemy.kind === 'boar'
        ? 220
        : enemy.kind === 'guardian'
          ? 1000
          : enemy.kind === 'raven'
            ? 120
            : 90;
    graphics.fillRect(
      center.x - radius,
      center.y - radius * 1.5,
      radius * 2 * Math.max(0, enemy.health / maxHealth),
      5,
    );
  }

  private drawPickup(
    graphics: Phaser.GameObjects.Graphics,
    pickup: SimulationState['pickups'][number],
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    const center = worldToScreen(pickup.position, state.board, layout);
    const ready = state.tick >= pickup.collectibleTick;
    const pulse = ready
      ? 1 + Math.sin(state.tick / 10) * 0.08
      : 0.92 + Math.sin(state.tick / 4) * 0.08;
    const radius = layout.cellPx * 0.18 * pulse;
    const color = pickup.kind === 'energy' ? 0xffbd32 : 0x8b5cf6;
    graphics.lineStyle(3, color, ready ? 0.95 : 0.55);
    graphics.strokeCircle(center.x, center.y, radius * 1.55);
    graphics.fillStyle(color, ready ? 1 : 0.72);
    graphics.fillCircle(center.x, center.y, radius);
    graphics.lineStyle(2, 0xfff5e5, 0.95);
    graphics.lineBetween(center.x - radius * 0.45, center.y, center.x + radius * 0.45, center.y);
    if (pickup.kind === 'energy') {
      graphics.lineBetween(center.x, center.y - radius * 0.45, center.x, center.y + radius * 0.45);
    } else {
      graphics.strokeTriangle(
        center.x,
        center.y - radius * 0.5,
        center.x + radius * 0.5,
        center.y,
        center.x,
        center.y + radius * 0.5,
      );
    }
  }
}

interface PhaserBattlefieldCanvasProps {
  readonly session: GameSession;
  readonly preview: PreviewTrajectory | null;
  readonly theme: 'spring' | 'winter';
}

export function PhaserBattlefieldCanvas({
  session,
  preview,
  theme,
}: PhaserBattlefieldCanvasProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewStore = useRef<PreviewStore>({ current: preview });

  useEffect(() => {
    previewStore.current.current = preview;
  }, [preview]);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#dff0cc',
      scene: [BattlefieldScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 900,
        height: 520,
      },
      render: { antialias: true, roundPixels: true },
    });
    game.scene.start('battlefield-scene', { session, previewStore: previewStore.current, theme });
    session.start();
    return () => {
      session.dispose();
      game.destroy(true);
    };
  }, [session, theme]);

  return <div className="phaser-mount" ref={containerRef} aria-label="Chiến trường SnowGraph" />;
}
