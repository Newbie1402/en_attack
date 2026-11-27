import {
  parse,
  type ConstantNode,
  type FunctionNode,
  type MathNode,
  type OperatorNode,
  type ParenthesisNode,
  type SymbolNode,
} from 'mathjs';

import type {
  BinaryOperator,
  Expression,
  FormulaErrorCode,
  FormulaFamily,
  FormulaResult,
  FunctionName,
  ValidatedFormula,
} from './types';

const MAX_SOURCE_LENGTH = 160;
const MAX_TOKENS = 96;
const MAX_NESTING = 16;
const MAX_NODES = 96;
const MAX_ABS_VALUE = 1_000_000;
const MAX_POWER = 32;
const ORIGIN_EPSILON = 1e-7;

const functionNames = new Set<FunctionName>(['sin', 'cos', 'tan', 'abs', 'sqrt', 'exp', 'log']);
const allowedCharacters = /^[A-Za-z0-9+*/^().,\s-]+$/u;
const tokenPattern = /[A-Za-z]+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[()+*/^,-]/gu;

interface ParsedSource {
  readonly source: string;
  readonly normalized: string;
}

interface ParseContext {
  nodes: number;
  depth: number;
}

interface Polynomial {
  readonly coefficients: readonly number[];
}

function error(code: FormulaErrorCode): FormulaResult {
  return makeError(code);
}

function makeError(code: FormulaResult extends never ? never : FormulaErrorCode): FormulaResult {
  const messageKeys: Record<FormulaErrorCode, string> = {
    EMPTY: 'formula.empty',
    TOO_LONG: 'formula.tooLong',
    INVALID_CHARACTERS: 'formula.invalidCharacters',
    TOKEN_LIMIT: 'formula.tooComplex',
    NESTING_LIMIT: 'formula.tooDeep',
    SYNTAX: 'formula.syntax',
    UNSUPPORTED: 'formula.unsupported',
    COMPLEXITY: 'formula.tooComplex',
    ORIGIN: 'formula.mustPassOrigin',
    DOMAIN: 'formula.invalidDomain',
    NO_PATH: 'formula.noPath',
  };
  return { ok: false, code, messageKey: messageKeys[code] };
}

function normalizeSource(source: string): ParsedSource | FormulaResult {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    return error('EMPTY');
  }
  if (source.length > MAX_SOURCE_LENGTH) {
    return error('TOO_LONG');
  }

  const normalizedUnicode = trimmed.replaceAll('−', '-').replaceAll('×', '*').replaceAll('·', '*');
  let expressionSource = normalizedUnicode;
  const functionPrefix = /^f\s*\(\s*x\s*\)\s*=\s*/iu;
  const yPrefix = /^y\s*=\s*/iu;
  if (functionPrefix.test(expressionSource)) {
    expressionSource = expressionSource.replace(functionPrefix, '');
  } else if (yPrefix.test(expressionSource)) {
    expressionSource = expressionSource.replace(yPrefix, '');
  }

  if (!allowedCharacters.test(expressionSource)) {
    return error('INVALID_CHARACTERS');
  }
  const tokens = [...expressionSource.matchAll(tokenPattern)];
  const tokenText = tokens.map((match) => match[0]).join('');
  if (tokenText.replaceAll(/\s/gu, '') !== expressionSource.replaceAll(/\s/gu, '')) {
    return error('INVALID_CHARACTERS');
  }
  if (tokens.length > MAX_TOKENS) {
    return error('TOKEN_LIMIT');
  }
  let nesting = 0;
  for (const token of tokens) {
    const value = token[0];
    if (value === '(') {
      nesting += 1;
      if (nesting > MAX_NESTING) {
        return error('NESTING_LIMIT');
      }
    } else if (value === ')') {
      nesting -= 1;
      if (nesting < 0) {
        return error('SYNTAX');
      }
    }
    if (/^[0-9.]/u.test(value)) {
      const numericValue = Number(value);
      const exponentMatch = value.match(/[eE]([+-]?\d+)$/u);
      if (
        !Number.isFinite(numericValue) ||
        Math.abs(numericValue) > MAX_ABS_VALUE ||
        (exponentMatch !== null && Math.abs(Number(exponentMatch[1])) > MAX_POWER)
      ) {
        return error('COMPLEXITY');
      }
    }
  }
  if (nesting !== 0) {
    return error('SYNTAX');
  }

  return { source, normalized: expressionSource.replaceAll(/\s/gu, '') };
}

