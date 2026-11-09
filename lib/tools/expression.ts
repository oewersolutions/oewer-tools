/**
 * The scientific calculator's expression reader. It turns typed text into a tree and works that out itself: the text is never
 * passed to eval or Function, so only the operators and functions listed here can ever run. Pure functions, no DOM.
 */
import type { Workings } from "./workings";

export type AngleMode = "deg" | "rad";

export interface ExpressionResult {
  value: number;
  /** The answer as shown: at most 12 significant digits. */
  text: string;
  workings: Workings;
}

export const MAX_LENGTH = 300;
const MAX_DEPTH = 40;
const MAX_STEPS_SHOWN = 14;

class MathError extends Error {}

type Token =
  | { kind: "num"; value: number; text: string }
  | { kind: "name"; name: string }
  | { kind: "op"; op: string };

const OPERATORS = new Set(["+", "-", "*", "/", "^", "!", "%", "(", ")", ","]);

function tokenize(input: string): Token[] {
  const text = input
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt");
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (/\s/.test(ch)) {
      i++;
    } else if (/[0-9.]/.test(ch)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(text.slice(i));
      if (!m) throw new MathError(`“${text.slice(i, i + 6)}” is not a number.`);
      tokens.push({ kind: "num", value: Number(m[0]), text: m[0] });
      i += m[0].length;
    } else if (/[a-z]/i.test(ch)) {
      const m = /^[a-z]+\d*/i.exec(text.slice(i))!;
      // log2 is a function; for any other name a trailing digit run is a number that follows, as in "pi2"
      const whole = m[0].toLowerCase();
      const word = Object.hasOwn(FUNCTIONS, whole)
        ? whole
        : whole.replace(/\d+$/, "");
      tokens.push({ kind: "name", name: word });
      i += word.length;
    } else if (OPERATORS.has(ch)) {
      tokens.push({ kind: "op", op: ch });
      i++;
    } else {
      throw new MathError(`The character “${ch}” cannot be used here.`);
    }
  }
  return tokens;
}

type Node =
  | { type: "num"; value: number; text: string }
  | { type: "const"; name: string; value: number }
  | { type: "unary"; op: "-" | "+"; arg: Node }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { type: "post"; op: "!" | "%"; arg: Node }
  | { type: "call"; name: string; args: Node[] };

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

/** How many arguments each function takes. */
const FUNCTIONS: Record<string, number> = {
  sin: 1,
  cos: 1,
  tan: 1,
  asin: 1,
  acos: 1,
  atan: 1,
  sinh: 1,
  cosh: 1,
  tanh: 1,
  sqrt: 1,
  cbrt: 1,
  ln: 1,
  log: 1,
  log2: 1,
  exp: 1,
  abs: 1,
  floor: 1,
  ceil: 1,
  round: 1,
  root: 2,
  mod: 2,
  max: 2,
  min: 2,
  pow: 2,
};

class Parser {
  private pos = 0;
  private depth = 0;
  constructor(private tokens: Token[]) {}

  parse(): Node {
    if (this.tokens.length === 0)
      throw new MathError("Type an expression, such as 2 + 3 × 4.");
    const node = this.expr();
    const rest = this.tokens[this.pos];
    if (rest)
      throw new MathError(
        rest.kind === "op" && rest.op === ")"
          ? "There is a closing bracket without an opening one."
          : `Unexpected ${this.describe(rest)}.`,
      );
    return node;
  }

  private describe(t: Token): string {
    return t.kind === "num"
      ? `number ${t.text}`
      : t.kind === "name"
        ? `“${t.name}”`
        : `“${t.op}”`;
  }

  private peekOp(...ops: string[]): string | undefined {
    const t = this.tokens[this.pos];
    return t && t.kind === "op" && ops.includes(t.op) ? t.op : undefined;
  }

  private enter() {
    if (++this.depth > MAX_DEPTH)
      throw new MathError(
        "That expression has too many brackets inside brackets.",
      );
  }

  private expr(): Node {
    let left = this.term();
    for (let op = this.peekOp("+", "-"); op; op = this.peekOp("+", "-")) {
      this.pos++;
      left = { type: "binary", op: op as "+" | "-", left, right: this.term() };
    }
    return left;
  }

