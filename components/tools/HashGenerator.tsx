"use client";

import { useEffect, useState } from "react";
import { HASH_ALGORITHMS, hashText, sameHash, type HashAlgorithm } from "../../lib/tools/hash";
import { useReportResult } from "./ToolEvents";
import { CopyButton, TextAreaField } from "./ui";

export default function HashGenerator() {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<Partial<Record<HashAlgorithm, string>>>({});
  const [failed, setFailed] = useState(false);
  const [compare, setCompare] = useState("");

  useEffect(() => {
    let current = true;
    Promise.all(HASH_ALGORITHMS.map(async (a) => [a, await hashText(input, a)] as const))
      .then((pairs) => {
        if (!current) return;
        setHashes(Object.fromEntries(pairs));
        setFailed(false);
      })
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [input]);
  useReportResult(input !== "" && !failed);

  const matches = compare.trim() === "" ? undefined : HASH_ALGORITHMS.find((a) => hashes[a] && sameHash(compare, hashes[a]!));

  return (
    <div className="space-y-4">
      <TextAreaField label="Your text" value={input} onChange={setInput} rows={6} mono placeholder="Type or paste text here" />
      <div role="status" aria-live="polite" className="min-h-6 text-sm">
        {failed ? <p className="text-red-800">Your browser cannot make hashes on this page. Use a recent browser on a secure (https) page.</p> : null}
      </div>
      <dl className="space-y-3">
        {HASH_ALGORITHMS.map((a) => (
          <div key={a} className="rounded-xl border border-line bg-white p-3">
            <dt className="text-sm font-semibold text-slate-800">
              {a}
              {a === "SHA-1" && <span className="ml-2 font-normal text-slate-600">(old: fine for checksums, not for security)</span>}
            </dt>
            <dd className="mt-1">
              <span className="block break-all font-mono text-sm text-ink">{hashes[a] ?? ""}</span>
              <span className="mt-2 block">
                <CopyButton text={hashes[a] ?? ""} label={`Copy ${a}`} />
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <div>
        <TextAreaField label="Compare with a hash you were given (optional)" value={compare} onChange={setCompare} rows={2} mono placeholder="Paste a hash here" />
        <p aria-live="polite" className="mt-1 min-h-6 text-sm">
          {compare.trim() === "" ? null : matches ? <span className="font-medium text-brand">Matches the {matches} hash of your text.</span> : <span className="text-red-800">Does not match any of the hashes above.</span>}
        </p>
      </div>
      <p className="text-sm text-slate-600">The text is converted to bytes as UTF-8 and hashed in this page. It is never sent anywhere. Do not use these plain hashes to store passwords.</p>
    </div>
  );
}
