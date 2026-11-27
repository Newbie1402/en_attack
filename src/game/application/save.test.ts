import { describe, expect, it } from 'vitest';

import { defaultSave, markLevelWon, readSave, writeSave } from './save';

function storage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
}

describe('versioned local save', () => {
  it('recovers malformed data and unlocks only the next level after a win', () => {
    const local = storage();
    local.setItem('snowgraph-save-v1', '{bad');
    expect(readSave(local)).toEqual(defaultSave);

    const won = markLevelWon(defaultSave, 'L1');
    expect(won.wonLevels).toEqual(['L1']);
    expect(won.unlockedLevels).toEqual(['L1', 'L2']);
    writeSave(won, local);
    expect(readSave(local)).toEqual(won);
  });
});
