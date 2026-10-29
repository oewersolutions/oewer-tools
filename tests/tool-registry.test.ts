import { describe, expect, it } from "vitest";
import { toolComponents, getToolComponent } from "../components/tools/registry";
import { TOOL_COMPONENT_KEYS } from "../lib/tools/keys";

describe("tool registry", () => {
  it("has exactly one component for every approved key", () => {
    expect(Object.keys(toolComponents).sort()).toEqual([...TOOL_COMPONENT_KEYS].sort());
  });

  it("throws for an unknown key", () => {
    expect(() => getToolComponent("nope")).toThrow(/Unknown tool component_key 'nope'/);
  });
});
