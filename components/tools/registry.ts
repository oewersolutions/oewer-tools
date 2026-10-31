import type { ComponentType } from "react";
import AgeCalculator from "./AgeCalculator";
import CompoundInterestCalculator from "./CompoundInterestCalculator";
import DaysBetweenCalculator from "./DaysBetweenCalculator";
import DiscountCalculator from "./DiscountCalculator";
import EmiCalculator from "./EmiCalculator";
import FdCalculator from "./FdCalculator";
import GstCalculator from "./GstCalculator";
import ImageCompressor from "./ImageCompressor";
import ImageConverter from "./ImageConverter";
import ImageResizer from "./ImageResizer";
import JsonFormatter from "./JsonFormatter";
import PasswordGenerator from "./PasswordGenerator";
import PercentageCalculator from "./PercentageCalculator";
import LumpsumCalculator from "./LumpsumCalculator";
import QrCodeGenerator from "./QrCodeGenerator";
import RdCalculator from "./RdCalculator";
import SimpleInterestCalculator from "./SimpleInterestCalculator";
import SipCalculator from "./SipCalculator";
import UnitConverter from "./UnitConverter";
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
  "sip-calculator": SipCalculator,
  "lumpsum-calculator": LumpsumCalculator,
  "compound-interest-calculator": CompoundInterestCalculator,
  "simple-interest-calculator": SimpleInterestCalculator,
  "rd-calculator": RdCalculator,
  "discount-calculator": DiscountCalculator,
  "age-calculator": AgeCalculator,
  "days-between-dates": DaysBetweenCalculator,
  "unit-converter": UnitConverter,
  "password-generator": PasswordGenerator,
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
