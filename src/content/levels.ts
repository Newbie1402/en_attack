import type { Obstacle } from '../game/domain/board/board';
import type { SimulationConfig } from '../game/domain/simulation/simulation';
import type { WavePhase, WaveSpawn } from '../game/domain/simulation/types';

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

function phase(
  id: string,
  title: string,
  intro: string,
  spawns: readonly WaveSpawn[],
  intermissionTicks = 90,
): WavePhase {
  return { id, title, intro, spawns, intermissionTicks };
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
      shopOffers: ['snow', 'frost', 'heavy', 'nest'],
      phases: [
        phase('l1-dawn', 'Bình minh', 'Cáo tuyết thăm dò hàng rào.', [wave(0, 'fox', 2)]),
        phase('l1-breeze', 'Gió đổi chiều', 'Một nhịp tăng tốc trước cổng tổ.', [
          wave(0, 'fox', 2),
          wave(80, 'fox', 2),
        ]),
      ],
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
      shopOffers: ['snow', 'shield', 'fire', 'nest'],
      phases: [
        phase('l2-scout', 'Thám thính', 'Cáo tuyết mở đường cho đội hình.', [
          wave(0, 'fox', 1),
          wave(80, 'rabbit', 3),
        ]),
        phase('l2-gather', 'Gom đội hình', 'Thỏ tuyết ép các làn thấp.', [
          wave(0, 'fox', 2),
          wave(80, 'rabbit', 4),
        ]),
        phase('l2-nest', 'Bảo vệ tổ', 'Đợt cuối kéo đến từ hai hướng.', [
          wave(0, 'fox', 1),
          wave(80, 'rabbit', 3),
        ]),
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
      shopOffers: ['snow', 'frost', 'heavy', 'fire'],
      phases: [
        phase('l3-stone', 'Qua tảng đá', 'Cáo tuyết giữ nhịp ở làn giữa.', [wave(0, 'fox', 2)]),
        phase('l3-armor', 'Giáp nặng', 'Lợn đá và rùa pha lê thử góc bắn.', [
          wave(0, 'boar', 1),
          wave(80, 'turtle', 2),
        ]),
        phase('l3-rebound', 'Dội lại', 'Cáo tuyết quay lại sau vật cản.', [wave(0, 'fox', 3)]),
      ],
    },
  },
  L4: {
    id: 'L4',
    title: 'Đường mòn băng giá',
    theme: 'winter',
    config: {
      board: { ...board, obstacles: [rock] },
      startingEnergy: 350,
      hearts: 3,
      seed: 1004,
      startingSkills: { slow: 1, freeze: 1 },
      startingUnits: [{ kind: 'snow', cell: { col: 1, row: 2 } }],
      shopOffers: ['frost', 'shield', 'fire', 'nest'],
      phases: [
        phase('l4-trail', 'Dấu chân lạnh', 'Quạ băng bắt đầu đổi làn.', [
          wave(0, 'fox', 0),
          wave(80, 'raven', 2),
          wave(160, 'fox', 4),
        ]),
        phase('l4-crosswind', 'Gió chéo', 'Kẻ nhảy tường vượt qua vách băng.', [
          wave(0, 'raven', 1),
          wave(80, 'wallJumper', 2),
          wave(160, 'turtle', 2),
        ]),
        phase('l4-storm', 'Bão tuyết', 'Sói băng và quạ dồn ép hàng thủ.', [
          wave(0, 'fox', 0),
          wave(80, 'raven', 4),
          wave(160, 'fox', 2),
          wave(240, 'wolf', 3),
        ]),
      ],
    },
  },
  L5: {
    id: 'L5',
    title: 'Nghĩ khác đi',
    theme: 'winter',
    config: {
      board: { ...board, obstacles: [rock] },
      startingEnergy: 350,
      hearts: 3,
      seed: 1005,
      formulaUseLimit: 3,
      quotaActive: true,
      startingSkills: { formulaReset: 1, slow: 1 },
      startingUnits: [{ kind: 'snow', cell: { col: 1, row: 2 } }],
      shopOffers: ['snow', 'fire', 'witch', 'shield'],
      phases: [
        phase('l5-cap', 'Giới hạn đường bay', 'Công thức đầu tiên mở khóa thế trận.', [
          wave(0, 'fox', 1),
          wave(100, 'boar', 3),
        ]),
        phase('l5-shield', 'Khiên băng', 'Vệ binh băng kháng đóng băng bảo vệ đoàn.', [
          wave(0, 'iceGuard', 2),
          wave(100, 'raven', 2),
        ]),
        phase('l5-last', 'Nghĩ khác đi', 'Sói và cáo buộc bạn đổi công thức.', [
          wave(0, 'wolf', 4),
          wave(80, 'fox', 4),
        ]),
      ],
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
      shopOffers: ['shield', 'fire', 'witch', 'nest'],
      phases: [
        phase('l6-gate', 'Cổng băng', 'Lợn đá mở đường cho hộ vệ.', [
          wave(0, 'fox', 2),
          wave(100, 'boar', 1),
        ]),
        phase('l6-sentinel', 'Vệ binh', 'Khiên băng kháng đóng băng giữ trung tuyến.', [
          wave(0, 'iceGuard', 2),
          wave(100, 'wallJumper', 3),
        ]),
        phase('l6-guardian', 'Hộ vệ băng giá', 'Boss bước vào pha cuối cùng.', [
          wave(0, 'guardian', 2),
          wave(180, 'raven', 3),
          wave(300, 'raven', 1),
        ]),
      ],
    },
  },
};

export function getLevelDefinition(levelId: string): LevelDefinition {
  return Object.values(levels).find((level) => level.id === levelId) ?? levels.L1;
}
