import { describe, expect, it } from "vitest";
import { evaluateConcrete, type ConcreteRaw } from "../lib/tools/concrete";
import {
  ASSESSMENT_ROWS,
  COURSE_ROWS,
  evaluateCgpa,
  evaluateGpa,
  show2,
  evaluateWeighted,
  type WeightedRaw,
} from "../lib/tools/grades";
import { evaluateSubnet, parseIpv4, parsePrefix } from "../lib/tools/subnet";

const gpa = (pairs: [string, string][]) => {
  const grades = Array(COURSE_ROWS).fill("");
  const credits = Array(COURSE_ROWS).fill("");
  pairs.forEach(([g, c], i) => {
    grades[i] = g;
    credits[i] = c;
  });
  return evaluateGpa({ grades, credits });
};

describe("GPA", () => {
  it("weights grade points by credits", () => {
    const r = gpa([
      ["A", "3"],
      ["B", "4"],
      ["C+", "3"],
    ]).result!;
    expect(r.qualityPoints).toBeCloseTo(12 + 12 + 6.9, 10);
    expect(r.credits).toBe(10);
    expect(r.gpa).toBeCloseTo(3.09, 10);
    expect(r.workings.steps[0]).toContain("grade A is 4 points × 3 credits");
  });
  it("handles plus and minus and F", () => {
    expect(
      gpa([
        ["A-", "2"],
        ["F", "2"],
      ]).result!.gpa,
    ).toBeCloseTo(1.85, 10);
  });
  it("rounds halves up", () => {
    expect(
      show2(
        gpa([
          ["A", "3"],
          ["B+", "4"],
          ["A-", "3"],
          ["F", "2"],
        ]).result!.gpa,
      ),
    ).toBe("3.03");
  });
  it("ignores empty rows and waits for credits", () => {
    expect(gpa([]).result).toBeUndefined();
    expect(gpa([["A", ""]]).result).toBeUndefined();
    expect(gpa([["A", "x"]]).errors[0]).toMatch(/must be a number/);
    expect(gpa([["A", "0"]]).errors[0]).toMatch(/greater than 0/);
  });
});

describe("CGPA", () => {
  it("converts with the 9.5 multiplier both ways", () => {
    expect(
      evaluateCgpa({ direction: "toPercent", value: "8.2" }).result!.value,
    ).toBeCloseTo(77.9, 10);
    expect(
      evaluateCgpa({ direction: "toCgpa", value: "76" }).result!.value,
    ).toBeCloseTo(8, 10);
    expect(
      evaluateCgpa({ direction: "toPercent", value: "11" }).errors.value,
    ).toMatch(/more than 10/);
  });
});

const w = (o: Partial<WeightedRaw>): WeightedRaw => ({
  mode: "average",
  scores: Array(ASSESSMENT_ROWS).fill(""),
  weights: Array(ASSESSMENT_ROWS).fill(""),
  finalWeight: "",
  target: "",
  ...o,
});
const fill = (scores: string[], weights: string[]) => ({
  scores: [...scores, ...Array(ASSESSMENT_ROWS - scores.length).fill("")],
  weights: [...weights, ...Array(ASSESSMENT_ROWS - weights.length).fill("")],
});

describe("weighted grade", () => {
  it("averages by weight", () => {
    const r = evaluateWeighted(
      w(fill(["90", "80", "70"], ["20", "30", "50"])),
    ).result!;
    expect(r.headline).toBe("77%");
    expect(r.headlineLabel).toContain("C");
  });
  it("works out the final exam score needed", () => {
    const r = evaluateWeighted(
      w({
        mode: "final",
        ...fill(["80", "90"], ["30", "30"]),
        finalWeight: "40",
        target: "85",
      }),
    ).result!;
    // earned 24 + 27 = 51; need 34 of 40 => 85%
    expect(r.headline).toBe("85%");
    expect(r.rows[0]!.value).toBe("51%");
  });
  it("says when the target is out of reach or already met", () => {
    expect(
      evaluateWeighted(
        w({
          mode: "final",
          ...fill(["50"], ["60"]),
          finalWeight: "40",
          target: "90",
        }),
      ).result!.headlineLabel,
    ).toContain("above 100%");
    expect(
      evaluateWeighted(
        w({
          mode: "final",
          ...fill(["100"], ["90"]),
          finalWeight: "10",
          target: "80",
        }),
      ).result!.headlineLabel,
    ).toContain("already reached");
  });
  it("rejects bad input", () => {
    expect(evaluateWeighted(w(fill(["90"], ["0"]))).errors.weight0).toMatch(
      /greater than 0/,
    );
    expect(
      evaluateWeighted(
        w({
          mode: "final",
          ...fill(["80"], ["70"]),
          finalWeight: "40",
          target: "85",
        }),
      ).errors.finalWeight,
    ).toMatch(/more than 100/);
    expect(evaluateWeighted(w({})).result).toBeUndefined();
  });
});