function isMathNode(value: unknown): value is MathNode {
  return typeof value === 'object' && value !== null && 'type' in value && 'isNode' in value;
}

function asNodeList(value: unknown): readonly MathNode[] | null {
  if (!Array.isArray(value) || !value.every(isMathNode)) {
    return null;
  }
  return value;
}

function parseNode(node: MathNode, context: ParseContext): Expression | FormulaResult {
  context.nodes += 1;
  if (context.nodes > MAX_NODES || context.depth > MAX_NESTING) {
    return error('COMPLEXITY');
  }

  const nextContext = { nodes: context.nodes, depth: context.depth + 1 };
  switch (node.type) {
    case 'ConstantNode': {
      const value = (node as ConstantNode).value;
      if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > MAX_ABS_VALUE) {
        return error('UNSUPPORTED');
      }
      return { kind: 'constant', value };
    }
    case 'SymbolNode': {
      const name = (node as SymbolNode).name;
      if (name === 'x') {
        return { kind: 'variable' };
      }
      if (name === 'pi') {
        return { kind: 'constant', value: Math.PI };
      }
      if (name === 'e') {
        return { kind: 'constant', value: Math.E };
      }
      return error('UNSUPPORTED');
    }
    case 'ParenthesisNode': {
      const content = (node as ParenthesisNode).content;
      if (!isMathNode(content)) {
        return error('UNSUPPORTED');
      }
      return parseNode(content, nextContext);
    }
    case 'OperatorNode': {
      const operatorNode = node as OperatorNode;
      const args = asNodeList(operatorNode.args);
      if (args === null || (args.length !== 1 && args.length !== 2)) {
        return error('UNSUPPORTED');
      }
      if (args.length === 1) {
        const [onlyArg] = args;
        if (
          onlyArg === undefined ||
          (operatorNode.fn !== 'unaryMinus' && operatorNode.fn !== 'unaryPlus')
        ) {
          return error('UNSUPPORTED');
        }
        const operand = parseNode(onlyArg, nextContext);
        if (!isExpression(operand)) {
          return operand;
        }
        return {
          kind: 'unary',
          operator: operatorNode.fn === 'unaryMinus' ? 'minus' : 'plus',
          operand,
        };
      }
      const [leftNode, rightNode] = args;
      if (leftNode === undefined || rightNode === undefined) {
        return error('UNSUPPORTED');
      }
      const operator = binaryOperator(operatorNode.op);
      if (operator === null) {
        return error('UNSUPPORTED');
      }
      const left = parseNode(leftNode, nextContext);
      const right = parseNode(rightNode, nextContext);
      if (!isExpression(left)) {
        return left;
      }
      if (!isExpression(right)) {
        return right;
      }
      return { kind: 'binary', operator, left, right };
    }
    case 'FunctionNode': {
      const functionNode = node as FunctionNode<MathNode>;
      const args = asNodeList(functionNode.args);
      const fn = functionNode.fn;
      if (args === null || args.length !== 1 || !isMathNode(fn) || fn.type !== 'SymbolNode') {
        return error('UNSUPPORTED');
      }
      const [onlyArg] = args;
      if (onlyArg === undefined) {
        return error('UNSUPPORTED');
      }
      const name = (fn as SymbolNode).name;
      if (!functionNames.has(name as FunctionName)) {
        return error('UNSUPPORTED');
      }
      const argument = parseNode(onlyArg, nextContext);
      if (!isExpression(argument)) {
        return argument;
      }
      return { kind: 'function', name: name as FunctionName, argument };
    }
    default:
      return error('UNSUPPORTED');
  }
}

function isExpression(value: Expression | FormulaResult): value is Expression {
  return typeof value === 'object' && value !== null && 'kind' in value;
}

