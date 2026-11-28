import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

import { createScreenLayout, worldToScreen } from '../../game/domain/board/board';
import type { EnemyState, SimulationState, UnitState } from '../../game/domain/simulation/types';
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
}

class BattlefieldScene extends Phaser.Scene {
  private session: GameSession | null = null;

  private unsubscribe: (() => void) | null = null;

  private state: SimulationState | null = null;

  private graphics: Phaser.GameObjects.Graphics | null = null;

  private title: Phaser.GameObjects.Text | null = null;

  private previewStore: PreviewStore | null = null;

  public constructor() {
    super('battlefield-scene');
  }

  public init(data: BattlefieldSceneData): void {
    this.session = data.session;
    this.previewStore = data.previewStore;
    this.state = data.session.getState();
  }

  public create(): void {
    if (this.session === null) return;
    this.graphics = this.add.graphics();
    this.title = this.add.text(24, 18, 'Vườn xuân · đường bay thực', {
      color: '#26354d',
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      fontStyle: 'bold',
    });
    this.unsubscribe = this.session.subscribe((state) => {
      this.state = state;
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
    const world = {
      x: (pointer.x - layout.boardLeft) / layout.cellPx,
      y: state.board.rows - (pointer.y - layout.boardTop) / layout.cellPx,
    };
    const pickup = state.pickups.find(
      (current) => Math.hypot(current.position.x - world.x, current.position.y - world.y) <= 0.42,
    );
    if (pickup !== undefined) session.dispatch({ type: 'collectPickup', pickupId: pickup.id });
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
    graphics.clear();

    graphics.fillStyle(0xb9d98f, 1);
    graphics.fillRoundedRect(
      layout.boardLeft - 8,
      layout.boardTop - 8,
      layout.cellPx * state.board.columns + 16,
      layout.cellPx * state.board.rows + 16,
      24,
    );
    for (let row = 0; row < state.board.rows; row += 1) {
      for (let col = 0; col < state.board.columns; col += 1) {
        const color = (row + col) % 2 === 0 ? 0xa8c982 : 0x9bc277;
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
    graphics.lineStyle(2, 0xe8f5d8, 0.7);
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
    this.drawPreview(graphics, state, layout);
    for (const unit of state.units) this.drawUnit(graphics, unit, state, layout);
    for (const enemy of state.enemies) this.drawEnemy(graphics, enemy, state, layout);
    for (const pickup of state.pickups) this.drawPickup(graphics, pickup, state, layout);
    for (const projectile of state.projectiles) {
      const local = this.pathPointAtProgress(projectile.path, projectile.progressX);
      if (local === null) continue;
      const point = worldToScreen(
        { x: projectile.origin.x + local.x, y: projectile.origin.y + local.y },
        state.board,
        layout,
      );
      graphics.fillStyle(0xfaf8ff, 1);
      graphics.fillCircle(point.x, point.y, Math.max(5, layout.cellPx * projectile.radius));
      graphics.lineStyle(4, 0xe9f7ff, 0.65);
      graphics.lineBetween(
        point.x - layout.cellPx * 0.22,
        point.y,
        point.x - layout.cellPx * 0.05,
        point.y,
      );
    }
    this.title?.setText(
      state.mode === 'running' ? `Vườn xuân · lượt ${state.tick}` : `Vườn xuân · ${state.mode}`,
    );
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
}

export function PhaserBattlefieldCanvas({
  session,
  preview,
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
    game.scene.start('battlefield-scene', { session, previewStore: previewStore.current });
    session.start();
    return () => {
      session.dispose();
      game.destroy(true);
    };
  }, [session]);

  return <div className="phaser-mount" ref={containerRef} aria-label="Chiến trường SnowGraph" />;
}
