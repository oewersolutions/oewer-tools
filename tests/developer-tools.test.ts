import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { base64Decode, base64Encode, base64Length, urlDecode, urlEncode } from "../lib/tools/encoding";
import { generateUuids, uuidV4, uuidV7 } from "../lib/tools/identifiers";
import { HASH_ALGORITHMS, hashText, sameHash } from "../lib/tools/hash";
import type { RandomSource } from "../lib/tools/password";

const seeded = (seed: number): RandomSource => {
  let a = seed;
  return (buffer) => {
    for (let i = 0; i < buffer.length; i++) {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      buffer[i] = (t ^ (t >>> 14)) >>> 0;
    }
  };
};
const allOnes: RandomSource = (buffer) => buffer.fill(0xffffffff);
const zeros: RandomSource = (buffer) => buffer.fill(0);

describe("base64", () => {
  it("matches the RFC 4648 test vectors", () => {
    const vectors: [string, string][] = [["", ""], ["f", "Zg=="], ["fo", "Zm8="], ["foo", "Zm9v"], ["foob", "Zm9vYg=="], ["fooba", "Zm9vYmE="], ["foobar", "Zm9vYmFy"]];
    for (const [text, encoded] of vectors) {
      expect(base64Encode(text)).toBe(encoded);
      expect(base64Decode(encoded)).toEqual({ ok: true, value: text });
    }
  });
  it("handles non-Latin text and emoji as UTF-8", () => {
    for (const text of ["नमस्ते", "café", "日本語", "😀 ok", "a".repeat(100000)]) expect(base64Decode(base64Encode(text))).toEqual({ ok: true, value: text });
    expect(base64Encode("é")).toBe("w6k=");
  });
  it("makes the URL-safe forms", () => {
    expect(base64Encode("??>>", "standard")).toBe("Pz8+Pg==");
    expect(base64Encode("??>>", "url")).toBe("Pz8-Pg==");
    expect(base64Encode("??>>", "url-unpadded")).toBe("Pz8-Pg");
  });
  it("decodes either alphabet, with or without padding, ignoring spaces and line breaks", () => {
    expect(base64Decode("Pz8-Pg")).toEqual({ ok: true, value: "??>>" });
    expect(base64Decode("Pz8+Pg")).toEqual({ ok: true, value: "??>>" });
    expect(base64Decode(" Zm9v\nYmFy ")).toEqual({ ok: true, value: "foobar" });
  });
  it("explains bad input", () => {
    for (const bad of ["Zm9v!", "Z", "Zm9vY", "Zm9v====", "Pz8+-_"]) expect(base64Decode(bad).ok, bad).toBe(false);
    const binary = base64Decode("/9j/4AAQ"); // starts a JPEG file
    expect(binary.ok).toBe(false);
    expect(binary.ok === false && binary.error).toMatch(/does not decode to text/);
  });
  it("knows the encoded length", () => {
    expect(base64Length(0)).toBe(0);
    expect(base64Length(1)).toBe(4);
    expect(base64Length(3)).toBe(4);
    expect(base64Length(4)).toBe(8);
    expect(base64Encode("foob")).toHaveLength(base64Length(4));
  });
});

describe("url encoding", () => {
  it("encodes a part of a URL", () => {
    expect(urlEncode("a=1&b=Jack & Jill", "component")).toEqual({ ok: true, value: "a%3D1%26b%3DJack%20%26%20Jill" });
    expect(urlEncode("шеллы", "component")).toEqual({ ok: true, value: "%D1%88%D0%B5%D0%BB%D0%BB%D1%8B" });
    expect(urlEncode("😀", "component")).toEqual({ ok: true, value: "%F0%9F%98%80" });
    expect(urlEncode("-_.!~*'()AZaz09", "component")).toEqual({ ok: true, value: "-_.!~*'()AZaz09" });
  });
  it("keeps the structure of a whole URL", () => {
    expect(urlEncode("https://example.com/a b?q=x y&z=é#top", "url")).toEqual({ ok: true, value: "https://example.com/a%20b?q=x%20y&z=%C3%A9#top" });
  });
  it("writes form data with plus signs", () => {
    expect(urlEncode("a b+c", "form")).toEqual({ ok: true, value: "a+b%2Bc" });
    expect(urlDecode("a+b%2Bc", "form")).toEqual({ ok: true, value: "a b+c" });
    expect(urlDecode("a+b", "component")).toEqual({ ok: true, value: "a+b" });
  });
  it("decodes and round-trips", () => {
    for (const mode of ["component", "url", "form"] as const) for (const t of ["hello world", "a&b=c/d?e", "नमस्ते", "100% sure"]) {
      const e = urlEncode(t, mode);
      expect(e.ok && urlDecode(e.value, mode)).toEqual({ ok: true, value: t });
    }
  });
  it("refuses broken input", () => {
    expect(urlEncode("\uD800", "component").ok).toBe(false);
    expect(urlDecode("100%", "component").ok).toBe(false);
    expect(urlDecode("%E0%A4%A", "component").ok).toBe(false);
    expect(urlDecode("%FF", "component").ok).toBe(false);
  });
});

describe("uuid", () => {
  const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  it("version 4 sets the version and variant bits", () => {
    expect(uuidV4(allOnes)).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
    expect(uuidV4(zeros)).toBe("00000000-0000-4000-8000-000000000000");
    const source = seeded(1);
    for (let i = 0; i < 500; i++) expect(uuidV4(source)).toMatch(V4);
  });
  it("version 7 puts the time first", () => {
    expect(uuidV7(zeros, 0x018f1b2c3d4e)).toBe("018f1b2c-3d4e-7000-8000-000000000000");
    expect(uuidV7(allOnes, 0)).toBe("00000000-0000-7fff-bfff-ffffffffffff");
    const a = uuidV7(seeded(2), 1000);
    const b = uuidV7(seeded(2), 2000);
    expect(a < b).toBe(true);
    expect(() => uuidV7(zeros, -1)).toThrow();
    expect(() => uuidV7(zeros, 2 ** 48)).toThrow();
  });
  it("makes the requested number in the requested style", () => {
    const list = generateUuids({ version: "4", count: 5, uppercase: true, hyphens: false }, seeded(3), 0);
    expect(list).toHaveLength(5);
    for (const id of list) expect(id).toMatch(/^[0-9A-F]{32}$/);
    expect(new Set(generateUuids({ version: "4", count: 100, uppercase: false, hyphens: true }, seeded(4), 0)).size).toBe(100);
    expect(() => generateUuids({ version: "4", count: 0, uppercase: false, hyphens: true }, seeded(1), 0)).toThrow();
    expect(() => generateUuids({ version: "4", count: 101, uppercase: false, hyphens: true }, seeded(1), 0)).toThrow();
  });
});

describe("hash", () => {
  it("matches the published SHA-256 value of abc", async () => {
    expect(await hashText("abc", "SHA-256")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(await hashText("abc", "SHA-1")).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
    expect(await hashText("", "SHA-256")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
  it("agrees with Node for every algorithm, including non-Latin text", async () => {
    for (const a of HASH_ALGORITHMS) for (const t of ["", "hello", "नमस्ते 😀", "x".repeat(10000)]) {
      expect(await hashText(t, a)).toBe(createHash(a.replace("-", "").toLowerCase()).update(t, "utf8").digest("hex"));
    }
  });
  it("compares hashes loosely", () => {
    expect(sameHash("BA78 16BF\n", "ba7816bf")).toBe(true);
    expect(sameHash("ba7816bf", "ba7816be")).toBe(false);
  });
});
