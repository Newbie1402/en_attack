import type { Vec2 } from '../math/types';

export interface Cell {
  readonly col: number;
  readonly row: number;
}

export interface BoardConfig {
  readonly columns: number;
  readonly rows: number;
  readonly deploymentColumns: number;
  readonly obstacles: readonly Obstacle[];
}

export interface Obstacle {
  readonly id: string;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface ScreenLayout {
  readonly boardLeft: number;
  readonly boardTop: number;
  readonly cellPx: number;
}

export function cellCenter(cell: Cell): Vec2 {
  return { x: cell.col + 0.5, y: cell.row + 0.5 };
}

export function isInsideBoard(cell: Cell, board: BoardConfig): boolean {
  return cell.col >= 0 && cell.col < board.columns && cell.row >= 0 && cell.row < board.rows;
}

export function isDeployable(cell: Cell, board: BoardConfig): boolean {
  return isInsideBoard(cell, board) && cell.col < board.deploymentColumns;
}

export function sameCell(first: Cell, second: Cell): boolean {
  return first.col === second.col && first.row === second.row;
}

export function worldToScreen(world: Vec2, board: BoardConfig, layout: ScreenLayout): Vec2 {
  return {
    x: layout.boardLeft + world.x * layout.cellPx,
    y: layout.boardTop + (board.rows - world.y) * layout.cellPx,
  };
}

export function screenToWorld(screen: Vec2, board: BoardConfig, layout: ScreenLayout): Vec2 {
  return {
    x: (screen.x - layout.boardLeft) / layout.cellPx,
    y: board.rows - (screen.y - layout.boardTop) / layout.cellPx,
  };
}

export function createScreenLayout(
  board: BoardConfig,
  availableWidth: number,
  availableHeight: number,
): ScreenLayout {
  const cellPx = Math.min(availableWidth / board.columns, availableHeight / board.rows);
  return {
    boardLeft: (availableWidth - cellPx * board.columns) / 2,
    boardTop: (availableHeight - cellPx * board.rows) / 2,
    cellPx,
  };
}
