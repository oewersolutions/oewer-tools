import type { ComponentType } from "react";
import EmiCalculator from "./EmiCalculator";
import FdCalculator from "./FdCalculator";
import GstCalculator from "./GstCalculator";
import PercentageCalculator from "./PercentageCalculator";
import type { ToolComponentKey } from "../../lib/tools/keys";

/**
 * Approved tool components, keyed by the `component_key` column of the `tools` sheet.
 * The workbook can only choose from this list; it never supplies code. Each component is a client component
 * that works entirely in the visitor's browser.
 */
export const toolComponents: { [K in ToolComponentKey]: ComponentType } = {
  "emi-calculator": EmiCalculator,
  "fd-calculator": FdCalculator,
  "gst-calculator": GstCalculator,
  "percentage-calculator": PercentageCalculator,
};

export function getToolComponent(key: string): ComponentType {
  const component = (toolComponents as Record<string, ComponentType | undefined>)[key];
  if (!component) throw new Error(`Unknown tool component_key '${key}'. Register it in components/tools/registry.ts.`);
  return component;
}