const concrete = (o: Partial<ConcreteRaw> = {}): ConcreteRaw => ({
  shape: "box",
  unit: "m",
  length: "5",
  width: "4",
  depth: "0.15",
  diameter: "0.4",
  height: "3",
  count: "1",
  waste: "5",
  mix: "m20",
  ...o,
});

describe("concrete", () => {
  it("calculates a slab and its materials", () => {
    const r = evaluateConcrete(concrete()).result!;
    expect(r.wetM3).toBeCloseTo(3, 10);
    expect(r.withWasteM3).toBeCloseTo(3.15, 10);
    expect(r.dryM3).toBeCloseTo(3.15 * 1.54, 10);
    // M20: 1 + 1.5 + 3 = 5.5 parts
    expect(r.cementKg).toBeCloseTo(((3.15 * 1.54) / 5.5) * 1440, 6);
    expect(r.bags).toBeCloseTo(r.cementKg / 50, 10);
    expect(r.sandM3).toBeCloseTo((3.15 * 1.54 * 1.5) / 5.5, 10);
    expect(r.aggregateM3).toBeCloseTo((3.15 * 1.54 * 3) / 5.5, 10);
  });
  it("calculates a round column in feet and several pieces", () => {
    const r = evaluateConcrete(
      concrete({
        shape: "round",
        unit: "ft",
        diameter: "1",
        height: "10",
        count: "4",
        waste: "0",
      }),
    ).result!;
    const one = Math.PI * (0.3048 / 2) ** 2 * 3.048;
    expect(r.wetM3).toBeCloseTo(4 * one, 10);
  });
  it("rejects bad input", () => {
    expect(evaluateConcrete(concrete({ length: "0" })).errors.length).toMatch(
      /greater than 0/,
    );
    expect(evaluateConcrete(concrete({ count: "1.5" })).errors.count).toMatch(
      /whole number/,
    );
    expect(evaluateConcrete(concrete({ width: "" })).result).toBeUndefined();
  });
});

describe("subnet", () => {
  it("solves a /24", () => {
    const r = evaluateSubnet({ address: "192.168.1.10", prefix: "24" }).result!;
    expect(r.network).toBe("192.168.1.0");
    expect(r.broadcast).toBe("192.168.1.255");
    expect(r.mask).toBe("255.255.255.0");
    expect(r.wildcard).toBe("0.0.0.255");
    expect(r.firstHost).toBe("192.168.1.1");
    expect(r.lastHost).toBe("192.168.1.254");
    expect(r.total).toBe(256);
    expect(r.usable).toBe(254);
    expect(r.addressClass).toBe("C");
    expect(r.privateRange).toContain("Private");
  });
  it("solves a non-octet boundary", () => {
    const r = evaluateSubnet({
      address: "10.20.30.200",
      prefix: "/27",
    }).result!;
    expect(r.cidr).toBe("10.20.30.192/27");
    expect(r.broadcast).toBe("10.20.30.223");
    expect(r.usable).toBe(30);
    expect(r.mask).toBe("255.255.255.224");
  });
  it("handles /0, /31 and /32", () => {
    expect(
      evaluateSubnet({ address: "8.8.8.8", prefix: "0" }).result!.total,
    ).toBe(4294967296);
    const p2p = evaluateSubnet({ address: "10.0.0.4", prefix: "31" }).result!;
    expect(p2p.usable).toBe(2);
    expect(p2p.firstHost).toBe("10.0.0.4");
    expect(p2p.lastHost).toBe("10.0.0.5");
    const host = evaluateSubnet({ address: "10.0.0.4", prefix: "32" }).result!;
    expect(host.usable).toBe(1);
    expect(host.firstHost).toBe("10.0.0.4");
  });
  it("accepts a dotted mask", () => {
    expect(parsePrefix("255.255.240.0").prefix).toBe(20);
    expect(parsePrefix("255.255.255.255").prefix).toBe(32);
    expect(parsePrefix("0.0.0.0").prefix).toBe(0);
    expect(parsePrefix("255.0.255.0").error).toMatch(/run of 1s/);
    expect(parsePrefix("33").error).toMatch(/0 to 32/);
  });
  it("rejects bad addresses", () => {
    expect(parseIpv4("256.1.1.1")).toBeUndefined();
    expect(parseIpv4("1.2.3")).toBeUndefined();
    expect(
      evaluateSubnet({ address: "1.2.3.999", prefix: "24" }).errors.address,
    ).toMatch(/four numbers/);
    expect(
      evaluateSubnet({ address: "", prefix: "24" }).result,
    ).toBeUndefined();
  });
});
