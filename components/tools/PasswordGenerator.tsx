"use client";

import { useCallback, useEffect, useState } from "react";
import { CHARACTER_SETS, checkOptions, formatBits, generatePassword, MAX_LENGTH, MIN_LENGTH, type CharacterSet, type PasswordRaw } from "../../lib/tools/password";
import { useReportResult } from "./ToolEvents";
import { NumberField, ToolLayout } from "./ui";

const ORDER: CharacterSet[] = ["lower", "upper", "digits", "symbols"];
const browserRandom = (buffer: Uint32Array) => {
  crypto.getRandomValues(buffer);
};

export default function PasswordGenerator() {
  const [raw, setRaw] = useState<PasswordRaw>({ length: "16" });
  const [sets, setSets] = useState<CharacterSet[]>(["lower", "upper", "digits", "symbols"]);
  const [avoidLookalikes, setAvoidLookalikes] = useState(false);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const check = checkOptions(raw, sets, avoidLookalikes);
  const { options } = check;

  // The password is made in the browser after the page loads, and again whenever the choices change or "Generate" is pressed.
  const make = useCallback(() => {
    setCopied("idle");
    setPassword(options ? generatePassword(options, browserRandom) : "");
  }, [options?.length, options?.sets.join(), options?.avoidLookalikes]);
  useEffect(make, [make]);
  useReportResult(password !== "");

  const toggle = (set: CharacterSet) => setSets((s) => (s.includes(set) ? s.filter((x) => x !== set) : ORDER.filter((x) => x === set || s.includes(x))));

  return (
    <ToolLayout
      inputs={
        <>
          <NumberField label="Length" value={raw.length} onChange={(v) => setRaw({ length: v })} error={check.errors.length} hint={`From ${MIN_LENGTH} to ${MAX_LENGTH} characters. Longer is stronger.`} />
          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">Include</legend>
            <div className="mt-2 space-y-2">
              {ORDER.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-slate-800">
                  <input type="checkbox" checked={sets.includes(s)} onChange={() => toggle(s)} />
                  {CHARACTER_SETS[s].label}
                </label>
              ))}
            </div>
            {check.errors.sets && <p className="mt-1 text-sm text-red-800">{check.errors.sets}</p>}
          </fieldset>
          <label className="flex items-start gap-2 text-sm font-medium text-slate-800">
            <input type="checkbox" checked={avoidLookalikes} onChange={(e) => setAvoidLookalikes(e.target.checked)} className="mt-1" />
            <span>
              Avoid look-alike characters
              <span className="block text-xs font-normal text-slate-600">Leaves out I, l, 1, |, O, 0 and o, which are easy to confuse when you read or type a password by hand.</span>
            </span>
          </label>
          <p className="text-sm text-muted">The password is made in this page using your browser&rsquo;s secure random number generator. It is not stored or sent anywhere.</p>
        </>
      }
      results={
        password ? (
          <div className="space-y-4">
            <div>
              <p className="t-eyebrow">Your password</p>
              <p data-testid="generated-password" className="mt-2 break-all rounded-xl bg-white px-4 py-3 font-mono text-lg text-ink ring-1 ring-line">
                {password}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={make} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
                Generate another
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(password);
                    setCopied("copied");
                  } catch {
                    setCopied("failed");
                  }
                }}
                className="rounded-lg border border-brand px-3.5 py-2 text-sm font-medium text-brand transition hover:bg-brand-50"
              >
                Copy
              </button>
              <span className="text-sm text-slate-700">{copied === "copied" ? "Copied" : copied === "failed" ? "Could not copy. Select the password and copy it yourself." : ""}</span>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-t border-line pt-3">
                <dt className="text-muted">Strength</dt>
                <dd className="font-medium text-ink">{check.strength}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-3">
                <dt className="text-muted">Estimated strength in bits</dt>
                <dd className="font-medium text-ink">{formatBits(check.bits ?? 0)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-3">
                <dt className="text-muted">Characters to choose from</dt>
                <dd className="font-medium text-ink">{check.pool}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-muted">Choose a length and at least one kind of character to make a password.</p>
        )
      }
    />
  );
}
