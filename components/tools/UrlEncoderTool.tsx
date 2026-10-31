"use client";

import { useState } from "react";
import { URL_MODE_LABELS, urlDecode, urlEncode, type UrlMode } from "../../lib/tools/encoding";
import { useReportResult } from "./ToolEvents";
import { CopyButton, SelectField, TextAreaField } from "./ui";

type Direction = "encode" | "decode";

export default function UrlEncoderTool() {
  const [direction, setDirection] = useState<Direction>("encode");
  const [mode, setMode] = useState<UrlMode>("component");
  const [input, setInput] = useState("");

  const result = input === "" ? undefined : direction === "encode" ? urlEncode(input, mode) : urlDecode(input, mode);
  const error = result && !result.ok ? result.error : undefined;
  const output = result?.ok ? result.value : "";
  useReportResult(input !== "" && !error);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Action"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "encode", label: "Encode (make safe for a URL)" },
            { value: "decode", label: "Decode (turn %20 back into text)" },
          ]}
        />
        <SelectField label="What is it?" value={mode} onChange={setMode} options={(Object.keys(URL_MODE_LABELS) as UrlMode[]).map((m) => ({ value: m, label: URL_MODE_LABELS[m] }))} />
      </div>
      <div role="status" aria-live="polite" className="min-h-6 text-sm">
        {error ? <p className="text-red-800">{error}</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextAreaField label={direction === "encode" ? "Your text or URL" : "Your encoded text"} value={input} onChange={setInput} rows={10} mono placeholder="Type or paste here" />
        <div>
          <TextAreaField label={direction === "encode" ? "Encoded" : "Decoded"} value={output} readOnly rows={10} mono />
          <div className="mt-2">
            <CopyButton text={output} label="Copy result" />
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-600">Your text is processed in this page and is never sent anywhere.</p>
    </div>
  );
}
