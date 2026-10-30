"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CONSENT_OPEN_EVENT, isMeasurementId, readAdsConsent, readConsent, saveConsent } from "../lib/analytics";

const choice = "rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-offset-2";

/**
 * Asks before any analytics or ads run. It appears only when the site has a Measurement ID, or ads are really switched
 * on, and the visitor has not chosen yet; it can be reopened from the footer. Accepting and declining are equally easy,
 * and declining keeps the whole site working. With only analytics it is a single question; when ads are on it asks
 * about analytics and ads separately.
 */
export default function ConsentBanner({ measurementId, privacyPath, adsActive = false }: { measurementId: string; privacyPath?: string; adsActive?: boolean }) {
  const pathname = usePathname();
  const analyticsOn = isMeasurementId(measurementId);
  const enabled = analyticsOn || adsActive;
  const [current, setCurrent] = useState<boolean | undefined>();
  const [currentAds, setCurrentAds] = useState<boolean | undefined>();
  const [pickAnalytics, setPickAnalytics] = useState(false);
  const [pickAds, setPickAds] = useState(false);
  const [open, setOpen] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  const reopened = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const load = () => {
      setCurrent(readConsent());
      setCurrentAds(readAdsConsent());
      setPickAnalytics(readConsent() === true);
      setPickAds(readAdsConsent() === true);
    };
    load();
    setOpen((analyticsOn && readConsent() === undefined) || (adsActive && readAdsConsent() === undefined));
    const reopen = () => {
      reopened.current = true;
      load();
      setOpen(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, [enabled, analyticsOn, adsActive]);

  // When opened from the footer, move focus into the panel so keyboard and screen reader users land on it.
  useEffect(() => {
    if (open && reopened.current) region.current?.focus();
  }, [open]);

  if (!enabled || !open || /\/admin\/?$/.test(pathname)) return null;

  function decide(analytics: boolean, ads?: boolean) {
    saveConsent(analytics, ads);
    setCurrent(analytics);
    if (ads !== undefined) setCurrentAds(ads);
    setOpen(false);
    reopened.current = false;
  }

  if (adsActive) {
    const box = "mt-0.5 size-4 shrink-0 accent-[#174f49]";
    return (
      <div ref={region} tabIndex={-1} role="region" aria-label="Privacy choices" className="fixed inset-x-3 bottom-3 z-40 mx-auto max-h-[85vh] max-w-3xl overflow-y-auto rounded-2xl border border-brand-200 bg-white p-5 shadow-lift outline-none sm:inset-x-6 sm:bottom-6">
        <p className="font-display text-lg font-semibold text-ink">Your privacy choices</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-800">
          Optional extras, your call. Our tools never see your files or text, and if you decline both the site works the same.{" "}
          {privacyPath && (
            <Link href={privacyPath} className="font-medium text-brand-700 underline">
              Privacy policy
            </Link>
          )}
        </p>
        <div className="mt-3 space-y-2 text-sm text-slate-800">
          {analyticsOn && (
            <label className="flex items-start gap-2.5">
              <input type="checkbox" className={box} checked={pickAnalytics} onChange={(e) => setPickAnalytics(e.target.checked)} />
              <span>
                <strong>Analytics.</strong> Counts visits and tool names (Google Analytics, uses cookies).
              </span>
            </label>
          )}
          <label className="flex items-start gap-2.5">
            <input type="checkbox" className={box} checked={pickAds} onChange={(e) => setPickAds(e.target.checked)} />
            <span>
              <strong>Ads.</strong> Help pay for the site (Google AdSense, not personalised, may set cookies).
            </span>
          </label>
        </div>
        {(current !== undefined || currentAds !== undefined) && (
          <p className="mt-2 text-sm font-medium text-slate-800">
            Your current choices: {analyticsOn ? `analytics ${current ? "allowed" : "declined"}, ` : ""}ads {currentAds ? "allowed" : "declined"}.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button type="button" onClick={() => decide(analyticsOn, true)} className={`${choice} bg-brand text-white shadow-soft hover:bg-brand-700`}>
            Allow all
          </button>
          <button type="button" onClick={() => decide(false, false)} className={`${choice} border border-brand text-brand hover:bg-brand-50`}>
            Decline all
          </button>
          <button type="button" onClick={() => decide(analyticsOn && pickAnalytics, pickAds)} className={`${choice} border border-brand text-brand hover:bg-brand-50`}>
            Save my choices
          </button>
          {(current !== undefined || currentAds !== undefined) && (
            <button type="button" onClick={() => setOpen(false)} className={`${choice} text-slate-700 hover:underline`}>
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={region}
      tabIndex={-1}
      role="region"
      aria-label="Analytics choice"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-h-[85vh] max-w-3xl overflow-y-auto rounded-2xl border border-brand-200 bg-white p-5 shadow-lift outline-none sm:inset-x-6 sm:bottom-6"
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