function binaryOperator(operator: string): BinaryOperator | null {
  switch (operator) {
    case '+':
      return 'add';
    case '-':
      return 'subtract';
    case '*':
    case '.*':
      return 'multiply';
    case '/':
    case './':
      return 'divide';
    case '^':
    case '.^':
      return 'power';
    default:
      return null;
  }
}

function safeResult(value: number): number | null {
  return Number.isFinite(value) && Math.abs(value) <= MAX_ABS_VALUE ? value : null;
}

export function evaluateExpression(expression: Expression, x: number): number | null {
  switch (expression.kind) {
    case 'constant':
      return expression.value;
    case 'variable':
      return safeResult(x);
    case 'unary': {
      const operand = evaluateExpression(expression.operand, x);
      if (operand === null) {
        return null;
      }
      return safeResult(expression.operator === 'minus' ? -operand : operand);
    }
    case 'binary': {
      const left = evaluateExpression(expression.left, x);
      const right = evaluateExpression(expression.right, x);
      if (left === null || right === null) {
        return null;
      }
      switch (expression.operator) {
        case 'add':
          return safeResult(left + right);
        case 'subtract':
          return safeResult(left - right);
        case 'multiply':
          return safeResult(left * right);
        case 'divide':
          return right === 0 ? null : safeResult(left / right);
        case 'power':
          return Math.abs(right) > MAX_POWER ? null : safeResult(Math.pow(left, right));
      }
      return null;
    }
    case 'function': {
      const argument = evaluateExpression(expression.argument, x);
      if (argument === null) {
        return null;
      }
      switch (expression.name) {
        case 'sin':
          return safeResult(Math.sin(argument));
        case 'cos':
          return safeResult(Math.cos(argument));
        case 'tan':
          return safeResult(Math.tan(argument));
        case 'abs':
          return safeResult(Math.abs(argument));
        case 'sqrt':
          return argument < 0 ? null : safeResult(Math.sqrt(argument));
        case 'exp':
          return safeResult(Math.exp(argument));
        case 'log':
          return argument <= 0 ? null : safeResult(Math.log(argument));
      }
      return null;
    }
  }
}

function polynomial(expression: Expression, depth = 0): Polynomial | null {
  if (depth > 8) {
    return null;
  }
  switch (expression.kind) {
    case 'constant':
      return { coefficients: [expression.value] };
    case 'variable':
      return { coefficients: [0, 1] };
    case 'unary': {
      const value = polynomial(expression.operand, depth + 1);
      if (value === null) {
        return null;
      }
      return {
        coefficients: value.coefficients.map((coefficient) =>
          expression.operator === 'minus' ? -coefficient : coefficient,
        ),
      };
    }
    case 'binary': {
      const left = polynomial(expression.left, depth + 1);
      const right = polynomial(expression.right, depth + 1);
      if (left === null || right === null) {
        return null;
      }
      if (expression.operator === 'divide') {
        const divisor = right.coefficients[0];
        if (right.coefficients.length !== 1 || divisor === undefined || divisor === 0) {
          return null;
        }
        return { coefficients: left.coefficients.map((coefficient) => coefficient / divisor) };
      }
      if (expression.operator === 'power') {
        const exponent = right.coefficients[0];
        if (
          right.coefficients.length !== 1 ||
          exponent === undefined ||
          !Number.isInteger(exponent)
        ) {
          return null;
        }
        if (exponent < 0 || exponent > 8) {
          return null;
        }
        let result: readonly number[] = [1];
        for (let index = 0; index < exponent; index += 1) {
          result = multiplyCoefficients(result, left.coefficients);
          if (result.length > 9) {
            return null;
          }
        }
        return { coefficients: result };
      }
      if (expression.operator === 'multiply') {
        const coefficients = multiplyCoefficients(left.coefficients, right.coefficients);
        return coefficients.length > 9 ? null : { coefficients };
      }
      const length = Math.max(left.coefficients.length, right.coefficients.length);
      const coefficients = Array.from({ length }, (_, index) => {
        const leftValue = left.coefficients[index] ?? 0;
        const rightValue = right.coefficients[index] ?? 0;
        return expression.operator === 'subtract' ? leftValue - rightValue : leftValue + rightValue;
      });
      return { coefficients };
    }
    case 'function':
      return null;
  }
}

