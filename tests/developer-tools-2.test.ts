import { describe, expect, it } from "vitest";
import { contrastAgainstWhiteAndBlack, contrastRatio, hslToRgb, parseColour, rgbToHsl, toHex, toHslString, toRgbString } from "../lib/tools/colour";
import { formatInZone, parseDateTime, parseTimestamp, relativeTime, resolveUnit, toIso } from "../lib/tools/timestamps";
import { decodeJwt, validityAt } from "../lib/tools/jwt";
import { runRegex } from "../lib/tools/regex";

const ok = (text: string) => {
  const r = parseColour(text);
  if (!r.ok) throw new Error(r.error);
  return r.colour;
};

describe("colour parsing", () => {
  it("reads hex in all four lengths, with or without #", () => {
    expect(ok("#1a73e8")).toEqual({ r: 26, g: 115, b: 232, a: 1 });
    expect(ok("F09")).toEqual({ r: 255, g: 0, b: 153, a: 1 });
    expect(ok("#f09f")).toEqual({ r: 255, g: 0, b: 153, a: 1 });
    expect(ok("#ff000080")).toEqual({ r: 255, g: 0, b: 0, a: 0.502 });
  });
  it("reads rgb in the comma and space forms, with percentages and alpha", () => {
    expect(ok("rgb(26, 115, 232)")).toEqual({ r: 26, g: 115, b: 232, a: 1 });
    expect(ok("rgb(255 0 153 / 80%)")).toEqual({ r: 255, g: 0, b: 153, a: 0.8 });
    expect(ok("rgba(0,0,0,0.5)")).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(ok("rgb(100%, 0%, 50%)")).toEqual({ r: 255, g: 0, b: 128, a: 1 });
    expect(ok("rgb(300, -5, 10)")).toEqual({ r: 255, g: 0, b: 10, a: 1 });
  });
  it("reads hsl", () => {
    expect(ok("hsl(0, 100%, 50%)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(ok("hsl(120deg 100% 25%)")).toEqual({ r: 0, g: 128, b: 0, a: 1 });
    expect(ok("hsla(240, 100%, 50%, 0.25)")).toEqual({ r: 0, g: 0, b: 255, a: 0.25 });
    expect(ok("hsl(-120, 100%, 50%)")).toEqual({ r: 0, g: 0, b: 255, a: 1 });
  });
  it("refuses what it cannot read", () => {
    for (const bad of ["", "red", "#12", "#12345", "rgb(1,2)", "rgb(a,b,c)", "hsl(1)", "#gggggg", "rgb(1 2 3 4 5)"]) expect(parseColour(bad).ok, bad).toBe(false);
  });
});

describe("colour conversion", () => {
  it("round-trips hex, rgb and hsl", () => {
    for (const hex of ["#000000", "#ffffff", "#1a73e8", "#ff0099", "#808080", "#00ff7f"]) {
      const c = ok(hex);
      expect(toHex(c)).toBe(hex);
      expect(toHex({ ...hslToRgb(rgbToHsl(c)), a: 1 })).toBe(hex);
    }
  });
  it("gives known hsl values", () => {
    expect(toHslString(ok("#ff0000"))).toBe("hsl(0, 100%, 50%)");
    expect(toHslString(ok("#1a73e8"))).toBe("hsl(214, 82%, 51%)");
    expect(toHslString(ok("#ffffff"))).toBe("hsl(0, 0%, 100%)");
    expect(toRgbString(ok("#ff000080"))).toBe("rgb(255 0 0 / 0.502)");
    expect(toHex(ok("rgb(255 0 0 / 50%)"))).toBe("#ff000080");
  });
});

describe("contrast", () => {
  it("matches the known extremes", () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 5);
    expect(contrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    // #767676 is the lightest grey that passes AA for normal text on white (about 4.54:1).
    expect(contrastRatio({ r: 0x76, g: 0x76, b: 0x76 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(4.54, 2);
  });
  it("reports the levels reached", () => {
    const [white, black] = contrastAgainstWhiteAndBlack({ r: 0x76, g: 0x76, b: 0x76 });
    expect(white).toMatchObject({ against: "white", aa: true, aaa: false, aaLarge: true });
    expect(black?.aa).toBe(true); // about 4.6:1 on black
    expect(contrastAgainstWhiteAndBlack({ r: 0, g: 0, b: 0 })[0]?.aaa).toBe(true);
  });
});

describe("timestamps", () => {
  it("reads seconds and milliseconds, choosing automatically", () => {
    expect(resolveUnit(1_700_000_000, "auto")).toBe("seconds");
    expect(resolveUnit(1_700_000_000_000, "auto")).toBe("milliseconds");
    expect(parseTimestamp("1700000000", "auto")).toEqual({ ok: true, ms: 1_700_000_000_000, unit: "seconds" });
    expect(parseTimestamp("1,700,000,000,000", "auto")).toEqual({ ok: true, ms: 1_700_000_000_000, unit: "milliseconds" });
    expect(parseTimestamp("1700000000", "milliseconds")).toEqual({ ok: true, ms: 1_700_000_000, unit: "milliseconds" });
    expect(parseTimestamp("-86400", "auto")).toEqual({ ok: true, ms: -86_400_000, unit: "seconds" });
    expect(parseTimestamp("1.5", "seconds")).toEqual({ ok: true, ms: 1500, unit: "seconds" });
  });
  it("rejects what is not a number or not a date", () => {
    expect(parseTimestamp("abc", "auto").ok).toBe(false);
    expect(parseTimestamp("", "auto").ok).toBe(false);
    expect(parseTimestamp("9e30", "auto").ok).toBe(false);
    expect(parseTimestamp("99999999999999999", "milliseconds").ok).toBe(false);
  });
  it("formats known moments", () => {
    expect(toIso(0)).toBe("1970-01-01T00:00:00.000Z");
    expect(toIso(1_700_000_000_000)).toBe("2023-11-14T22:13:20.000Z");
    expect(formatInZone(1_700_000_000_000, "Asia/Kolkata")).toContain("15 Nov 2023");
    expect(formatInZone(1_700_000_000_000, "Asia/Kolkata")).toContain("03:43:20");
    expect(formatInZone(1_700_000_000_000, "UTC")).toContain("22:13:20");
    expect(toIso(2_147_483_648_000)).toBe("2038-01-19T03:14:08.000Z"); // one second past the largest signed 32-bit time
  });
  it("describes how long ago or ahead", () => {
    const now = 1_700_000_000_000;
    expect(relativeTime(now, now)).toBe("now");
    expect(relativeTime(now - 3 * 86_400_000, now)).toBe("3 days ago");
    expect(relativeTime(now + 2 * 3_600_000, now)).toBe("in 2 hours");
    expect(relativeTime(now - 1000, now)).toBe("1 second ago");
    expect(relativeTime(now - 400 * 86_400_000, now)).toBe("1 year ago");
  });
  it("turns a date and time into a timestamp", () => {
    expect(parseDateTime("2023-11-14T22:13:20", "utc")).toEqual({ ok: true, ms: 1_700_000_000_000 });
    expect(parseDateTime("1970-01-01T00:00", "utc")).toEqual({ ok: true, ms: 0 });
    expect(parseDateTime("2024-02-29T12:00", "utc").ok).toBe(true);
    expect(parseDateTime("2023-02-29T12:00", "utc").ok).toBe(false);
    expect(parseDateTime("2023-04-31T12:00", "local").ok).toBe(false);
    expect(parseDateTime("", "utc").ok).toBe(false);
  });
});

// header {"alg":"HS256","typ":"JWT"}, payload {"sub":"1234567890","name":"John Doe","iat":1516239022}: the example token from jwt.io
const SAMPLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

describe("jwt", () => {
  it("decodes the well-known example token", () => {
    const r = decodeJwt(SAMPLE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.token.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(r.token.payload).toEqual({ sub: "1234567890", name: "John Doe", iat: 1516239022 });
    expect(r.token.times).toEqual([{ claim: "iat", label: "Issued", seconds: 1516239022 }]);
    expect(r.token.algorithm).toBe("HS256");
    expect(r.token.warnings).toEqual([]);
    expect(validityAt(r.token, 1_700_000_000)).toBe("no-expiry");
  });
  it("accepts a Bearer prefix and stray spaces", () => {
    expect(decodeJwt(`Bearer ${SAMPLE.slice(0, 40)}\n${SAMPLE.slice(40)}`).ok).toBe(true);
  });
  it("judges the time window", () => {
    const token = (claims: object) => {
      const r = decodeJwt(`${b64({ alg: "HS256" })}.${b64(claims)}.sig`);
      if (!r.ok) throw new Error(r.error);
      return r.token;
    };
    expect(validityAt(token({ exp: 1000 }), 999)).toBe("in-time");
    expect(validityAt(token({ exp: 1000 }), 1000)).toBe("expired");
    expect(validityAt(token({ nbf: 500, exp: 1000 }), 100)).toBe("not-yet");
    expect(validityAt(token({}), 100)).toBe("no-expiry");
    expect(token({ exp: "soon" }).warnings[0]).toMatch(/exp/);
  });
  it("warns about unsigned tokens", () => {
    const r = decodeJwt(`${b64({ alg: "none" })}.${b64({ a: 1 })}.`);
    expect(r.ok && r.token.warnings[0]).toMatch(/not signed/);
  });
  it("explains what is wrong", () => {
    expect(decodeJwt("").ok).toBe(false);
    expect(decodeJwt("a.b").ok).toBe(false);
    expect(decodeJwt("a.b.c.d.e")).toMatchObject({ ok: false, error: expect.stringMatching(/encrypted/) });
    expect(decodeJwt("!!!.e30.x")).toMatchObject({ ok: false, error: expect.stringMatching(/header/) });
    expect(decodeJwt(`${b64({ alg: "x" })}.${Buffer.from("not json").toString("base64url")}.x`)).toMatchObject({ ok: false, error: expect.stringMatching(/payload.*JSON/) });
    expect(decodeJwt(`${b64([1])}.e30.x`)).toMatchObject({ ok: false, error: expect.stringMatching(/not an object/) });
  });
});

describe("regex", () => {
  it("finds all matches with groups and positions", () => {
    const r = runRegex({ pattern: "(\\d{4})-(\\d{2})", flags: "g", text: "on 2024-03 and 2025-11." });
    expect(r).toEqual({
      ok: true,
      truncated: false,
      matches: [
        { index: 3, text: "2024-03", groups: ["2024", "03"], named: {} },
        { index: 15, text: "2025-11", groups: ["2025", "11"], named: {} },
      ],
    });
  });
  it("finds only the first without the g flag", () => {
    const r = runRegex({ pattern: "a", flags: "", text: "banana" });
    expect(r.ok && r.matches).toHaveLength(1);
  });
  it("reports named groups, flags and empty matches", () => {
    const named = runRegex({ pattern: "(?<year>\\d{4})", flags: "g", text: "2024" });
    expect(named.ok && named.matches[0]?.named).toEqual({ year: "2024" });
    const ci = runRegex({ pattern: "ABC", flags: "gi", text: "xabcx" });
    expect(ci.ok && ci.matches[0]?.index).toBe(1);
    const empty = runRegex({ pattern: "x*", flags: "g", text: "ab" });
    expect(empty.ok && empty.matches).toHaveLength(3);
  });
  it("reports unmatched optional groups", () => {
    const r = runRegex({ pattern: "(a)|(b)", flags: "g", text: "b" });
    expect(r.ok && r.matches[0]?.groups).toEqual([undefined, "b"]);
  });
  it("explains a broken pattern or flag", () => {
    expect(runRegex({ pattern: "(", flags: "g", text: "" })).toMatchObject({ ok: false });
    expect(runRegex({ pattern: "a", flags: "gz", text: "" })).toMatchObject({ ok: false });
  });
  it("stops at 500 matches", () => {
    const r = runRegex({ pattern: "a", flags: "g", text: "a".repeat(600) });
    expect(r.ok && r.matches.length).toBe(500);
    expect(r.ok && r.truncated).toBe(true);
  });
  it("can be rebuilt from its own source text, as the worker does", () => {
    const rebuilt = new Function(`return (${runRegex.toString()})`)() as typeof runRegex;
    expect(rebuilt({ pattern: "b+", flags: "g", text: "abbc" })).toEqual(runRegex({ pattern: "b+", flags: "g", text: "abbc" }));
  });
});
