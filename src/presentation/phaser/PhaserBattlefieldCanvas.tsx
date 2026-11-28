import { useEffect, useRef, type PointerEvent } from 'react';
import Phaser from 'phaser';

import {
  cellCenter,
  createScreenLayout,
  isDeployable,
  screenToWorld,
  worldToScreen,
} from '../../game/domain/board/board';
import type { Cell } from '../../game/domain/board/board';
import type {
  EnemyState,
  SimulationEvent,
  SimulationState,
  UnitKind,
  UnitState,
} from '../../game/domain/simulation/types';
import type { GameSession } from '../../game/application/session';
import type { Vec2 } from '../../game/domain/math/types';
import { runtimeAssetManifest } from '../assets/assetManifest';

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
  readonly interactionStore: InteractionStore;
}

interface InteractionStore {
  placementKind: UnitKind | null;
  relocationUnitId: string | null;
  onBoardCell: (cell: Cell) => void;
  cancel: () => void;
}

class BattlefieldScene extends Phaser.Scene {
  private session: GameSession | null = null;

  private unsubscribe: (() => void) | null = null;

  private state: SimulationState | null = null;

  private graphics: Phaser.GameObjects.Graphics | null = null;

  private title: Phaser.GameObjects.Text | null = null;

  private previewStore: PreviewStore | null = null;

  private theme: 'spring' | 'winter' = 'spring';

  private interactionStore: InteractionStore | null = null;

  private hoverCell: Cell | null = null;

  private placementGhost: Phaser.GameObjects.Image | null = null;

  private readonly unitSprites = new Map<string, Phaser.GameObjects.Image>();

  private readonly enemySprites = new Map<string, Phaser.GameObjects.Image>();

  private readonly pickupSprites = new Map<string, Phaser.GameObjects.Image>();

  private readonly projectileSprites = new Map<string, Phaser.GameObjects.Image>();

  private readonly collectingPickups = new Map<string, Phaser.GameObjects.Image>();

  private readonly terrainSprites = new Map<string, Phaser.GameObjects.Image>();

  private readonly effectSprites = new Set<Phaser.GameObjects.Sprite>();

  private readonly unitFrames = new Map<string, number>();

  private environmentSprite: Phaser.GameObjects.Image | null = null;

  private scenicStripSprite: Phaser.GameObjects.Image | null = null;

  private musicStarted = false;

  public constructor() {
    super('battlefield-scene');
  }

  public init(data: BattlefieldSceneData): void {
    this.session = data.session;
    this.previewStore = data.previewStore;
    this.theme = data.theme;
    this.interactionStore = data.interactionStore;
    this.state = data.session.getState();
  }

  public preload(): void {
    for (const asset of runtimeAssetManifest) {
      if (asset.kind === 'svg') {
        this.load.svg(asset.key, asset.file, { width: asset.width, height: asset.height });
      } else if (asset.kind === 'spritesheet') {
        this.load.spritesheet(asset.key, asset.file, {
          frameWidth: asset.frameWidth ?? asset.width,
          frameHeight: asset.frameHeight ?? asset.height,
        });
      } else if (asset.kind === 'audio') {
        this.load.audio(asset.key, asset.file);
      } else {
        this.load.image(asset.key, asset.file);
      }
    }
  }

