import type { Obstacle } from '../game/domain/board/board';
import type { SimulationConfig } from '../game/domain/simulation/simulation';
import type { WaveSpawn } from '../game/domain/simulation/types';

export type LevelId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';

export interface LevelDefinition {
  readonly id: LevelId;
  readonly title: string;
  readonly theme: 'spring' | 'winter';
  readonly config: SimulationConfig;
}

const board = { columns: 10, rows: 5, deploymentColumns: 3 } as const;

function wave(tick: number, kind: WaveSpawn['kind'], lane: number, x = 9.5): WaveSpawn {
  return { tick, kind, lane, x };
}

const rock: Obstacle = { id: 'rock-1', minX: 4.1, minY: 1.9, maxX: 4.8, maxY: 3.1 };

export const levels: Readonly<Record<LevelId, LevelDefinition>> = {
  L1: {
    id: 'L1',
    title: 'Chuyến bay đầu tiên',
    theme: 'spring',
    config: {
      board,
      startingEnergy: 200,
      hearts: 3,
      seed: 1001,
      startingUnits: [{ kind: 'snow', cell: { col: 1, row: 2 } }],
      waves: [wave(0, 'fox', 2), wave(140, 'fox', 2), wave(280, 'fox', 2)],
    },
  },
  L2: {
    id: 'L2',
    title: 'Tổ may mắn',
    theme: 'spring',
    config: {
      board,
      startingEnergy: 300,
      hearts: 3,
      seed: 1002,
      startingUnits: [{ kind: 'snow', cell: { col: 1, row: 2 } }],
      waves: [
        wave(0, 'fox', 1),
        wave(80, 'fox', 3),
        wave(160, 'fox', 2),
        wave(240, 'fox', 4),
        wave(320, 'fox', 1),
        wave(400, 'fox', 3),
      ],
    },
  },
  L3: {
    id: 'L3',
    title: 'Vòng qua tảng đá',
    theme: 'spring',
    config: {
      board: { ...board, obstacles: [rock] },
      startingEnergy: 300,
      hearts: 3,
      seed: 1003,
      startingUnits: [{ kind: 'snow', cell: { col: 1, row: 2 } }],
      waves: [wave(0, 'fox', 2), wave(100, 'fox', 1), wave(200, 'boar', 2), wave(300, 'fox', 3)],
    },
  },
  L4: {
    id: 'L4',
    title: 'Đường mòn băng giá',
    theme: 'winter',
    config: {
      board,
      startingEnergy: 350,
      hearts: 3,
      seed: 1004,
      startingSkills: { slow: 1, freeze: 1 },
      startingUnits: [{ kind: 'snow', cell: { col: 1, row: 2 } }],
      waves: [
        wave(0, 'fox', 0),
        wave(80, 'raven', 2),
        wave(160, 'fox', 4),
        wave(240, 'raven', 1),
        wave(320, 'fox', 3),
        wave(400, 'boar', 2),
        wave(480, 'fox', 0),
        wave(560, 'raven', 4),
        wave(640, 'fox', 2),
        wave(720, 'boar', 3),
      ],
    },
  },
  L5: {
    id: 'L5',
    title: 'Nghĩ khác đi',
    theme: 'winter',
    config: {
      board,
      startingEnergy: 350,
      hearts: 3,
      seed: 1005,
      formulaUseLimit: 3,
      quotaActive: true,
      startingSkills: { formulaReset: 1, slow: 1 },
      startingUnits: [{ kind: 'snow', cell: { col: 1, row: 2 } }],
      waves: [wave(0, 'fox', 1), wave(100, 'boar', 3), wave(200, 'raven', 2), wave(360, 'fox', 4)],
    },
  },
  L6: {
    id: 'L6',
    title: 'Hộ vệ băng giá',
    theme: 'winter',
    config: {
      board: { ...board, obstacles: [rock] },
      startingEnergy: 400,
      hearts: 3,
      seed: 1006,
      formulaUseLimit: 3,
      quotaActive: false,
      startingSkills: { formulaReset: 1, freeze: 1 },
      startingUnits: [{ kind: 'snow', cell: { col: 1, row: 2 } }],
      waves: [
        wave(0, 'fox', 2),
        wave(180, 'boar', 1),
        wave(360, 'guardian', 2),
        wave(540, 'raven', 3),
        wave(660, 'raven', 1),
      ],
    },
  },
};

export function getLevelDefinition(levelId: string): LevelDefinition {
  return Object.values(levels).find((level) => level.id === levelId) ?? levels.L1;
}
