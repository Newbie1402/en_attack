import { evaluateExpression } from './engine';
import type { Expression, SampledTrajectory, SamplerOptions, Vec2 } from './types';

const DEFAULT_MAX_U = 10;
const DEFAULT_MIN_V = -5;
const DEFAULT_MAX_V = 5;
const DEFAULT_BASE_STEP = 1 / 32;
const MAX_SAMPLE_BUDGET = 4096;
const MAX_SUBDIVISION_DEPTH = 8;
const MIN_STEP = 1 / 2048;
const MAX_CHORD_ERROR = 0.025;
const MAX_SEGMENT_LENGTH = 0.2;

interface SamplePoint {
  readonly point: Vec2;
  readonly value: number;
}

interface SampleContext {
  evaluations: number;
}

function distance(left: Vec2, right: Vec2): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function pointAt(left: Vec2, right: Vec2, x: number): Vec2 {
  const ratio = (x - left.x) / (right.x - left.x);
  return { x, y: left.y + (right.y - left.y) * ratio };
}

function pointDistanceToChord(point: Vec2, left: Vec2, right: Vec2): number {
  const chordX = right.x - left.x;
  const chordY = right.y - left.y;
  const length = Math.hypot(chordX, chordY);
  if (length === 0) {
    return distance(point, left);
  }
  return (
    Math.abs(chordY * point.x - chordX * point.y + right.x * left.y - right.y * left.x) / length
  );
}

function evaluate(expression: Expression, x: number, context: SampleContext): number | null {
  context.evaluations += 1;
  if (context.evaluations > MAX_SAMPLE_BUDGET) {
    return null;
  }
  return evaluateExpression(expression, x);
}

function refineSegment(
  expression: Expression,
  left: SamplePoint,
  right: SamplePoint,
  depth: number,
  context: SampleContext,
): readonly Vec2[] | null {
  const segmentLength = distance(left.point, right.point);
  const midX = (left.point.x + right.point.x) / 2;
  const midValue = evaluate(expression, midX, context);
  if (midValue === null) {
    return null;
  }
  const middle: SamplePoint = { point: { x: midX, y: midValue }, value: midValue };
  const chordError = pointDistanceToChord(middle.point, left.point, right.point);
  const needsRefinement = chordError > MAX_CHORD_ERROR || segmentLength > MAX_SEGMENT_LENGTH;
  if (!needsRefinement) {
    return [right.point];
  }
  if (depth >= MAX_SUBDIVISION_DEPTH || right.point.x - left.point.x <= MIN_STEP) {
    return null;
  }
  const leftPoints = refineSegment(expression, left, middle, depth + 1, context);
  if (leftPoints === null) {
    return null;
  }
  const rightPoints = refineSegment(expression, middle, right, depth + 1, context);
  if (rightPoints === null) {
    return null;
  }
  return [...leftPoints, ...rightPoints];
}

function withinRange(point: Vec2, minV: number, maxV: number): boolean {
  return point.y >= minV && point.y <= maxV;
}

function clipToRange(left: Vec2, right: Vec2, minV: number, maxV: number): Vec2 {
  const candidates = [minV, maxV];
  const boundary = candidates.find((value) => (left.y - value) * (right.y - value) <= 0);
  if (boundary === undefined || right.y === left.y) {
    return right;
  }
  const ratio = (boundary - left.y) / (right.y - left.y);
  return { x: left.x + (right.x - left.x) * ratio, y: boundary };
}

export function sampleTrajectory(
  expression: Expression,
  options: SamplerOptions = {},
): SampledTrajectory {
  const maxU = options.maxU ?? DEFAULT_MAX_U;
  const minV = options.minV ?? DEFAULT_MIN_V;
  const maxV = options.maxV ?? DEFAULT_MAX_V;
  const baseStep = options.baseStep ?? DEFAULT_BASE_STEP;
  const origin: Vec2 = { x: 0, y: 0 };
  const points: Vec2[] = [origin];
  const context: SampleContext = { evaluations: 0 };
  let left: SamplePoint = { point: origin, value: 0 };

  for (let nextX = baseStep; nextX <= maxU + Number.EPSILON; nextX += baseStep) {
    const x = Math.min(nextX, maxU);
    const value = evaluate(expression, x, context);
    if (value === null) {
      return { points, end: context.evaluations > MAX_SAMPLE_BUDGET ? 'budget' : 'domain' };
    }
    const right: SamplePoint = { point: { x, y: value }, value };
    if (!withinRange(right.point, minV, maxV)) {
      const clipped = clipToRange(left.point, right.point, minV, maxV);
      points.push(clipped);
      return { points, end: 'range' };
    }
    const refined = refineSegment(expression, left, right, 0, context);
    if (refined === null) {
      return { points, end: context.evaluations > MAX_SAMPLE_BUDGET ? 'budget' : 'domain' };
    }
    points.push(...refined);
    left = right;
    if (x >= maxU) {
      return { points, end: 'edge' };
    }
  }
  return { points, end: 'edge' };
}

export function trajectoryPointAt(points: readonly Vec2[], x: number): Vec2 | null {
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined || x < first.x || x > last.x) {
    return null;
  }
  for (let index = 1; index < points.length; index += 1) {
    const right = points[index];
    const left = points[index - 1];
    if (right === undefined || left === undefined) {
      return null;
    }
    if (x <= right.x) {
      return pointAt(left, right, x);
    }
  }
  return last;
}
