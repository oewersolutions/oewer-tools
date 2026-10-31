import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { repoPathForSitePath } from "../lib/admin/github";
import { checkPicked, cleanName, describeBytes, extensionFor, LIMITS, planSizes, shortHash, sitePathFor } from "../lib/admin/images";

describe("planSizes", () => {
  it("makes a full size and a half-size copy for a large cover", () => {
    expect(planSizes("cover", 4000, 3000)).toEqual([
      { width: 1600, height: 1200, role: "full" },
      { width: 800, height: 600, role: "small" },
    ]);
  });
  it("uses smaller targets for pictures inside the text", () => {
    expect(planSizes("inline", 3000, 2000)).toEqual([
      { width: 1200, height: 800, role: "full" },
      { width: 600, height: 400, role: "small" },
    ]);
  });
  it("never enlarges a picture", () => {
    expect(planSizes("cover", 1000, 500)).toEqual([
      { width: 1000, height: 500, role: "full" },
      { width: 500, height: 250, role: "small" },
    ]);
  });
  it("makes no small copy for a picture that is already small", () => {
    expect(planSizes("cover", 300, 200)).toEqual([{ width: 300, height: 200, role: "full" }]);
  });
  it("keeps the shape, and never produces a zero-sized side", () => {
    for (const [w, h] of [[1600, 1], [5000, 10], [1, 5000]] as const) {
      for (const s of planSizes("cover", w, h)) {
        expect(s.height).toBeGreaterThanOrEqual(1);
        expect(s.width).toBeLessThanOrEqual(w);
      }
    }
  });
});

describe("names", () => {
  it("cleans a file name into a safe lower-case name", () => {
    expect(cleanName("My Holiday Photo (1).JPG")).toBe("my-holiday-photo-1");
    expect(cleanName("Café Crème.png")).toBe("cafe-creme");
    expect(cleanName("../../etc/passwd.webp")).toBe("etc-passwd");
    expect(cleanName("???.jpg")).toBe("image");
    expect(cleanName("a".repeat(80) + ".png").length).toBeLessThanOrEqual(40);
  });
  it("builds the site path from the article, the kind, a hash and the width", () => {
    expect(sitePathFor({ slug: "how-emi-works", kind: "cover", fileName: "IMG_001.jpg", hash: "ab12cd", width: 1600, extension: "webp" })).toBe("/images/blog/how-emi-works/cover-ab12cd-1600.webp");
    expect(sitePathFor({ slug: "how-emi-works", kind: "inline", fileName: "Chart 2.png", hash: "ab12cd", width: 600, extension: "jpg" })).toBe("/images/blog/how-emi-works/chart-2-ab12cd-600.jpg");
  });
  it("gives the same picture the same name, and different pictures different names", async () => {
    const a = await shortHash(new Uint8Array([1, 2, 3]));
    expect(a).toMatch(/^[0-9a-f]{6}$/);
    expect(await shortHash(new Uint8Array([1, 2, 3]))).toBe(a);
    expect(await shortHash(new Uint8Array([1, 2, 4]))).not.toBe(a);
  });
  it("maps a site path to the file in the repository, and picks the extension", () => {
    expect(repoPathForSitePath("/images/blog/x/cover-ab12cd-1600.webp")).toBe("public/images/blog/x/cover-ab12cd-1600.webp");
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("image/jpeg")).toBe("jpg");
  });
  it("names sizes in plain words", () => {
    expect(describeBytes(512)).toBe("1 KB");
    expect(describeBytes(142 * 1024)).toBe("142 KB");
    expect(describeBytes(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
});

describe("checkPicked", () => {
  const jpeg = new Uint8Array(readFileSync("public/images/blog/how-emi-is-calculated/cover-1600.jpg"));
  it("accepts a real picture and reports its size", () => {
    expect(checkPicked({ size: jpeg.length }, jpeg)).toEqual({ ok: true, width: 1600, height: 1000 });
  });
  it("judges by what is inside the file, not by its name", () => {
    const text = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
    expect(checkPicked({ size: text.length }, text)).toMatchObject({ ok: false });
    expect(checkPicked({ size: 10 }, new Uint8Array([71, 73, 70, 56, 57, 97]))).toMatchObject({ ok: false }); // a GIF
  });
  it("refuses empty and oversized files", () => {
    expect(checkPicked({ size: 0 }, jpeg)).toMatchObject({ ok: false, message: "That file is empty." });
    const big = checkPicked({ size: LIMITS.maxInputBytes + 1 }, jpeg);
    expect(big).toMatchObject({ ok: false });
    expect(big.ok ? "" : big.message).toMatch(/limit is 25\.0 MB/);
  });
});