  /** A product or quotient. Two things written side by side, such as 2(3 + 1) or 3pi, are multiplied. */
  private term(): Node {
    let left = this.unary();
    for (;;) {
      const op = this.peekOp("*", "/");
      if (op) {
        this.pos++;
        left = {
          type: "binary",
          op: op as "*" | "/",
          left,
          right: this.unary(),
        };
        continue;
      }
      const next = this.tokens[this.pos];
      if (
        next &&
        (next.kind === "num" ||
          next.kind === "name" ||
          (next.kind === "op" && next.op === "("))
      ) {
        left = { type: "binary", op: "*", left, right: this.unary() };
        continue;
      }
      return left;
    }
  }

  private unary(): Node {
    const op = this.peekOp("-", "+");
    if (op) {
      this.pos++;
      this.enter();
      const arg = this.unary();
      this.depth--;
      return { type: "unary", op: op as "-" | "+", arg };
    }
    return this.power();
  }

  /** Powers group to the right (2^3^2 is 2^9), and bind tighter than a minus sign in front (−2^2 is −4). */
  private power(): Node {
    const base = this.postfix();
    if (this.peekOp("^")) {
      this.pos++;
      this.enter();
      const exponent = this.unary();
      this.depth--;
      return { type: "binary", op: "^", left: base, right: exponent };
    }
    return base;
  }

  private postfix(): Node {
    let node = this.primary();
    for (let op = this.peekOp("!", "%"); op; op = this.peekOp("!", "%")) {
      this.pos++;
      node = { type: "post", op: op as "!" | "%", arg: node };
    }
    return node;
  }

  private primary(): Node {
    const t = this.tokens[this.pos];
    if (!t)
      throw new MathError(
        "The expression ends too soon. Something is missing after the last symbol.",
      );
    if (t.kind === "num") {
      this.pos++;
      return { type: "num", value: t.value, text: t.text };
    }
    if (t.kind === "name") {
      this.pos++;
      if (Object.hasOwn(CONSTANTS, t.name))
        return { type: "const", name: t.name, value: CONSTANTS[t.name]! };
      const arity = Object.hasOwn(FUNCTIONS, t.name)
        ? FUNCTIONS[t.name]
        : undefined;
      if (arity === undefined)
        throw new MathError(
          `“${t.name}” is not a function or constant this calculator knows.`,
        );
      if (!this.peekOp("("))
        throw new MathError(
          `Put brackets after ${t.name}, like ${t.name}(${arity === 2 ? "8, 3" : "30"}).`,
        );
      this.pos++;
      this.enter();
      const args: Node[] = [this.expr()];
      while (this.peekOp(",")) {
        this.pos++;
        args.push(this.expr());
      }
      this.depth--;
      if (!this.peekOp(")"))
        throw new MathError("A bracket is not closed. Add a closing bracket.");
      this.pos++;
      if (args.length !== arity)
        throw new MathError(
          `${t.name} needs ${arity === 1 ? "one value" : "two values separated by a comma"}.`,
        );
      return { type: "call", name: t.name, args };
    }
    if (t.op === "(") {
      this.pos++;
      this.enter();
      const inner = this.expr();
      this.depth--;
      if (!this.peekOp(")"))
        throw new MathError("A bracket is not closed. Add a closing bracket.");
      this.pos++;
      return inner;
    }
    throw new MathError(`Unexpected ${this.describe(t)}.`);
  }
}

/** A number as shown on screen: 12 significant digits, Indian digit grouping, and exponent form for huge or tiny values. */
export function formatResult(x: number): string {
  if (x === 0 || Object.is(x, -0)) return "0";
  const rounded = Number(x.toPrecision(12));
  const a = Math.abs(rounded);
  if (a >= 1e15 || a < 1e-9)
    return rounded
      .toExponential(6)
      .replace(/\.?0+e/, "e")
      .replace("e+", "e");
  return rounded.toLocaleString("en-IN", { maximumFractionDigits: 12 });
}

