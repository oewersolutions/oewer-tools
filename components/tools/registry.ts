import type { ComponentType } from "react";
import EmiCalculator from "./EmiCalculator";
import FdCalculator from "./FdCalculator";
import GstCalculator from "./GstCalculator";
import ImageCompressor from "./ImageCompressor";
import ImageConverter from "./ImageConverter";
import ImageResizer from "./ImageResizer";
import JsonFormatter from "./JsonFormatter";
import PercentageCalculator from "./PercentageCalculator";
import QrCodeGenerator from "./QrCodeGenerator";
import WordCounter from "./WordCounter";
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
  "image-compressor": ImageCompressor,
  "image-resizer": ImageResizer,
  "image-converter": ImageConverter,
  "json-formatter": JsonFormatter,
  "qr-code-generator": QrCodeGenerator,
  "word-counter": WordCounter,
};

export function getToolComponent(key: string): ComponentType {
  const component = (toolComponents as Record<string, ComponentType | undefined>)[key];
  if (!component) throw new Error(`Unknown tool component_key '${key}'. Register it in components/tools/registry.ts.`);
  return component;
}
