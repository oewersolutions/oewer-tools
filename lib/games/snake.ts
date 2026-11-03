/** The rules of Snake, kept apart from the screen so they can be tested. The board is SIZE by SIZE squares. */
export const SIZE = 16;

export type Dir = "up" | "down" | "left" | "right";
export interface Cell {
  x: number;
  y: number;
}
export interface SnakeState {
  /** Head first. */
  snake: Cell[];
  dir: Dir;
  food: Cell | null;
  score: number;
  over: boolean;
  won: boolean;
}

const DELTA: Record<Dir, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

/** A turn straight back into the snake's own neck is ignored, so a quick double tap cannot end the game. */
export const turn = (current: Dir, wanted: Dir): Dir => (OPPOSITE[wanted] === current ? current : wanted);

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

/** A random empty square, or null when the snake fills the board. `random` returns a number from 0 up to (not including) 1. */
export function placeFood(snake: Cell[], random: () => number = Math.random): Cell | null {
  const free: Cell[] = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!snake.some((c) => c.x === x && c.y === y)) free.push({ x, y });
  return free.length === 0 ? null : free[Math.floor(random() * free.length)]!;
}

export function newGame(random: () => number = Math.random): SnakeState {
  const mid = Math.floor(SIZE / 2);
  const snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
  return { snake, dir: "right", food: placeFood(snake, random), score: 0, over: false, won: false };
}

/** Move one square in `dir`. Hitting a wall or the snake ends the game; eating the food grows it by one and scores a point. */
export function step(state: SnakeState, wanted: Dir, random: () => number = Math.random): SnakeState {
  if (state.over) return state;
  const dir = turn(state.dir, wanted);
  const head = state.snake[0]!;
  const next = { x: head.x + DELTA[dir].x, y: head.y + DELTA[dir].y };
  if (next.x < 0 || next.y < 0 || next.x >= SIZE || next.y >= SIZE) return { ...state, dir, over: true };
  const eats = state.food !== null && same(next, state.food);
  // The tail square is free again this move unless the snake grows.
  const body = eats ? state.snake : state.snake.slice(0, -1);
  if (body.some((c) => same(c, next))) return { ...state, dir, over: true };
  const snake = [next, ...body];
  if (!eats) return { ...state, snake, dir };
  const food = placeFood(snake, random);
  return { snake, dir, food, score: state.score + 1, over: food === null, won: food === null };
}

/** Time between moves in milliseconds: starts gentle and gets quicker as the score grows, never below 70. */
export const interval = (score: number): number => Math.max(70, 160 - score * 4);

export const shareText = (name: string, score: number, best: number): string => `${name}: I ate ${score} ${score === 1 ? "apple" : "apples"} (best ${best}). Can you beat it?`;