/** The same number without grouping, for the working steps and for copying. */
const plain = (x: number): string => {
  if (x === 0 || Object.is(x, -0)) return "0";
  const rounded = Number(x.toPrecision(12));
  return Math.abs(rounded) >= 1e15 || Math.abs(rounded) < 1e-9
    ? formatResult(x)
    : String(rounded);
};

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0)
    throw new MathError(
      "A factorial (!) works only on whole numbers from 0 up.",
    );
  if (n > 170)
    throw new MathError(
      "That factorial is too large to show. Try 170 or less.",
    );
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

const snap = (x: number) => (Math.abs(x) < 1e-14 ? 0 : x);

function run(node: Node, mode: AngleMode, trace: string[]): number {
  const toRad = (x: number) => (mode === "deg" ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (mode === "deg" ? (x * 180) / Math.PI : x);
  const ok = (x: number, what: string): number => {
    if (!Number.isFinite(x))
      throw new MathError(`${what} does not give a real number.`);
    return x;
  };
  switch (node.type) {
    case "num":
      return node.value;
    case "const":
      return node.value;
    case "unary": {
      const x = run(node.arg, mode, trace);
      if (node.op === "+") return x;
      trace.push(`−(${plain(x)}) = ${plain(-x)}`);
      return -x;
    }
    case "post": {
      const x = run(node.arg, mode, trace);
      const r = node.op === "!" ? factorial(x) : x / 100;
      trace.push(
        node.op === "!"
          ? `${plain(x)}! = ${plain(r)}`
          : `${plain(x)}% = ${plain(x)} ÷ 100 = ${plain(r)}`,
      );
      return r;
    }
    case "binary": {
      const a = run(node.left, mode, trace);
      const b = run(node.right, mode, trace);
      let r: number;
      switch (node.op) {
        case "+":
          r = a + b;
          break;
        case "-":
          r = a - b;
          break;
        case "*":
          r = a * b;
          break;
        case "/":
          if (b === 0) throw new MathError("You cannot divide by zero.");
          r = a / b;
          break;
        default:
          if (a === 0 && b < 0)
            throw new MathError("Zero cannot be raised to a negative power.");
          r = ok(a ** b, `${plain(a)} to the power ${plain(b)}`);
      }
      const symbol =
        node.op === "*"
          ? "×"
          : node.op === "/"
            ? "÷"
            : node.op === "-"
              ? "−"
              : node.op;
      trace.push(
        `${plain(a)} ${symbol} ${b < 0 ? `(${plain(b)})` : plain(b)} = ${plain(r)}`,
      );
      return r;
    }
    case "call": {
      const args = node.args.map((n) => run(n, mode, trace));
      const x = args[0]!;
      const y = args[1];
      let r: number;
      switch (node.name) {
        case "sin":
          r = snap(Math.sin(toRad(x)));
          break;
        case "cos":
          r = snap(Math.cos(toRad(x)));
          break;
        case "tan": {
          const c = Math.cos(toRad(x));
          if (Math.abs(c) < 1e-14)
            throw new MathError("tan is not defined at that angle.");
          r = snap(Math.sin(toRad(x)) / c);
          break;
        }
        case "asin":
        case "acos":
          if (x < -1 || x > 1)
            throw new MathError(`${node.name} needs a value from −1 to 1.`);
          r = fromRad(node.name === "asin" ? Math.asin(x) : Math.acos(x));
          break;
        case "atan":
          r = fromRad(Math.atan(x));
          break;
        case "sinh":
          r = Math.sinh(x);
          break;
        case "cosh":
          r = Math.cosh(x);
          break;
        case "tanh":
          r = Math.tanh(x);
          break;
        case "sqrt":
          if (x < 0)
            throw new MathError(
              "The square root of a negative number is not a real number.",
            );
          r = Math.sqrt(x);
          break;
        case "cbrt":
          r = Math.cbrt(x);
          break;
        case "ln":
          if (x <= 0) throw new MathError("ln needs a number above zero.");
          r = Math.log(x);
          break;
        case "log":
          if (x <= 0) throw new MathError("log needs a number above zero.");
          r = Math.log10(x);
          break;
        case "log2":
          if (x <= 0) throw new MathError("log2 needs a number above zero.");
          r = Math.log2(x);
          break;
        case "exp":
          r = ok(Math.exp(x), "e to that power");
          break;
        case "abs":
          r = Math.abs(x);
          break;
        case "floor":
          r = Math.floor(x);
          break;
        case "ceil":
          r = Math.ceil(x);
          break;
        case "round":
          r = Math.round(x);
          break;
        case "root":
          if (y === 0) throw new MathError("The root index cannot be 0.");
          if (x < 0 && !(Number.isInteger(y!) && Math.abs(y!) % 2 === 1))
            throw new MathError(
              "That root of a negative number is not a real number.",
            );
          r = ok(
            x < 0 ? -(Math.abs(x) ** (1 / y!)) : x ** (1 / y!),
            "That root",
          );
          break;
        case "mod":
          if (y === 0) throw new MathError("You cannot divide by zero.");
          r = ((x % y!) + y!) % y!;
          break;
        case "max":
          r = Math.max(x, y!);
          break;
        case "min":
          r = Math.min(x, y!);
          break;
        default:
          r = ok(x ** y!, "That power");
      }
      const inputs = args.map(plain).join(", ");
      const unit = ["sin", "cos", "tan"].includes(node.name)
        ? mode === "deg"
          ? "°"
          : " rad"
        : "";
      trace.push(
        `${node.name}(${args.length === 1 ? plain(x) + unit : inputs}) = ${plain(r)}${["asin", "acos", "atan"].includes(node.name) ? (mode === "deg" ? "°" : " rad") : ""}`,
      );
      return r;
    }
  }
}

/** Writes the tree back as text, with brackets only where they matter. Used to show how the expression was read. */
function describe(node: Node): string {
  switch (node.type) {
    case "num":
      return node.text;
    case "const":
      return node.name === "pi" ? "π" : node.name;
    case "unary":
      return `${node.op === "-" ? "−" : "+"}${wrap(node.arg)}`;
    case "post":
      return `${wrap(node.arg)}${node.op}`;
    case "binary": {
      const symbol =
        node.op === "*"
          ? "×"
          : node.op === "/"
            ? "÷"
            : node.op === "-"
              ? "−"
              : node.op;
      return `${wrap(node.left)} ${symbol} ${wrap(node.right)}`;
    }
    case "call":
      return `${node.name}(${node.args.map(describe).join(", ")})`;
  }
}
const wrap = (node: Node) =>
  node.type === "binary" || node.type === "unary"
    ? `(${describe(node)})`
    : describe(node);

export function evaluateExpression(
  input: string,
  mode: AngleMode,
): { error?: string; result?: ExpressionResult } {
  if (input.trim() === "") return {};
  if (input.length > MAX_LENGTH)
    return {
      error: `That is longer than ${MAX_LENGTH} characters. Please shorten it.`,
    };
  try {
    const tree = new Parser(tokenize(input)).parse();
    const trace: string[] = [];
    const value = run(tree, mode, trace);
    if (!Number.isFinite(value))
      return { error: "The result is too large to show." };
    const shown = trace.slice(0, MAX_STEPS_SHOWN);
    const steps = [`Read as: ${describe(tree)}`, ...shown.map((s) => s)];
    if (trace.length > shown.length)
      steps.push(
        `…and ${trace.length - shown.length} more steps to the answer.`,
      );
    if (trace.length === 0)
      steps.push(
        "There is nothing to calculate: the expression is already a single number.",
      );
    return {
      result: {
        value,
        text: formatResult(value),
        workings: {
          formula: [
            "Order of working: brackets → functions → powers (^) and ! → × and ÷ → + and −",
            "Operations of equal rank run from left to right; powers run right to left",
          ],
          steps,
          note: `Trigonometry uses ${mode === "deg" ? "degrees" : "radians"}. Answers are rounded to 12 significant digits, which hides tiny floating-point errors such as 0.1 + 0.2.`,
        },
      },
    };
  } catch (e) {
    if (e instanceof MathError) return { error: e.message };
    throw e;
  }
}
