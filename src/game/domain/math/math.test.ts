import { describe, expect, it } from 'vitest';

import { evaluateExpression, validateFormula } from './engine';
import {
  behaviorallyEquivalent,
  createFormulaRegistry,
  registerFormula,
  recordFormulaUse,
} from './quota';
import { sampleTrajectory, trajectoryPointAt } from './sampler';

function formula(source: string) {
  const result = validateFormula(source);
  if (!result.ok) {
    throw new Error(`${source} rejected with ${result.code}`);
  }
  return result.formula;
}

describe('safe formula engine', () => {
  it('accepts the documented origin-safe grammar and evaluates it without JS execution', () => {
    const accepted = ['0', 'x', '2x', 'x+x', '0.6x-0.08x^2', 'sin(x)', 'cos(x)-1', 'abs(x)-x'];
    for (const source of accepted) {
      expect(validateFormula(source).ok, source).toBe(true);
    }
    expect(evaluateExpression(formula('0.5x').expression, 2)).toBe(1);
    expect(evaluateExpression(formula('cos(x)-1').expression, 0)).toBe(0);
  });

  it('canonicalizes safe polynomial aliases but preserves non-polynomial domains', () => {
    const aliases = ['2x', '2.0*x', 'x*2', 'x+x'].map((source) => formula(source).canonicalKey);
    expect(new Set(aliases).size).toBe(1);
    expect(formula('x/(x-2)').canonicalKey).not.toBe(formula('0').canonicalKey);
    expect(formula('x/(x-2)').family).toBe('rational');
  });

  it('rejects offsets, unknown symbols, scripts, and parser-bomb limits', () => {
    expect(validateFormula('x+2')).toMatchObject({ ok: false, code: 'ORIGIN' });
    expect(validateFormula('cos(x)')).toMatchObject({ ok: false, code: 'ORIGIN' });
    expect(validateFormula('unknown(x)')).toMatchObject({ ok: false, code: 'UNSUPPORTED' });
    expect(validateFormula('x; import fs')).toMatchObject({
      ok: false,
      code: 'INVALID_CHARACTERS',
    });
    expect(validateFormula('('.repeat(17) + 'x' + ')'.repeat(17))).toMatchObject({
      ok: false,
      code: 'NESTING_LIMIT',
    });
    expect(validateFormula('1e100*x')).toMatchObject({ ok: false, code: 'COMPLEXITY' });
  });
});

describe('bounded shared trajectory sampler', () => {
  it('returns the same interpolated path shape a flight can consume', () => {
    const trajectory = sampleTrajectory(formula('0.5x').expression, { maxU: 2 });
    expect(trajectory.end).toBe('edge');
    expect(trajectory.points.length).toBeGreaterThan(2);
    expect(trajectoryPointAt(trajectory.points, 1)).toEqual({ x: 1, y: 0.5 });
  });

  it('stops before rational and tangent discontinuities without bridging them', () => {
    const rational = sampleTrajectory(formula('x/(x-2)').expression, {
      maxU: 4,
      minV: -1_000_000,
      maxV: 1_000_000,
    });
    expect(rational.end).toBe('domain');
    expect(rational.points.at(-1)?.x).toBeLessThan(2);

    const squaredPole = sampleTrajectory(formula('x/(x-2)^2').expression, {
      maxU: 4,
      minV: -1_000_000,
      maxV: 1_000_000,
    });
    expect(squaredPole.end).toBe('domain');
    expect(squaredPole.points.at(-1)?.x).toBeLessThan(2);

    const tangent = sampleTrajectory(formula('tan(x)').expression, {
      maxU: 3,
      minV: -1_000_000,
      maxV: 1_000_000,
    });
    expect(tangent.end).toBe('domain');
    expect(tangent.points.at(-1)?.x).toBeLessThan(Math.PI / 2);
  });

  it('ends at a real square-root domain boundary instead of teleporting', () => {
    const trajectory = sampleTrajectory(formula('sqrt(1-x)-1').expression, { maxU: 2 });
    expect(trajectory.end).toBe('domain');
    expect(trajectory.points.at(-1)?.x).toBe(1);
    expect(trajectory.points.at(-1)?.y).toBe(-1);
  });
});

describe('bounded formula quota registry', () => {
  it('matches aliases and preserves immutable use counts', () => {
    const twoX = formula('2x');
    const xPlusX = formula('x+x');
    expect(behaviorallyEquivalent(twoX, xPlusX)).toBe(true);

    const initial = createFormulaRegistry();
    const first = registerFormula(initial, twoX);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = registerFormula(first.registry, xPlusX);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.created).toBe(false);
    expect(second.registry.buckets).toHaveLength(1);

    const used = recordFormulaUse(second.registry, second.bucket.id);
    expect(used.ok).toBe(true);
    expect(second.registry.buckets[0]?.uses).toBe(0);
    if (used.ok) expect(used.bucket.uses).toBe(1);
  });

  it('does not equate rational behavior with a constant when the domain differs', () => {
    expect(behaviorallyEquivalent(formula('x/(x-2)'), formula('0'))).toBe(false);
  });
});
