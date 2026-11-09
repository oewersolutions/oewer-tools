import { describe, expect, it } from "vitest";
import { toolComponents } from "../components/tools/registry";
import { TOOL_COMPONENT_KEYS, toolComponentKey } from "../lib/tools/keys";

describe("tool registry", () => {
  it("has exactly one component for every approved key", () => {
    expect(Object.keys(toolComponents).sort()).toEqual(
      [...TOOL_COMPONENT_KEYS].sort(),
    );
  });

  it("accepts an approved key and throws for an unknown one", () => {
    expect(toolComponentKey("emi-calculator")).toBe("emi-calculator");
    expect(() => toolComponentKey("nope")).toThrow(
      /Unknown tool component_key 'nope'/,
    );
  });
});
