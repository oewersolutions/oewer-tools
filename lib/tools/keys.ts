/**
 * Component keys that have an approved tool component. A published tool's `component_key` must be listed here.
 * Add the key here and its component in components/tools/registry.ts in the same change; the type of that
 * registry makes the build fail if the two disagree. Kept free of React so the workbook validator can use it.
 */
export const TOOL_COMPONENT_KEYS = ["emi-calculator", "fd-calculator", "gst-calculator", "sip-calculator", "lumpsum-calculator", "compound-interest-calculator", "simple-interest-calculator", "rd-calculator", "discount-calculator", "age-calculator", "days-between-dates", "unit-converter", "password-generator", "base64-encoder-decoder", "url-encoder-decoder", "uuid-generator", "hash-generator", "colour-converter", "timestamp-converter", "regex-tester", "jwt-decoder", "pdf-merge", "pdf-split", "images-to-pdf", "exif-remover", "image-crop-rotate", "percentage-calculator", "image-compressor", "image-resizer", "image-converter", "json-formatter", "qr-code-generator", "word-counter"] as const;

export type ToolComponentKey = (typeof TOOL_COMPONENT_KEYS)[number];
