"use client";

import { useEffect, useState } from "react";

/**
 * Copy the address, or send it by email. No third-party share buttons: they load other sites' scripts and track
 * visitors, which this site promises not to do.
 */
export function ShareLinks({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const chip =
    "rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:border-ink";

  useEffect(() => setUrl(window.location.href), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked: the address is still in the address bar
    }
  }

  return (
    <div>
      <p className="t-eyebrow">Share</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void copy()} className={chip}>
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`}
          className={chip}
        >
          Email
        </a>
      </div>
      <p role="status" className="sr-only">
        {copied ? "Link copied" : ""}
      </p>
    </div>
  );
}
