import { describe, expect, it } from "vitest";
import {
  checkImageFile,
  checkImageSize,
  formatBytes,
  heightForWidth,
  MAX_FILE_BYTES,
  outputName,
  readDimension,
  savedPercent,
  scaleByPercent,
  widthForHeight,
} from "../lib/tools/image";

describe("checkImageFile", () => {
  it("accepts JPG, PNG and WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) expect(checkImageFile({ type, size: 1000 })).toBeNull();
  });
  it("rejects other types, empty files and files over the limit", () => {
    expect(checkImageFile({ type: "image/gif", size: 10 })).toMatch(/JPG, PNG or WebP/);
    expect(checkImageFile({ type: "application/pdf", size: 10 })).toMatch(/JPG, PNG or WebP/);
    expect(checkImageFile({ type: "image/png", size: 0 })).toMatch(/empty/);
    expect(checkImageFile({ type: "image/png", size: MAX_FILE_BYTES + 1 })).toMatch(/limit/);
  });
});

describe("checkImageSize", () => {
  it("allows normal photos and rejects huge ones", () => {
    expect(checkImageSize(4000, 3000)).toBeNull();
    expect(checkImageSize(10000, 10000)).toMatch(/too large/);
  });
});

describe("formatBytes", () => {
  it("picks a readable unit", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });
});

describe("outputName", () => {
  it("swaps the extension and adds a suffix", () => {
    expect(outputName("photo.final.png", "image/webp", "compressed")).toBe("photo.final-compressed.webp");
    expect(outputName("IMG 01.JPG", "image/jpeg", "resized")).toBe("IMG 01-resized.jpg");
  });
  it("handles names without an extension and unsafe characters", () => {
    expect(outputName("scan", "image/png", "converted")).toBe("scan-converted.png");
    expect(outputName("a/b<c>.png", "image/png", "x")).toBe("a_b_c_-x.png");
    expect(outputName(".png", "image/png", "x")).toBe(".png-x.png");
  });
});

describe("sizes", () => {
  it("computes savings, negative when larger", () => {
    expect(savedPercent(1000, 250)).toBe(75);
    expect(savedPercent(1000, 1200)).toBe(-20);
    expect(savedPercent(0, 5)).toBe(0);
  });
  it("keeps the aspect ratio", () => {
    expect(heightForWidth(4000, 3000, 800)).toBe(600);
    expect(widthForHeight(4000, 3000, 300)).toBe(400);
    expect(heightForWidth(1000, 1, 1)).toBe(1);
  });
  it("scales by percent, never below 1 pixel", () => {
    expect(scaleByPercent(1000, 500, 50)).toEqual({ width: 500, height: 250 });
    expect(scaleByPercent(10, 10, 1)).toEqual({ width: 1, height: 1 });
  });
});

describe("readDimension", () => {
  it("validates whole pixel values", () => {
    expect(readDimension(" 800 ", "Width")).toEqual({ value: 800 });
    expect(readDimension("", "Width")).toEqual({ empty: true });
    expect(readDimension("12.5", "Width")).toHaveProperty("error");
    expect(readDimension("0", "Width")).toHaveProperty("error");
    expect(readDimension("99999", "Width")).toHaveProperty("error");
  });
});
