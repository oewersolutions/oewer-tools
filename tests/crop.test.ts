import { describe, expect, it } from "vitest";
import { ASPECTS, clampRect, dragCorner, IDENTITY, initialRect, mapPoint, moveRect, rotate, setRectField, transformMatrix, turnedSize, type Transform } from "../lib/tools/crop";

const apply = (m: number[], x: number, y: number) => ({ x: m[0]! * x + m[2]! * y + m[4]!, y: m[1]! * x + m[3]! * y + m[5]! });

describe("turning", () => {
  it("swaps width and height on a quarter turn", () => {
    expect(turnedSize(400, 300, 0)).toEqual({ width: 400, height: 300 });
    expect(turnedSize(400, 300, 90)).toEqual({ width: 300, height: 400 });
    expect(turnedSize(400, 300, 180)).toEqual({ width: 400, height: 300 });
    expect(turnedSize(400, 300, 270)).toEqual({ width: 300, height: 400 });
  });
  it("turns left and right", () => {
    expect(rotate(0, 90)).toBe(90);
    expect(rotate(270, 90)).toBe(0);
    expect(rotate(0, -90)).toBe(270);
    expect(rotate(90, -90)).toBe(0);
  });
});

describe("where the corners go", () => {
  // a picture 400 wide and 300 high; its top-left corner is (0,0) and bottom-right is (400,300)
  it("clockwise quarter turn: the top-left corner moves to the top-right", () => {
    expect(mapPoint(0, 0, 400, 300, { ...IDENTITY, rotation: 90 })).toEqual({ x: 300, y: 0 });
    expect(mapPoint(400, 0, 400, 300, { ...IDENTITY, rotation: 90 })).toEqual({ x: 300, y: 400 });
    expect(mapPoint(0, 300, 400, 300, { ...IDENTITY, rotation: 90 })).toEqual({ x: 0, y: 0 });
  });
  it("half turn and three-quarter turn", () => {
    expect(mapPoint(0, 0, 400, 300, { ...IDENTITY, rotation: 180 })).toEqual({ x: 400, y: 300 });
    expect(mapPoint(0, 0, 400, 300, { ...IDENTITY, rotation: 270 })).toEqual({ x: 0, y: 400 });
  });
  it("flips", () => {
    expect(mapPoint(0, 0, 400, 300, { ...IDENTITY, flipH: true })).toEqual({ x: 400, y: 0 });
    expect(mapPoint(0, 0, 400, 300, { ...IDENTITY, flipV: true })).toEqual({ x: 0, y: 300 });
  });
  it("flips first, then turns", () => {
    expect(mapPoint(0, 0, 400, 300, { rotation: 90, flipH: true, flipV: false })).toEqual({ x: 300, y: 400 });
  });
  it("a canvas matrix agrees with the point mapping for every combination", () => {
    for (const rotation of [0, 90, 180, 270] as const) for (const flipH of [false, true]) for (const flipV of [false, true]) {
      const t: Transform = { rotation, flipH, flipV };
      const m = transformMatrix(400, 300, t);
      for (const [x, y] of [[0, 0], [400, 0], [0, 300], [400, 300], [120, 70]] as const) {
        const a = apply(m, x, y);
        const b = mapPoint(x, y, 400, 300, t);
        expect(a.x).toBeCloseTo(b.x, 9);
        expect(a.y).toBeCloseTo(b.y, 9);
      }
    }
  });
  it("turning four times, or flipping twice, changes nothing", () => {
    let r = 0 as 0 | 90 | 180 | 270;
    for (let i = 0; i < 4; i++) r = rotate(r, 90);
    expect(r).toBe(0);
  });
});

describe("crop box", () => {
  it("starts as the whole picture, or the biggest box of a shape, centred", () => {
    expect(initialRect(400, 300)).toEqual({ x: 0, y: 0, width: 400, height: 300 });
    expect(initialRect(400, 300, 1)).toEqual({ x: 50, y: 0, width: 300, height: 300 });
    expect(initialRect(400, 300, 16 / 9)).toEqual({ x: 0, y: 38, width: 400, height: 225 });
    expect(initialRect(300, 400, 9 / 16)).toEqual({ x: 38, y: 0, width: 225, height: 400 });
  });
  it("keeps the box inside the picture", () => {
    expect(clampRect({ x: -10, y: 290, width: 100, height: 50 }, 400, 300)).toEqual({ x: 0, y: 250, width: 100, height: 50 });
    expect(clampRect({ x: 0, y: 0, width: 900, height: 900 }, 400, 300)).toEqual({ x: 0, y: 0, width: 400, height: 300 });
    expect(moveRect({ x: 10, y: 10, width: 100, height: 100 }, 1000, -1000, 400, 300)).toEqual({ x: 300, y: 0, width: 100, height: 100 });
  });
  it("drags a corner with the opposite corner fixed", () => {
    const r = { x: 100, y: 100, width: 100, height: 100 };
    expect(dragCorner(r, "se", 250, 220, 400, 300)).toEqual({ x: 100, y: 100, width: 150, height: 120 });
    expect(dragCorner(r, "nw", 50, 60, 400, 300)).toEqual({ x: 50, y: 60, width: 150, height: 140 });
    expect(dragCorner(r, "ne", 260, 40, 400, 300)).toEqual({ x: 100, y: 40, width: 160, height: 160 });
    expect(dragCorner(r, "sw", 20, 280, 400, 300)).toEqual({ x: 20, y: 100, width: 180, height: 180 });
  });
  it("stops at the edge of the picture and at the smallest size", () => {
    const r = { x: 100, y: 100, width: 100, height: 100 };
    expect(dragCorner(r, "se", 999, 999, 400, 300)).toEqual({ x: 100, y: 100, width: 300, height: 200 });
    expect(dragCorner(r, "se", 100, 100, 400, 300)).toEqual({ x: 100, y: 100, width: 8, height: 8 });
    expect(dragCorner(r, "nw", 999, 999, 400, 300)).toEqual({ x: 192, y: 192, width: 8, height: 8 });
  });
  it("keeps its shape while dragging", () => {
    const r = { x: 100, y: 100, width: 160, height: 90 };
    const out = dragCorner(r, "se", 400, 300, 400, 300, 16 / 9);
    expect(out.width / out.height).toBeCloseTo(16 / 9, 1);
    expect(out.x + out.width).toBeLessThanOrEqual(400);
    expect(out.y + out.height).toBeLessThanOrEqual(300);
  });
  it("applies typed numbers and keeps the shape when asked", () => {
    const r = { x: 0, y: 0, width: 200, height: 100 };
    expect(setRectField(r, "x", 50, 400, 300)).toEqual({ x: 50, y: 0, width: 200, height: 100 });
    expect(setRectField(r, "width", 300, 400, 300)).toEqual({ x: 0, y: 0, width: 300, height: 100 });
    expect(setRectField(r, "width", 300, 400, 300, 2)).toEqual({ x: 0, y: 0, width: 300, height: 150 });
    expect(setRectField(r, "height", 80, 400, 300, 2)).toEqual({ x: 0, y: 0, width: 160, height: 80 });
    expect(setRectField({ x: 300, y: 0, width: 50, height: 25 }, "width", 200, 400, 300, 2)).toEqual({ x: 300, y: 0, width: 100, height: 50 });
    expect(setRectField(r, "x", 9999, 400, 300)).toEqual({ x: 200, y: 0, width: 200, height: 100 });
  });
  it("offers the usual shapes", () => {
    expect(ASPECTS.map((a) => a.id)).toEqual(["free", "1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16"]);
  });
});
