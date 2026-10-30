"use client";

import { useMemo, useState } from "react";
import { formatJson, minifyJson, parseJson, type Indent } from "../../lib/tools/json";
import { useReportResult } from "./ToolEvents";
import { CopyButton, SelectField, TextAreaField } from "./ui";

type Action = "format" | "minify";

export default function JsonFormatter() {
  const [input, setInput] = useState('{"name":"OEWER Tools","free":true,"tools":[1,2,3]}');
  const [action, setAction] = useState<Action>("format");
  const [indent, setIndent] = useState<Indent>("2");
  const [sort, setSort] = useState(false);

  const parsed = useMemo(() => parseJson(input), [input]);
  useReportResult(parsed.ok && input.trim() !== "");
  const output = parsed.ok ? (action === "format" ? formatJson(parsed.value, indent, sort) : minifyJson(parsed.value, sort)) : "";
  const blank = input.trim() === "";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Action"
          value={action}
          onChange={setAction}
          options={[
            { value: "format", label: "Format (pretty print)" },
            { value: "minify", label: "Minify" },
          ]}
        />
        <SelectField
          label="Indentation"
          value={indent}
          onChange={setIndent}
          options={[
            { value: "2", label: "2 spaces" },
            { value: "4", label: "4 spaces" },
            { value: "tab", label: "Tab" },
          ]}
        />
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} />
          Sort keys A to Z
        </label>
      </div>

      <div role="status" aria-live="polite" className="min-h-6 text-sm">
        {blank ? null : parsed.ok ? (
          <p className="font-medium text-brand">Valid JSON</p>
        ) : (
          <p className="text-red-800">
            Invalid JSON: {parsed.error.message}
            {parsed.error.line !== undefined && ` (line ${parsed.error.line}, column ${parsed.error.column})`}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextAreaField label="Your JSON" value={input} onChange={setInput} rows={16} mono placeholder="Paste JSON here" />
        <div>
          <TextAreaField label={action === "format" ? "Formatted JSON" : "Minified JSON"} value={output} readOnly rows={16} mono />
          <div className="mt-2">
            <CopyButton text={output} label="Copy result" />
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-600">Your JSON is processed in this page and is never sent anywhere.</p>
    </div>
  );
}
