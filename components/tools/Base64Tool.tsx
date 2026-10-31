"use client";

import { useState } from "react";
import { base64Decode, base64Encode, type Base64Variant } from "../../lib/tools/encoding";
import { useReportResult } from "./ToolEvents";
import { CopyButton, SelectField, TextAreaField } from "./ui";

type Direction = "encode" | "decode";

export default function Base64Tool() {
  const [direction, setDirection] = useState<Direction>("encode");
  const [variant, setVariant] = useState<Base64Variant>("standard");
  const [input, setInput] = useState("");

  const decoded = direction === "decode" ? base64Decode(input) : undefined;
  const error = decoded && !decoded.ok ? decoded.error : undefined;
  const output = direction === "encode" ? base64Encode(input, variant) : decoded?.ok ? decoded.value : "";
  useReportResult(input !== "" && !error);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Action"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "encode", label: "Encode text to Base64" },
            { value: "decode", label: "Decode Base64 to text" },
          ]}
        />
        {direction === "encode" && (
          <SelectField
            label="Alphabet"
            value={variant}
            onChange={setVariant}
            options={[
              { value: "standard", label: "Standard (+ / and = padding)" },
              { value: "url", label: "URL-safe (- _ and = padding)" },
              { value: "url-unpadded", label: "URL-safe, no = padding" },
            ]}
          />
        )}
      </div>
      <div role="status" aria-live="polite" className="min-h-6 text-sm">
        {error ? <p className="text-red-800">{error}</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextAreaField label={direction === "encode" ? "Your text" : "Your Base64"} value={input} onChange={setInput} rows={12} mono placeholder={direction === "encode" ? "Type or paste text here" : "Paste Base64 here"} />
        <div>
          <TextAreaField label={direction === "encode" ? "Base64" : "Decoded text"} value={output} readOnly rows={12} mono />
          <div className="mt-2">
            <CopyButton text={output} label="Copy result" />
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-600">Base64 is a way of writing data, not a way of hiding it: anyone can decode it. Your text is processed in this page and is never sent anywhere.</p>
    </div>
  );
}
