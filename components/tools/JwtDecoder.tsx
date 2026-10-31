"use client";

import { useEffect, useState } from "react";
import { decodeJwt, prettyJson, validityAt, type Validity } from "../../lib/tools/jwt";
import { formatInZone } from "../../lib/tools/timestamps";
import { useReportResult } from "./ToolEvents";
import { CopyButton, TextAreaField } from "./ui";

const VALIDITY: Record<Validity, string> = {
  expired: "Expired: the time in the exp claim has passed.",
  "not-yet": "Not valid yet: the nbf claim is still in the future.",
  "in-time": "Within its time window (exp is in the future).",
  "no-expiry": "No exp claim, so this token has no expiry time.",
};

export default function JwtDecoder() {
  const [input, setInput] = useState("");
  const [now, setNow] = useState<number>();
  useEffect(() => setNow(Date.now()), [input]);

  const result = input.trim() === "" ? undefined : decodeJwt(input);
  useReportResult(Boolean(result?.ok));
  const token = result?.ok ? result.token : undefined;

  return (
    <div className="space-y-4">
      <TextAreaField label="Your token" value={input} onChange={setInput} rows={6} mono placeholder="Paste a token that looks like xxxxx.yyyyy.zzzzz" />
      <div role="status" aria-live="polite" className="min-h-6 text-sm">
        {result && !result.ok ? <p className="text-red-800">{result.error}</p> : null}
        {token && <p className="font-medium text-brand">Decoded. The signature has not been checked.</p>}
      </div>
      {token && (
        <>
          {token.warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-gold-300 bg-gold-300/20 p-3 text-sm text-ink">
              {token.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <section aria-label="Header">
              <h2 className="text-sm font-semibold text-slate-800">Header</h2>
              <pre className="mt-1.5 overflow-x-auto rounded-xl border border-line bg-white p-3 font-mono text-sm text-ink" tabIndex={0}>{prettyJson(token.header)}</pre>
            </section>
            <section aria-label="Payload">
              <h2 className="text-sm font-semibold text-slate-800">Payload</h2>
              <pre className="mt-1.5 overflow-x-auto rounded-xl border border-line bg-white p-3 font-mono text-sm text-ink" tabIndex={0}>{prettyJson(token.payload)}</pre>
              <div className="mt-2">
                <CopyButton text={prettyJson(token.payload)} label="Copy payload" />
              </div>
            </section>
          </div>
          {token.times.length > 0 && (
            <section aria-label="Times in the token">
              <h2 className="text-sm font-semibold text-slate-800">Times in the token</h2>
              <dl className="mt-2 space-y-2 text-sm">
                {token.times.map((t) => (
                  <div key={t.claim} className="flex flex-wrap justify-between gap-2 border-t border-line pt-2">
                    <dt className="text-muted">
                      {t.label} ({t.claim})
                    </dt>
                    <dd className="font-mono text-ink">{formatInZone(t.seconds * 1000, "UTC")}</dd>
                  </div>
                ))}
              </dl>
              {now !== undefined && <p className="mt-2 text-sm font-medium text-ink">{VALIDITY[validityAt(token, now / 1000)]}</p>}
            </section>
          )}
          <p className="text-sm text-slate-700">
            Signature (<span className="font-mono">{token.algorithm ?? "no algorithm"}</span>): <span className="break-all font-mono">{token.signature || "none"}</span>
          </p>
        </>
      )}
      <p className="text-sm text-slate-600">Decoding shows what is inside a token; it does not prove the token is genuine. Only the server that holds the key can check the signature. Your token is decoded in this page and is never sent anywhere.</p>
    </div>
  );
}
