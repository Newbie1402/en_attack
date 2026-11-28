import { describe, expect, it } from 'vitest';

import { firstLevel, foundationLevelSchema } from './foundation';

describe('Phase 00 foundation contracts', () => {
  it('validates the square campaign board contract', () => {
    expect(firstLevel.board).toEqual({ columns: 10, rows: 5 });
    expect(foundationLevelSchema.safeParse(firstLevel).success).toBe(true);
  });

  it('rejects a malformed level at the boundary', () => {
    expect(
      foundationLevelSchema.safeParse({
        id: 'debug',
        board: { columns: 1000, rows: 5 },
        deploymentColumns: 0,
      }).success,
    ).toBe(false);
  });
});
