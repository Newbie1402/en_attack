export type FormulaErrorCode =
  | 'EMPTY'
  | 'TOO_LONG'
  | 'INVALID_CHARACTERS'
  | 'TOKEN_LIMIT'
  | 'NESTING_LIMIT'
  | 'SYNTAX'
  | 'UNSUPPORTED'
  | 'COMPLEXITY'
  | 'ORIGIN'
  | 'DOMAIN'
  | 'NO_PATH';

export type FormulaFamily =
  | 'constant'
  | 'linear'
  | 'quadratic'
  | 'polynomial-other'
  | 'trig'
  | 'rational'
  | 'radical'
  | 'exponential-log'
  | 'mixed-other';

export type BinaryOperator = 'add' | 'subtract' | 'multiply' | 'divide' | 'power';

export type UnaryOperator = 'plus' | 'minus';

export type FunctionName = 'sin' | 'cos' | 'tan' | 'abs' | 'sqrt' | 'exp' | 'log';

export type Expression =
  | Readonly<{ kind: 'constant'; value: number }>
  | Readonly<{ kind: 'variable' }>
  | Readonly<{ kind: 'binary'; operator: BinaryOperator; left: Expression; right: Expression }>
  | Readonly<{ kind: 'unary'; operator: UnaryOperator; operand: Expression }>
  | Readonly<{ kind: 'function'; name: FunctionName; argument: Expression }>;

export interface ValidatedFormula {
  readonly source: string;
  readonly normalized: string;
  readonly expression: Expression;
  readonly canonicalKey: string;
  readonly family: FormulaFamily;
}

export type FormulaResult =
  | Readonly<{ ok: true; formula: ValidatedFormula }>
  | Readonly<{ ok: false; code: FormulaErrorCode; messageKey: string }>;

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export type TrajectoryEnd = 'edge' | 'domain' | 'budget' | 'range';

export interface SampledTrajectory {
  readonly points: readonly Vec2[];
  readonly end: TrajectoryEnd;
}

export interface SamplerOptions {
  readonly maxU?: number;
  readonly minV?: number;
  readonly maxV?: number;
  readonly baseStep?: number;
}
