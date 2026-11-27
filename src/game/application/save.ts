import { z } from 'zod';

const saveKey = 'snowgraph-save-v1';

const saveSchema = z.object({
  version: z.literal(1),
  unlockedLevels: z.array(z.string()).max(6),
  wonLevels: z.array(z.string()).max(6),
  language: z.enum(['vi', 'en']),
  muted: z.boolean(),
  reducedMotion: z.boolean(),
  hints: z.boolean(),
});

export type GameSave = z.infer<typeof saveSchema>;

export const defaultSave: GameSave = {
  version: 1,
  unlockedLevels: ['L1'],
  wonLevels: [],
  language: 'vi',
  muted: false,
  reducedMotion: false,
  hints: true,
};

const levelOrder = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

export function readSave(storage: Storage | undefined = globalThis.localStorage): GameSave {
  try {
    const raw = storage?.getItem(saveKey);
    if (raw === null || raw === undefined) return defaultSave;
    const parsed = saveSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultSave;
  } catch {
    return defaultSave;
  }
}

export function writeSave(
  save: GameSave,
  storage: Storage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(saveKey, JSON.stringify(save));
  } catch {
    // Private browsing and quota errors must not stop a match.
  }
}

export function markLevelWon(save: GameSave, levelId: string): GameSave {
  const wonLevels = save.wonLevels.includes(levelId)
    ? save.wonLevels
    : [...save.wonLevels, levelId];
  const nextLevel = levelOrder[levelOrder.indexOf(levelId) + 1];
  const unlockedLevels =
    nextLevel === undefined || save.unlockedLevels.includes(nextLevel)
      ? save.unlockedLevels
      : [...save.unlockedLevels, nextLevel];
  return { ...save, wonLevels, unlockedLevels };
}
