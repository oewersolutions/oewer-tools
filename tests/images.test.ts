import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { imageSizeFromBytes, isImagePath } from "../lib/image-size";
import { getImageInfo } from "../lib/images";

const bytes = (...parts: (number[] | string)[]) =>
  Uint8Array.from(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le24 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];

describe("imageSizeFromBytes", () => {
  it("reads a real JPEG", () => {
    expect(imageSizeFromBytes(readFileSync("public/images/blog/how-emi-is-calculated/cover-1600.jpg"))).toEqual({ width: 1600, height: 1000 });
    expect(imageSizeFromBytes(readFileSync("public/images/blog/how-emi-is-calculated/cover-800.jpg"))).toEqual({ width: 800, height: 500 });
  });
  it("reads a PNG header", () => {
    const png = bytes([0x89], "PNG\r\n", [0x1a, 0x0a], be32(13), "IHDR", be32(640), be32(360), [8, 6, 0, 0, 0]);
    expect(imageSizeFromBytes(png)).toEqual({ width: 640, height: 360 });
  });
  it("reads the three kinds of WebP", () => {
    const riff = (kind: string, rest: number[]) => bytes("RIFF", [0, 0, 0, 0], "WEBP", kind, [0, 0, 0, 0], rest, new Array(16).fill(0)); // padded like a real file
    expect(imageSizeFromBytes(riff("VP8X", [0, 0, 0, 0, ...le24(1199), ...le24(799), 0, 0, 0]))).toEqual({ width: 1200, height: 800 });
    const bits = (900 - 1) | ((600 - 1) << 14);
    expect(imageSizeFromBytes(riff("VP8L", [0x2f, bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, (bits >>> 24) & 255, 0, 0, 0]))).toEqual({ width: 900, height: 600 });
    expect(imageSizeFromBytes(riff("VP8 ", [0, 0, 0, 0x9d, 0x01, 0x2a, 320 & 255, 320 >> 8, 240 & 255, 240 >> 8, 0, 0]))).toEqual({ width: 320, height: 240 });
  });
  it("says nothing for files that are not pictures, or are cut short", () => {
    expect(imageSizeFromBytes(bytes("<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'></svg>"))).toBeNull();
    expect(imageSizeFromBytes(bytes("GIF89a", [1, 0, 1, 0]))).toBeNull();
    expect(imageSizeFromBytes(new Uint8Array(0))).toBeNull();
    expect(imageSizeFromBytes(bytes([0xff, 0xd8, 0xff]))).toBeNull();
  });
});

describe("isImagePath", () => {
  it("accepts jpg, jpeg, png and webp only, in any case", () => {
    for (const ok of ["/a/b.jpg", "/a/b.JPEG", "/a/b.png", "/a/b.webp"]) expect(isImagePath(ok), ok).toBe(true);
    for (const bad of ["/a/b.svg", "/a/b.gif", "/a/b.jpg.exe", "/a/b", "/a/b.avif"]) expect(isImagePath(bad), bad).toBe(false);
  });
});

describe("getImageInfo", () => {
  it("returns the size and the smaller versions that exist next to a file", () => {
    expect(getImageInfo("/images/blog/how-emi-is-calculated/cover-1600.jpg")).toEqual({
      width: 1600,
      height: 1000,
      srcSet: "/images/blog/how-emi-is-calculated/cover-800.jpg 800w, /images/blog/how-emi-is-calculated/cover-1600.jpg 1600w",
    });
  });
  it("finds the same set from the small file as from the large one", () => {
    expect(getImageInfo("/images/blog/how-emi-is-calculated/cover-800.jpg")).toMatchObject({ width: 800, height: 500, srcSet: expect.stringContaining("1600w") });
  });
  it("returns null for a file that is missing", () => {
    expect(getImageInfo("/images/blog/nope/cover-1600.jpg")).toBeNull();
  });
});
