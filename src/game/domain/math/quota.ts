import { evaluateExpression } from './engine';
import type { ValidatedFormula } from './types';

const FIXED_SAMPLE_COUNT = 65;
const SEEDED_SAMPLE_COUNT = 16;
const MAX_BUCKETS = 128;
const ABSOLUTE_TOLERANCE = 1e-6;
const RELATIVE_TOLERANCE = 1e-6;

export interface FormulaBucket {
  readonly id: string;
  readonly representative: ValidatedFormula;
  readonly uses: number;
}

export interface FormulaRegistry {
  readonly buckets: readonly FormulaBucket[];
  readonly maxBuckets: number;
}

export type FormulaRegistryResult =
  | Readonly<{ ok: true; registry: FormulaRegistry; bucket: FormulaBucket; created: boolean }>
  | Readonly<{ ok: false; code: 'BUCKET_LIMIT'; registry: FormulaRegistry }>;

export function createFormulaRegistry(maxBuckets = MAX_BUCKETS): FormulaRegistry {
  return { buckets: [], maxBuckets: Math.min(Math.max(1, Math.floor(maxBuckets)), MAX_BUCKETS) };
}

function nextSeed(seed: number): number {
  let value = seed | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function sampleCoordinates(maxU: number, seed: number): readonly number[] {
  const fixed = Array.from({ length: FIXED_SAMPLE_COUNT }, (_, index) => (index / 64) * maxU);
  const seeded: number[] = [];
  let state = seed;
  for (let index = 0; index < SEEDED_SAMPLE_COUNT; index += 1) {
    state = nextSeed(state);
    seeded.push((state / 0x1_0000_0000) * maxU);
  }
  return [...fixed, ...seeded];
}

export function behaviorallyEquivalent(
  first: ValidatedFormula,
  second: ValidatedFormula,
  options: Readonly<{ maxU?: number; seed?: number }> = {},
): boolean {
  if (first.canonicalKey === second.canonicalKey) {
    return true;
  }
  const maxU = options.maxU ?? 10;
  const seed = options.seed ?? 0x5eed;
  let finiteComparisons = 0;
  for (const x of sampleCoordinates(maxU, seed)) {
    const firstValue = evaluateExpression(first.expression, x);
    const secondValue = evaluateExpression(second.expression, x);
    if (firstValue === null || secondValue === null) {
      if (firstValue !== null || secondValue !== null) {
        return false;
      }
      continue;
    }
    finiteComparisons += 1;
    const tolerance =
      ABSOLUTE_TOLERANCE +
      RELATIVE_TOLERANCE * Math.max(Math.abs(firstValue), Math.abs(secondValue));
    if (Math.abs(firstValue - secondValue) > tolerance) {
      return false;
    }
  }
  return finiteComparisons >= SEEDED_SAMPLE_COUNT;
}

export function registerFormula(
  registry: FormulaRegistry,
  formula: ValidatedFormula,
  options: Readonly<{ maxU?: number; seed?: number }> = {},
): FormulaRegistryResult {
  const existing = registry.buckets.find(
    (bucket) =>
      bucket.representative.canonicalKey === formula.canonicalKey ||
      behaviorallyEquivalent(bucket.representative, formula, options),
  );
  if (existing !== undefined) {
    return { ok: true, registry, bucket: existing, created: false };
  }
  if (registry.buckets.length >= registry.maxBuckets) {
    return { ok: false, code: 'BUCKET_LIMIT', registry };
  }
  const bucket: FormulaBucket = {
    id: `formula-${registry.buckets.length + 1}`,
    representative: formula,
    uses: 0,
  };
  const nextRegistry: FormulaRegistry = {
    ...registry,
    buckets: [...registry.buckets, bucket],
  };
  return { ok: true, registry: nextRegistry, bucket, created: true };
}

export function recordFormulaUse(
  registry: FormulaRegistry,
  bucketId: string,
):
  | Readonly<{ ok: true; registry: FormulaRegistry; bucket: FormulaBucket }>
  | Readonly<{ ok: false }> {
  const index = registry.buckets.findIndex((bucket) => bucket.id === bucketId);
  if (index < 0) {
    return { ok: false };
  }
  const bucket = registry.buckets[index];
  if (bucket === undefined) {
    return { ok: false };
  }
  const nextBucket = { ...bucket, uses: bucket.uses + 1 };
  const buckets = registry.buckets.map((current, currentIndex) =>
    currentIndex === index ? nextBucket : current,
  );
  return { ok: true, registry: { ...registry, buckets }, bucket: nextBucket };
}

export function resetFormulaBucket(
  registry: FormulaRegistry,
  bucketId: string,
):
  | Readonly<{ ok: true; registry: FormulaRegistry; bucket: FormulaBucket }>
  | Readonly<{ ok: false }> {
  const index = registry.buckets.findIndex((bucket) => bucket.id === bucketId);
  if (index < 0) return { ok: false };
  const bucket = registry.buckets[index];
  if (bucket === undefined || bucket.uses === 0) return { ok: false };
  const nextBucket = { ...bucket, uses: 0 };
  const buckets = registry.buckets.map((current, currentIndex) =>
    currentIndex === index ? nextBucket : current,
  );
  return { ok: true, registry: { ...registry, buckets }, bucket: nextBucket };
}
