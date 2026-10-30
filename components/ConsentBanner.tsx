"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CONSENT_OPEN_EVENT, isMeasurementId, readConsent, saveConsent } from "../lib/analytics";

const choice = "rounded-xl px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-offset-2";

/**
 * Asks before any analytics runs. It appears only when the site has a Measurement ID and the visitor has not chosen
 * yet, and can be reopened from the footer. Accepting and declining are equally easy, and declining keeps the whole
 * site working. Ads (T7.7) will add their own choice here.
 */
export default function ConsentBanner({ measurementId, privacyPath }: { measurementId: string; privacyPath?: string }) {
  const pathname = usePathname();
  const enabled = isMeasurementId(measurementId);
  const [current, setCurrent] = useState<boolean | undefined>();
  const [open, setOpen] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  const reopened = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const stored = readConsent();
    setCurrent(stored);
    setOpen(stored === undefined);
    const reopen = () => {
      reopened.current = true;
      setCurrent(readConsent());
      setOpen(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, [enabled]);

  // When opened from the footer, move focus into the panel so keyboard and screen reader users land on it.
  useEffect(() => {
    if (open && reopened.current) region.current?.focus();
  }, [open]);

  if (!enabled || !open || /\/admin\/?$/.test(pathname)) return null;

  function decide(analytics: boolean) {
    saveConsent(analytics);
    setCurrent(analytics);
    setOpen(false);
    reopened.current = false;
  }

  return (
    <div
      ref={region}
      tabIndex={-1}
      role="region"
      aria-label="Analytics choice"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-2xl border border-brand-200 bg-white p-5 shadow-lift outline-none sm:inset-x-6 sm:bottom-6"
    >
      <p className="font-display text-lg font-semibold text-ink">Help us count what is useful?</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-800">
        With your OK, we use Google Analytics to count visits and which tools are used. It sets cookies and sends anonymous usage figures to Google, such as the page and the tool name. It never sees what you type or the files you choose: the tools run in your browser. If you decline, the whole site works the same.{" "}
        {privacyPath && (
          <Link href={privacyPath} className="font-medium text-brand-700 underline">
            Privacy policy
          </Link>
        )}
      </p>
      {current !== undefined && <p className="mt-2 text-sm font-medium text-slate-800">Your current choice: {current ? "analytics allowed" : "analytics declined"}.</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => decide(true)} className={`${choice} bg-brand text-white shadow-soft hover:bg-brand-700`}>
          Allow analytics
        </button>
        <button type="button" onClick={() => decide(false)} className={`${choice} border border-brand text-brand hover:bg-brand-50`}>
          Decline
        </button>
        {current !== undefined && (
          <button type="button" onClick={() => setOpen(false)} className={`${choice} text-slate-700 hover:underline`}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
