import {
  ArrowRight,
  BadgeIndianRupee,
  Braces,
  Calculator,
  FileText,
  Hash,
  Image as ImageIcon,
  Landmark,
  Maximize2,
  Percent,
  QrCode,
  Receipt,
  Repeat,
  Shrink,
  Type,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export { ArrowRight };

const TOOL_ICONS: Record<string, LucideIcon> = {
  "image-compressor": Shrink,
  "image-resizer": Maximize2,
  "image-converter": Repeat,
  "emi-calculator": BadgeIndianRupee,
  "fd-calculator": Landmark,
  "gst-calculator": Receipt,
  "percentage-calculator": Percent,
  "json-formatter": Braces,
  "qr-code-generator": QrCode,
  "word-counter": Type,
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "image-tools": ImageIcon,
  "finance-calculators": Calculator,
  "developer-tools": Braces,
  utilities: Wrench,
};

/** Icon for a tool, chosen by its component_key. Unknown keys get a generic icon. */
export function ToolIcon({ componentKey, className }: { componentKey: string; className?: string }) {
  const Icon = TOOL_ICONS[componentKey] ?? Hash;
  return <Icon aria-hidden="true" className={className} />;
}

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = CATEGORY_ICONS[slug] ?? Wrench;
  return <Icon aria-hidden="true" className={className} />;
}

export const ArticleIcon = FileText;
