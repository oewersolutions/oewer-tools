"use client";

import { useEffect, useState } from "react";
import { formatInZone, parseDateTime, parseTimestamp, relativeTime, toIso, type TimeUnit } from "../../lib/tools/timestamps";
import { useReportResult } from "./ToolEvents";
import { CopyButton, SelectField } from "./ui";

type Mode = "to-date" | "to-timestamp";
const field = "mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition focus:border-brand-500 aria-[invalid=true]:border-red-700";

export default function TimestampConverter() {
  const [mode, setMode] = useState<Mode>("to-date");
  const [stamp, setStamp] = useState("");
  const [unit, setUnit] = useState<TimeUnit>("auto");
  const [dateTime, setDateTime] = useState("");
  const [as, setAs] = useState<"utc" | "local">("utc");
  const [zone, setZone] = useState<string>();
  const [now, setNow] = useState<number>();
  // The device's time zone and the current time are read after the page loads, so the static page is the same for everyone.
  useEffect(() => {
    setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setNow(Date.now());
  }, []);

  const parsed = mode === "to-date" ? (stamp.trim() === "" ? undefined : parseTimestamp(stamp, unit)) : dateTime === "" ? undefined : parseDateTime(dateTime, as);
  const ms = parsed?.ok ? parsed.ms : undefined;
  const error = parsed && !parsed.ok ? parsed.error : undefined;
  useReportResult(ms !== undefined);

  const rows: [string, string][] =
    ms === undefined
      ? []
      : [
          ["Unix time (seconds)", String(Math.floor(ms / 1000))],
          ["Unix time (milliseconds)", String(ms)],
          ["UTC", formatInZone(ms, "UTC")],
          ["ISO 8601", toIso(ms)],
          ["India (Asia/Kolkata)", formatInZone(ms, "Asia/Kolkata")],
          ...(zone && zone !== "Asia/Kolkata" && zone !== "UTC" ? ([[`Your time zone (${zone})`, formatInZone(ms, zone)]] as [string, string][]) : []),
          ...(now !== undefined ? ([["Compared with now", relativeTime(ms, now)]] as [string, string][]) : []),
        ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={(e) => e.preventDefault()} className="panel space-y-5 p-6 sm:p-8">
        <SelectField
          label="Convert"
          value={mode}
          onChange={setMode}
          options={[
            { value: "to-date", label: "Unix timestamp to date" },
            { value: "to-timestamp", label: "Date and time to Unix timestamp" },
          ]}
        />
        {mode === "to-date" ? (
          <>
            <div>
              <label htmlFor="ts-input" className="block text-sm font-semibold text-slate-800">
                Unix timestamp
              </label>
              <input id="ts-input" type="text" inputMode="numeric" autoComplete="off" value={stamp} onChange={(e) => setStamp(e.target.value)} placeholder="1700000000" aria-invalid={error ? true : undefined} aria-describedby="ts-error" className={`${field} font-mono`} />
              <p id="ts-error" className="mt-1 min-h-5 text-sm text-red-800">
                {error}
              </p>
            </div>
            <SelectField
              label="Unit"
              value={unit}
              onChange={setUnit}
              options={[
                { value: "auto", label: "Detect (100 billion or more is milliseconds)" },
                { value: "seconds", label: "Seconds" },
                { value: "milliseconds", label: "Milliseconds" },
              ]}
            />
          </>
        ) : (
          <>
            <div>
              <label htmlFor="ts-date" className="block text-sm font-semibold text-slate-800">
                Date and time
              </label>
              <input id="ts-date" type="datetime-local" step={1} value={dateTime} onChange={(e) => setDateTime(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby="ts-date-error" className={field} />
              <p id="ts-date-error" className="mt-1 min-h-5 text-sm text-red-800">
                {error}
              </p>
            </div>
            <SelectField
              label="This time is in"
              value={as}
              onChange={setAs}
              options={[
                { value: "utc", label: "UTC" },
                { value: "local", label: `Your time zone${zone ? ` (${zone})` : ""}` },
              ]}
            />
          </>
        )}
        <button
          type="button"
          onClick={() => {
            const t = Date.now();
            setNow(t);
            if (mode === "to-date") setStamp(String(Math.floor(t / 1000)));
            else {
              const d = new Date(t);
              const p = (n: number) => String(n).padStart(2, "0");
              setDateTime(as === "utc" ? `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}` : `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
            }
          }}
          className="rounded-lg border border-brand px-3.5 py-2 text-sm font-medium text-brand transition hover:bg-brand-50"
        >
          Use the current time
        </button>
        <p className="text-sm text-muted">Everything is worked out in this page. Nothing is sent anywhere.</p>
      </form>
      <div role="status" aria-live="polite" className="panel bg-surface p-6 sm:p-8">
        {rows.length ? (
          <dl className="space-y-3">
            {rows.map(([label, value]) => (
              <div key={label} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 first:border-0 first:pt-0">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="flex items-center gap-2">
                  <span className="font-mono text-sm text-ink">{value}</span>
                  {(label.startsWith("Unix") || label === "ISO 8601") && <CopyButton text={value} label={`Copy ${label}`} insideStatus />}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-muted">{mode === "to-date" ? "Enter a Unix timestamp to see the date." : "Choose a date and time to see the Unix timestamp."}</p>
        )}
      </div>
    </div>
  );
}
