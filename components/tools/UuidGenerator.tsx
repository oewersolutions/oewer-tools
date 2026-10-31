"use client";

import { useCallback, useEffect, useState } from "react";
import { generateUuids, MAX_UUIDS, type UuidVersion } from "../../lib/tools/identifiers";
import { readNumber } from "../../lib/tools/finance";
import { useReportResult } from "./ToolEvents";
import { CopyButton, NumberField, SelectField, TextAreaField } from "./ui";

const browserRandom = (buffer: Uint32Array) => {
  crypto.getRandomValues(buffer);
};

export default function UuidGenerator() {
  const [version, setVersion] = useState<UuidVersion>("4");
  const [count, setCount] = useState("5");
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [ids, setIds] = useState<string[]>([]);

  const state = readNumber(count, "Count", { min: 1, max: MAX_UUIDS, integer: true });
  const error = "error" in state ? state.error : undefined;
  const n = "value" in state ? state.value : undefined;

  // Made in the browser after the page loads, and again when a choice changes or the button is pressed.
  const make = useCallback(() => setIds(n === undefined ? [] : generateUuids({ version, count: n, uppercase, hyphens }, browserRandom, Date.now())), [n, version, uppercase, hyphens]);
  useEffect(make, [make]);
  useReportResult(ids.length > 0);
  const text = ids.join("\n");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Version"
          value={version}
          onChange={setVersion}
          options={[
            { value: "4", label: "Version 4 (random)" },
            { value: "7", label: "Version 7 (random, sorts by time)" },
          ]}
        />
        <NumberField label="How many" value={count} onChange={setCount} error={error} hint={`From 1 to ${MAX_UUIDS}.`} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-800">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
          Uppercase
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hyphens} onChange={(e) => setHyphens(e.target.checked)} />
          Hyphens
        </label>
      </div>
      <TextAreaField label="Your UUIDs" value={text} readOnly rows={Math.min(Math.max(ids.length, 3), 14)} mono />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={make} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
          Generate again
        </button>
        <CopyButton text={text} label="Copy all" />
      </div>
      <p className="text-sm text-slate-600">UUIDs are made in this page with your browser&rsquo;s secure random number generator. Nothing is sent anywhere.</p>
    </div>
  );
}
