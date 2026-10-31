/** Geometry for rotating, flipping and cropping a picture. Pure functions, unit tested without a browser. */

export type Rotation = 0 | 90 | 180 | 270;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
}

export const IDENTITY: Transform = { rotation: 0, flipH: false, flipV: false };

export const rotate = (r: Rotation, by: 90 | -90): Rotation => ((((r + by) % 360) + 360) % 360) as Rotation;

/** The size of the picture after turning: a quarter turn swaps width and height. */
export const turnedSize = (width: number, height: number, rotation: Rotation): { width: number; height: number } => (rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height });

/** Where a point of the original picture ends up. The picture is flipped first, then turned clockwise. */
export function mapPoint(x: number, y: number, width: number, height: number, t: Transform): { x: number; y: number } {
  const fx = t.flipH ? width - x : x;
  const fy = t.flipV ? height - y : y;
  switch (t.rotation) {
    case 90:
      return { x: height - fy, y: fx };
    case 180:
      return { x: width - fx, y: height - fy };
    case 270:
      return { x: fy, y: width - fx };
    default:
      return { x: fx, y: fy };
  }
}

/** The six numbers of a canvas transform (a, b, c, d, e, f) that draw the original picture flipped and turned. */
export function transformMatrix(width: number, height: number, t: Transform): [number, number, number, number, number, number] {
  const o = mapPoint(0, 0, width, height, t);
  const px = mapPoint(1, 0, width, height, t);
  const py = mapPoint(0, 1, width, height, t);
  return [px.x - o.x, px.y - o.y, py.x - o.x, py.y - o.y, o.x, o.y];
}

// Crop box

export const MIN_SIZE = 8;

export interface AspectOption {
  id: string;
  label: string;
  /** width / height; undefined for a free shape. */
  ratio?: number;
}
export const ASPECTS: AspectOption[] = [
  { id: "free", label: "Free" },
  { id: "1:1", label: "Square (1:1)", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "2:3", label: "2:3", ratio: 2 / 3 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The biggest box of that shape, centred in the picture. With no shape, the whole picture. */
export function initialRect(width: number, height: number, ratio?: number): Rect {
  if (!ratio) return { x: 0, y: 0, width, height };
  let w = width;
  let h = Math.round(w / ratio);
  if (h > height) {
    h = height;
    w = Math.round(h * ratio);
  }
  w = Math.max(1, Math.min(w, width));
  h = Math.max(1, Math.min(h, height));
  return { x: Math.round((width - w) / 2), y: Math.round((height - h) / 2), width: w, height: h };
}

/** Keep the box inside the picture without changing its size where possible. */
export function clampRect(r: Rect, width: number, height: number): Rect {
  const w = clamp(Math.round(r.width), 1, width);
  const h = clamp(Math.round(r.height), 1, height);
  return { x: clamp(Math.round(r.x), 0, width - w), y: clamp(Math.round(r.y), 0, height - h), width: w, height: h };
}

export const moveRect = (r: Rect, dx: number, dy: number, width: number, height: number): Rect => clampRect({ ...r, x: r.x + dx, y: r.y + dy }, width, height);

export type Corner = "nw" | "ne" | "sw" | "se";

/**
 * Drag one corner to the point (px, py), in picture pixels. The opposite corner stays where it is. With a shape set, the box
 * keeps that shape and the pointer sets its width.
 */
export function dragCorner(r: Rect, corner: Corner, px: number, py: number, width: number, height: number, ratio?: number): Rect {
  const ax = corner === "nw" || corner === "sw" ? r.x + r.width : r.x; // anchor: the opposite corner
  const ay = corner === "nw" || corner === "ne" ? r.y + r.height : r.y;
  const dirX = corner === "nw" || corner === "sw" ? -1 : 1;
  const dirY = corner === "nw" || corner === "ne" ? -1 : 1;
  const maxW = dirX === 1 ? width - ax : ax;
  const maxH = dirY === 1 ? height - ay : ay;
  let w = clamp((px - ax) * dirX, MIN_SIZE, Math.max(MIN_SIZE, maxW));
  let h = clamp((py - ay) * dirY, MIN_SIZE, Math.max(MIN_SIZE, maxH));
  if (ratio) {
    h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    if (w > maxW) {
      w = maxW;
      h = w / ratio;
    }
  }
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  return { x: dirX === 1 ? ax : ax - w, y: dirY === 1 ? ay : ay - h, width: w, height: h };
}

export type RectField = "x" | "y" | "width" | "height";

/** A number typed into one of the four boxes. With a shape set, changing the width or height changes the other too. */
export function setRectField(r: Rect, field: RectField, value: number, width: number, height: number, ratio?: number): Rect {
  let next: Rect = { ...r, [field]: value };
  if (ratio && field === "width") next = { ...next, height: next.width / ratio };
  if (ratio && field === "height") next = { ...next, width: next.height * ratio };
  if (ratio && (field === "width" || field === "height")) {
    // shrink to fit if the other side would stick out of the picture
    const room = { w: width - next.x, h: height - next.y };
    const scale = Math.min(1, room.w / next.width, room.h / next.height);
    next = { ...next, width: next.width * scale, height: next.height * scale };
  }
  return clampRect(next, width, height);
}
