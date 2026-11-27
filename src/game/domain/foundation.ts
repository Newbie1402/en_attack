import { z } from 'zod';

export const levelIdSchema = z.enum(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']);

export const foundationLevelSchema = z.object({
  id: levelIdSchema,
  board: z.object({ columns: z.literal(10), rows: z.literal(5) }),
  deploymentColumns: z.number().int().min(1).max(10),
});

export type FoundationLevel = z.infer<typeof foundationLevelSchema>;

export const firstLevel: FoundationLevel = foundationLevelSchema.parse({
  id: 'L1',
  board: { columns: 10, rows: 5 },
  deploymentColumns: 3,
});