function multiplyCoefficients(
  left: readonly number[],
  right: readonly number[],
): readonly number[] {
  const result = Array.from({ length: left.length + right.length - 1 }, () => 0);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const resultIndex = leftIndex + rightIndex;
      result[resultIndex] =
        (result[resultIndex] ?? 0) + (left[leftIndex] ?? 0) * (right[rightIndex] ?? 0);
    }
  }
  return result;
}

function canonicalPolynomial(value: Polynomial): string {
  const terms = value.coefficients
    .map((coefficient, index) => `${coefficient}:${index}`)
    .filter((term) => !term.startsWith('0:'));
  return `poly(${terms.length === 0 ? '0:0' : terms.join('|')})`;
}

function canonical(expression: Expression): string {
  const poly = polynomial(expression);
  if (poly !== null) {
    return canonicalPolynomial(poly);
  }
  switch (expression.kind) {
    case 'constant':
      return `c(${expression.value})`;
    case 'variable':
      return 'x';
    case 'unary':
      return `${expression.operator}(${canonical(expression.operand)})`;
    case 'function':
      return `${expression.name}(${canonical(expression.argument)})`;
    case 'binary': {
      const left = canonical(expression.left);
      const right = canonical(expression.right);
      if (expression.operator === 'add' || expression.operator === 'multiply') {
        return `${expression.operator}(${[left, right].sort().join(',')})`;
      }
      return `${expression.operator}(${left},${right})`;
    }
  }
}

function formulaFamily(expression: Expression): FormulaFamily {
  const poly = polynomial(expression);
  if (poly !== null) {
    let degree = 0;
    for (let index = 0; index < poly.coefficients.length; index += 1) {
      if ((poly.coefficients[index] ?? 0) !== 0) {
        degree = index;
      }
    }
    if (degree <= 0) return 'constant';
    if (degree === 1) return 'linear';
    if (degree === 2) return 'quadratic';
    return 'polynomial-other';
  }
  const names = collectFunctions(expression);
  if (names.some((name) => name === 'sin' || name === 'cos' || name === 'tan')) return 'trig';
  if (names.some((name) => name === 'sqrt')) return 'radical';
  if (names.some((name) => name === 'exp' || name === 'log')) return 'exponential-log';
  if (containsOperator(expression, 'divide')) return 'rational';
  return 'mixed-other';
}

function collectFunctions(expression: Expression): readonly FunctionName[] {
  switch (expression.kind) {
    case 'function':
      return [expression.name, ...collectFunctions(expression.argument)];
    case 'binary':
      return [...collectFunctions(expression.left), ...collectFunctions(expression.right)];
    case 'unary':
      return collectFunctions(expression.operand);
    default:
      return [];
  }
}

function containsOperator(expression: Expression, operator: BinaryOperator): boolean {
  switch (expression.kind) {
    case 'binary':
      return (
        expression.operator === operator ||
        containsOperator(expression.left, operator) ||
        containsOperator(expression.right, operator)
      );
    case 'unary':
      return containsOperator(expression.operand, operator);
    case 'function':
      return containsOperator(expression.argument, operator);
    default:
      return false;
  }
}

export function validateFormula(source: string): FormulaResult {
  const parsedSource = normalizeSource(source);
  if ('ok' in parsedSource) {
    return parsedSource;
  }

  let root: MathNode;
  try {
    root = parse(parsedSource.normalized);
  } catch {
    return error('SYNTAX');
  }
  const expression = parseNode(root, { nodes: 0, depth: 0 });
  if (!isExpression(expression)) {
    return expression;
  }
  const origin = evaluateExpression(expression, 0);
  if (origin === null || Math.abs(origin) > ORIGIN_EPSILON) {
    return error('ORIGIN');
  }
  const firstSegment = evaluateExpression(expression, 0.25);
  if (firstSegment === null) {
    return error('NO_PATH');
  }

  const formula: ValidatedFormula = {
    source: parsedSource.source,
    normalized: parsedSource.normalized,
    expression,
    canonicalKey: canonical(expression),
    family: formulaFamily(expression),
  };
  return { ok: true, formula };
}