  public create(): void {
    if (this.session === null) return;
    this.createAssetAnimations();
    this.graphics = this.add.graphics();
    this.environmentSprite = this.add
      .image(
        0,
        0,
        this.theme === 'winter' ? 'environment-winter-fallback' : 'environment-spring-fallback',
      )
      .setOrigin(0, 0)
      .setDepth(-2)
      .setAlpha(0.58);
    this.scenicStripSprite = this.add
      .image(0, 0, this.theme === 'winter' ? 'scenic-winter' : 'scenic-spring')
      .setOrigin(0, 0)
      .setDepth(-1)
      .setAlpha(0.82);
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
    this.input.on('pointermove', this.handlePointerMove, this);
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
    this.input.off('pointermove', this.handlePointerMove, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.renderScene, this);
    this.destroySprites(this.unitSprites);
    this.destroySprites(this.enemySprites);
    this.destroySprites(this.pickupSprites);
    this.destroySprites(this.projectileSprites);
    this.destroySprites(this.collectingPickups);
    this.destroySprites(this.terrainSprites);
    for (const sprite of this.effectSprites) sprite.destroy();
    this.effectSprites.clear();
    this.unitFrames.clear();
    this.environmentSprite?.destroy();
    this.environmentSprite = null;
    this.scenicStripSprite?.destroy();
    this.scenicStripSprite = null;
    this.sound.stopByKey('audio-music-garden');
    this.musicStarted = false;
    this.placementGhost?.destroy();
    this.placementGhost = null;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const state = this.state;
    if (state === null || this.interactionStore === null) return;
    const layout = this.createLayout();
    const world = screenToWorld({ x: pointer.x, y: pointer.y }, state.board, layout);
    this.hoverCell = {
      col: Math.floor(world.x),
      row: Math.floor(world.y),
    };
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.startMusic();
    const state = this.state;
    const session = this.session;
    if (state === null || session === null) return;
    const layout = this.createLayout();
    const world = screenToWorld({ x: pointer.x, y: pointer.y }, state.board, layout);
    const interaction = this.interactionStore;
    if (pointer.rightButtonDown() && interaction !== null) {
      interaction.cancel();
      return;
    }
    if (
      interaction !== null &&
      (interaction.placementKind !== null || interaction.relocationUnitId !== null)
    ) {
      interaction.onBoardCell({ col: Math.floor(world.x), row: Math.floor(world.y) });
      return;
    }
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

  private createLayout(): ReturnType<typeof createScreenLayout> {
    const state = this.state;
    const baseLayout = createScreenLayout(
      state?.board ?? { columns: 10, rows: 5, deploymentColumns: 3, obstacles: [] },
      this.scale.width - 40,
      this.scale.height - 86,
    );
    return {
      ...baseLayout,
      boardLeft: baseLayout.boardLeft + 20,
      boardTop: baseLayout.boardTop + 58,
    };
  }

  private renderScene(): void {
    const state = this.state;
    const graphics = this.graphics;
    if (state === null || graphics === null) return;
    const width = this.scale.width;
    const height = this.scale.height;
    const layout = this.createLayout();
    this.environmentSprite?.setPosition(0, 0).setDisplaySize(width, height);
    this.scenicStripSprite
      ?.setPosition(0, Math.max(0, layout.boardTop - layout.cellPx * 1.2))
      .setDisplaySize(width, Math.max(80, layout.cellPx * 1.05));
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
        const variation = (col * 17 + row * 29) % 3;
        const color =
          this.theme === 'winter'
            ? ([0xcfe4df, 0xc7ded8, 0xd6e9e0][variation] ?? 0xcfe4df)
            : ([0xb9d487, 0xb2cf7d, 0xc0d991][variation] ?? 0xb9d487);
        graphics.fillStyle(color, 1);
        const tileTop = layout.boardTop + (state.board.rows - row - 1) * layout.cellPx;
        graphics.fillRect(
          layout.boardLeft + col * layout.cellPx + 1,
          tileTop + 1,
          layout.cellPx - 2,
          layout.cellPx - 2,
        );
        if (this.theme === 'winter') {
          graphics.fillStyle(0xffffff, 0.28);
          graphics.fillCircle(
            layout.boardLeft + col * layout.cellPx + layout.cellPx * (0.22 + variation * 0.18),
            tileTop + layout.cellPx * 0.28,
            layout.cellPx * 0.035,
          );
          graphics.fillCircle(
            layout.boardLeft + col * layout.cellPx + layout.cellPx * 0.72,
            tileTop + layout.cellPx * 0.7,
            layout.cellPx * 0.025,
          );
        } else {
          graphics.lineStyle(1.5, 0x6e9b5b, 0.24);
          const tuftX =
            layout.boardLeft + col * layout.cellPx + layout.cellPx * (0.22 + variation * 0.16);
          const tuftY = tileTop + layout.cellPx * 0.76;
          graphics.lineBetween(tuftX, tuftY, tuftX - 3, tuftY - layout.cellPx * 0.12);
          graphics.lineBetween(tuftX, tuftY, tuftX + 4, tuftY - layout.cellPx * 0.16);
          if ((col + row) % 4 === 0) {
            graphics.fillStyle(0xf49a87, 0.72);
            graphics.fillCircle(
              layout.boardLeft + col * layout.cellPx + layout.cellPx * 0.72,
              tileTop + layout.cellPx * 0.3,
              layout.cellPx * 0.035,
            );
          }
        }
      }
    }
    this.syncTerrainSprites(state, layout);
    graphics.lineStyle(1, this.theme === 'winter' ? 0xf2fbf5 : 0xeff4d8, 0.22);
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
    this.drawPlacementOverlay(graphics, state, layout);
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
          this.unitFrames.set(event.unitId, 2);
          if (sprite.texture.key.includes('-poses')) sprite.setFrame(2);
          this.tweens.add({
            targets: sprite,
            scaleX: 0.88,
            scaleY: 0.88,
            duration: 80,
            yoyo: true,
            ease: 'Sine.easeOut',
          });
          this.time.delayedCall(110, () => {
            const current = this.unitSprites.get(event.unitId);
            if (current !== undefined && current.texture.key.includes('-poses')) {
              this.unitFrames.set(event.unitId, 3);
              current.setFrame(3);
            }
          });
          this.time.delayedCall(240, () => {
            const current = this.unitSprites.get(event.unitId);
            if (current !== undefined && current.texture.key.includes('-poses')) {
              this.unitFrames.set(event.unitId, 0);
              current.setFrame(0);
            }
          });
        }
        this.playSound('audio-sfx-throw');
      }
      if (event.type === 'hit') {
        const sprite = this.enemySprites.get(event.enemyId);
        if (sprite !== undefined) {
          sprite.setTint(event.blocked ? 0xf5c96a : 0xffffff);
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
              .text(
                point.x,
                point.y - layout.cellPx * 0.55,
                event.blocked && event.damage === 0 ? 'CHẶN' : `-${Math.round(event.damage)}`,
                {
                  color: '#fff8e8',
                  fontFamily: 'Trebuchet MS, sans-serif',
                  fontSize: `${Math.max(13, layout.cellPx * 0.18)}px`,
                  fontStyle: 'bold',
                  stroke: '#a94e3b',
                  strokeThickness: 4,
                },
              )
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
            this.playEffectAt(
              event.blocked ? 'vfx-shield' : 'vfx-hit',
              point,
              layout.cellPx * 0.52,
            );
          }
        }
        this.playSound(event.blocked ? 'audio-sfx-armor-break' : 'audio-sfx-impact');
      }
      if (event.type === 'pickupCollected') {
        this.animatePickupCollection(event.pickupId);
        this.playSound('audio-sfx-pickup');
      }
      if (event.type === 'skillActivated') {
        this.playSound(event.skill === 'freeze' ? 'audio-sfx-freeze' : 'audio-sfx-select');
      }
      if (event.type === 'enemyDefeated') this.playSound('audio-sfx-defeat');
      if (event.type === 'matchEnded') {
        this.playSound(event.result === 'won' ? 'audio-sfx-victory' : 'audio-sfx-defeat');
      }
    }
  }

  private createAssetAnimations(): void {
    for (const key of [
      'vfx-hit',
      'vfx-freeze',
      'vfx-armor-break',
      'vfx-shield',
      'vfx-defeat',
      'vfx-pickup-sparkle',
    ]) {
      if (!this.textures.exists(key) || this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: 5 }),
        frameRate: 20,
        repeat: 0,
      });
    }
  }

  private playSound(key: string): void {
    if (this.sound.locked || !this.cache.audio.exists(key)) return;
    this.sound.play(key, { volume: 0.28 });
  }

  private startMusic(): void {
    if (this.musicStarted || this.sound.locked || !this.cache.audio.exists('audio-music-garden')) {
      return;
    }
    this.sound.play('audio-music-garden', { loop: true, volume: 0.1 });
    this.musicStarted = true;
  }

  private playEffectAt(
    key: string,
    point: { readonly x: number; readonly y: number },
    size: number,
  ): void {
    if (!this.anims.exists(key)) return;
    const effect = this.add
      .sprite(point.x, point.y, key, 0)
      .setDepth(15)
      .setDisplaySize(size, size);
    this.effectSprites.add(effect);
    effect.play(key);
    this.time.delayedCall(360, () => {
      effect.destroy();
      this.effectSprites.delete(effect);
    });
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

  private drawPlacementOverlay(
    graphics: Phaser.GameObjects.Graphics,
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    const interaction = this.interactionStore;
    if (
      interaction === null ||
      (interaction.placementKind === null && interaction.relocationUnitId === null)
    ) {
      this.placementGhost?.setVisible(false);
      return;
    }
    const movingUnit =
      interaction.relocationUnitId === null
        ? null
        : (state.units.find((unit) => unit.id === interaction.relocationUnitId) ?? null);
    const occupied = new Set(
      state.units
        .filter((unit) => unit.id !== movingUnit?.id)
        .map((unit) => `${unit.cell.col}:${unit.cell.row}`),
    );
    for (let row = 0; row < state.board.rows; row += 1) {
      for (let col = 0; col < state.board.columns; col += 1) {
        const cell = { col, row };
        const occupiedCell = occupied.has(`${col}:${row}`);
        const blockedByObstacle = state.board.obstacles.some(
          (obstacle) =>
            col + 0.5 > obstacle.minX &&
            col + 0.5 < obstacle.maxX &&
            row + 0.5 > obstacle.minY &&
            row + 0.5 < obstacle.maxY,
        );
        const valid = isDeployable(cell, state.board) && !occupiedCell && !blockedByObstacle;
        const topLeft = worldToScreen({ x: col, y: row + 1 }, state.board, layout);
        graphics.fillStyle(valid ? 0x7ccf94 : 0xd67c70, valid ? 0.18 : 0.08);
        graphics.fillRect(topLeft.x + 4, topLeft.y + 4, layout.cellPx - 8, layout.cellPx - 8);
      }
    }
    const hover = this.hoverCell;
    if (hover === null || hover.col < 0 || hover.row < 0) return;
    const hoverValid =
      isDeployable(hover, state.board) && !occupied.has(`${hover.col}:${hover.row}`);
    const hoverTopLeft = worldToScreen({ x: hover.col, y: hover.row + 1 }, state.board, layout);
    graphics.lineStyle(3, hoverValid ? 0x54b77d : 0xd95c5c, 0.95);
    graphics.strokeRect(
      hoverTopLeft.x + 4,
      hoverTopLeft.y + 4,
      layout.cellPx - 8,
      layout.cellPx - 8,
    );
    if (interaction.placementKind === null || !hoverValid) {
      this.placementGhost?.setVisible(false);
      return;
    }
    const authoredKey = this.unitAssetKey(interaction.placementKind);
    const key = this.textures.exists(authoredKey)
      ? authoredKey
      : this.unitFallbackKey(interaction.placementKind);
    if (this.placementGhost === null) {
      this.placementGhost = this.add.image(0, 0, key).setOrigin(0.5).setDepth(5);
    }
    if (this.placementGhost.texture.key !== key) this.placementGhost.setTexture(key);
    const center = worldToScreen(cellCenter(hover), state.board, layout);
    this.placementGhost
      .setVisible(true)
      .setPosition(center.x, center.y)
      .setDisplaySize(layout.cellPx * 0.7, layout.cellPx * 0.7)
      .setAlpha(0.58);
  }

  private syncUnitSprites(
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    const active = new Set<string>();
    for (const unit of state.units) {
      active.add(unit.id);
      const authoredKey = this.unitAssetKey(unit.kind);
      const key = this.textures.exists(authoredKey) ? authoredKey : this.unitFallbackKey(unit.kind);
      const authored = key === authoredKey;
      let sprite = this.unitSprites.get(unit.id);
      if (sprite === undefined) {
        sprite = this.add
          .image(0, 0, key)
          .setOrigin(authored ? 0.5 : 0.5, authored ? 0.92 : 0.5)
          .setDepth(7);
        this.unitSprites.set(unit.id, sprite);
      }
      if (sprite.texture.key !== key) sprite.setTexture(key);
      if (authored && sprite.texture.key.includes('-poses')) {
        sprite.setFrame(this.unitFrames.get(unit.id) ?? 0);
      }
      const center = worldToScreen(cellCenter(unit.cell), state.board, layout);
      const bob =
        unit.kind === 'nest' ? Math.sin(state.tick / 18) * 1.5 : Math.sin(state.tick / 8) * 2.5;
      const width = layout.cellPx * (unit.kind === 'heavy' ? 0.86 : 0.78);
      sprite.setPosition(center.x, center.y + bob + (authored ? layout.cellPx * 0.24 : 0));
      sprite.setDisplaySize(width, authored ? width : width * 0.8);
      sprite.setAlpha(
        unit.attackState === 'COOLDOWN' ? 0.74 : unit.assignedFormula === null ? 0.84 : 1,
      );
      if (unit.attackState === 'FORMULA_LOCKED') sprite.setTint(0xff9c8a);
      else sprite.clearTint();
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
      const authoredKey = this.enemyAssetKey(enemy.kind);
      const key = this.textures.exists(authoredKey) ? authoredKey : `enemy-${enemy.kind}-fallback`;
      const authored = key === authoredKey;
      let sprite = this.enemySprites.get(enemy.id);
      if (sprite === undefined) {
        sprite = this.add
          .image(0, 0, key)
          .setOrigin(0.5, authored ? 0.92 : 0.5)
          .setDepth(6);
        this.enemySprites.set(enemy.id, sprite);
      }
      if (sprite.texture.key !== key) sprite.setTexture(key);
      const center = worldToScreen(enemy.position, state.board, layout);
      const size = authored
        ? layout.cellPx * (enemy.kind === 'guardian' ? 1.06 : 0.82)
        : layout.cellPx * (enemy.kind === 'guardian' ? 1.06 : enemy.radius * 2.35);
      const bob = enemy.kind === 'raven' ? Math.sin(state.tick / 7 + enemy.position.x) * 4 : 0;
      sprite.setPosition(center.x, center.y + bob + (authored ? layout.cellPx * 0.2 : 0));
      sprite.setDisplaySize(size, authored ? size : size * 0.88);
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
      const pickupKey = pickup.kind === 'energy' ? 'energy' : this.pickupSkillKey(pickup.skill);
      const authoredKey = `pickup-${pickupKey}-authored`;
      const key = this.textures.exists(authoredKey)
        ? authoredKey
        : this.unitPickupFallbackKey(pickup.kind);
      const authored = key === authoredKey;
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
      const size = layout.cellPx * (authored ? 0.42 : 0.34) * pulse;
      sprite.setDisplaySize(size, size);
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
      const unit = state.units.find((current) => current.id === projectile.unitId);
      const kind = unit?.kind === 'frost' ? 'frost' : unit?.kind === 'heavy' ? 'heavy' : 'normal';
      const authoredKey = `projectile-snowball-${kind}`;
      const key = this.textures.exists(authoredKey) ? authoredKey : 'projectile-snowball-fallback';
      let sprite = this.projectileSprites.get(projectile.id);
      if (sprite === undefined) {
        sprite = this.add.image(0, 0, key).setOrigin(0.5).setDepth(10);
        this.projectileSprites.set(projectile.id, sprite);
      }
      if (sprite.texture.key !== key) sprite.setTexture(key);
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
      if (unit.id === state.selectedUnitId) {
        graphics.lineStyle(3, 0xf3b54b, 0.95);
        graphics.strokeCircle(center.x, center.y, layout.cellPx * 0.4);
      }
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
      graphics.fillStyle(0x273449, 0.9);
      graphics.fillRoundedRect(center.x - radius, center.y - radius * 1.26, radius * 2, 6, 3);
      graphics.fillStyle(enemy.kind === 'guardian' ? 0xf1b84b : 0xe85b57, 1);
      graphics.fillRoundedRect(
        center.x - radius,
        center.y - radius * 1.26,
        radius * 2 * Math.max(0, enemy.health / enemy.maxHealth),
        6,
        3,
      );
      if (enemy.maxArmor > 0) {
        graphics.fillStyle(0x35485c, 0.9);
        graphics.fillRoundedRect(center.x - radius, center.y - radius * 1.26 - 8, radius * 2, 4, 2);
        graphics.fillStyle(0xd5b45e, 1);
        graphics.fillRoundedRect(
          center.x - radius,
          center.y - radius * 1.26 - 8,
          radius * 2 * Math.max(0, enemy.armor / enemy.maxArmor),
          4,
          2,
        );
      }
      if (enemy.maxShield > 0) {
        graphics.fillStyle(0x6cc4db, 0.95);
        graphics.lineStyle(2, 0xb8eff7, 0.85);
        graphics.strokeCircle(center.x, center.y, radius * 1.2);
      }
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

  private syncTerrainSprites(
    state: SimulationState,
    layout: ReturnType<typeof createScreenLayout>,
  ): void {
    const active = new Set<string>();
    for (let row = 0; row < state.board.rows; row += 1) {
      for (let col = 0; col < state.board.columns; col += 1) {
        const id = `${col}:${row}`;
        active.add(id);
        const variant = ((col * 17 + row * 29) % 6) + 1;
        const key = `tile-${this.theme}-${variant}`;
        if (!this.textures.exists(key)) continue;
        let sprite = this.terrainSprites.get(id);
        if (sprite === undefined) {
          sprite = this.add.image(0, 0, key).setOrigin(0.5).setDepth(0.5);
          this.terrainSprites.set(id, sprite);
        }
        if (sprite.texture.key !== key) sprite.setTexture(key);
        const center = worldToScreen({ x: col + 0.5, y: row + 0.5 }, state.board, layout);
        sprite.setPosition(center.x, center.y).setDisplaySize(layout.cellPx - 2, layout.cellPx - 2);
      }
    }
    this.removeInactiveSprites(this.terrainSprites, active);
  }

  private unitAssetKey(kind: UnitKind): string {
    if (kind === 'nest') return 'nest-lucky-authored';
    return `swallow-${kind === 'snow' ? 'normal' : kind}-poses`;
  }

  private unitFallbackKey(kind: UnitKind): string {
    if (kind === 'nest') return 'nest-lucky-fallback';
    return `swallow-${kind === 'snow' ? 'normal' : kind}-fallback`;
  }

  private enemyAssetKey(kind: EnemyState['kind']): string {
    const authoredKind = kind === 'boar' ? 'boar' : kind === 'turtle' ? 'turtle' : kind;
    return `enemy-${authoredKind}-authored`;
  }

  private pickupSkillKey(skill: SimulationState['pickups'][number]['skill']): string {
    if (skill === 'doubleDamage') return 'damage';
    if (skill === 'formulaReset') return 'reset';
    return skill ?? 'skill';
  }

  private unitPickupFallbackKey(kind: SimulationState['pickups'][number]['kind']): string {
    return kind === 'energy' ? 'pickup-energy-fallback' : 'pickup-skill-fallback';
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
  readonly placementKind: UnitKind | null;
  readonly relocationUnitId: string | null;
  readonly onBoardCell: (cell: Cell) => void;
  readonly onCancel: () => void;
}

export function PhaserBattlefieldCanvas({
  session,
  preview,
  theme,
  placementKind,
  relocationUnitId,
  onBoardCell,
  onCancel,
}: PhaserBattlefieldCanvasProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewStore = useRef<PreviewStore>({ current: preview });
  const interactionStore = useRef<InteractionStore>({
    placementKind,
    relocationUnitId,
    onBoardCell,
    cancel: onCancel,
  });

  useEffect(() => {
    previewStore.current.current = preview;
  }, [preview]);

  useEffect(() => {
    interactionStore.current.placementKind = placementKind;
    interactionStore.current.relocationUnitId = relocationUnitId;
    interactionStore.current.onBoardCell = onBoardCell;
    interactionStore.current.cancel = onCancel;
  }, [onBoardCell, onCancel, placementKind, relocationUnitId]);

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
    game.scene.start('battlefield-scene', {
      session,
      previewStore: previewStore.current,
      theme,
      interactionStore: interactionStore.current,
    });
    session.start();
    return () => {
      session.dispose();
      game.destroy(true);
    };
  }, [session, theme]);

  const handlePlacementPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (placementKind === null && relocationUnitId === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const state = session.getState();
    const baseLayout = createScreenLayout(state.board, rect.width - 40, rect.height - 86);
    const layout = {
      ...baseLayout,
      boardLeft: baseLayout.boardLeft + 20,
      boardTop: baseLayout.boardTop + 58,
    };
    const world = screenToWorld(
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      state.board,
      layout,
    );
    onBoardCell({ col: Math.floor(world.x), row: Math.floor(world.y) });
    event.stopPropagation();
  };

  const handleInteractionCancel = (event: {
    preventDefault: () => void;
    stopPropagation: () => void;
  }) => {
    if (placementKind === null && relocationUnitId === null) return;
    event.preventDefault();
    onCancel();
    event.stopPropagation();
  };

  return (
    <div
      className="phaser-mount"
      ref={containerRef}
      aria-label="Chiến trường SnowGraph"
      onPointerDownCapture={handlePlacementPointerDown}
      onContextMenuCapture={handleInteractionCancel}
      onKeyDownCapture={(event) => {
        if (event.key === 'Escape') handleInteractionCancel(event);
      }}
      tabIndex={0}
    />
  );
}
