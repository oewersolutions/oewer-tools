import { describe, expect, it } from "vitest";
import { interval, newGame, placeFood, SIZE, step, turn, type SnakeState } from "../lib/games/snake";

const first = () => 0; // always the first free square

describe("Snake rules", () => {
  it("starts with three squares heading right and food on a free square", () => {
    const g = newGame(first);
    expect(g.snake).toHaveLength(3);
    expect(g.dir).toBe("right");
    expect(g.snake.some((c) => c.x === g.food!.x && c.y === g.food!.y)).toBe(false);
  });

  it("moves one square and keeps its length", () => {
    const g = newGame(first);
    const next = step(g, "right", first);
    expect(next.snake[0]).toEqual({ x: g.snake[0]!.x + 1, y: g.snake[0]!.y });
    expect(next.snake).toHaveLength(3);
  });

  it("ignores a turn straight back", () => {
    expect(turn("right", "left")).toBe("right");
    expect(turn("right", "up")).toBe("up");
    expect(step(newGame(first), "left", first).over).toBe(false);
  });

  it("grows and scores on food, then places new food", () => {
    const g = newGame(first);
    const head = g.snake[0]!;
    const fed: SnakeState = { ...g, food: { x: head.x + 1, y: head.y } };
    const next = step(fed, "right", first);
    expect(next.score).toBe(1);
    expect(next.snake).toHaveLength(4);
    expect(next.food).not.toEqual(fed.food);
  });

  it("ends at a wall", () => {
    let g = newGame(first);
    for (let i = 0; i < SIZE; i++) g = step(g, "right", first);
    expect(g.over).toBe(true);
  });

  it("ends when it runs into itself", () => {
    const snake = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 5, y: 4 }, { x: 4, y: 4 }];
    const g: SnakeState = { snake, dir: "up", food: { x: 0, y: 0 }, score: 0, over: false, won: false };
    // heading up from (5,5) goes to (5,4), which is a body square
    expect(step(g, "up", first).over).toBe(true);
  });

  it("may move into the square its tail just left", () => {
    const snake = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }];
    const g: SnakeState = { snake, dir: "up", food: { x: 0, y: 0 }, score: 0, over: false, won: false };
    expect(step(g, "down", first).over).toBe(false); // (5,6) is the tail and moves away
  });

  it("wins when the board is full and has no food left", () => {
    expect(placeFood(Array.from({ length: SIZE * SIZE }, (_, i) => ({ x: i % SIZE, y: Math.floor(i / SIZE) })))).toBeNull();
  });

  it("speeds up with the score but not past the limit", () => {
    expect(interval(0)).toBeGreaterThan(interval(10));
    expect(interval(500)).toBe(70);
  });
});
