"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CONSENT_EVENT, readAdsConsent } from "../lib/analytics";
import { adsScriptUrl } from "../lib/ads";

type AdsWindow = Window & { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };

let scriptRequested = false;

/**
 * Shows an ad slot, and loads Google's ad script, only after the visitor has allowed ads. Until then (or if they
 * decline) it renders nothing at all, so there is no empty box. Ads are requested as non-personalised, and if
 * consent is withdrawn after ads have loaded the page reloads so none are left behind.
 */
export default function AdConsentGate({ publisherId, children }: { publisherId: string; children: ReactNode }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const apply = () => {
      const yes = readAdsConsent() === true;
      if (!yes && scriptRequested) window.location.reload(); // withdrawn: remove what was loaded
      setAllowed(yes);
    };
    apply();
    window.addEventListener(CONSENT_EVENT, apply);
    return () => window.removeEventListener(CONSENT_EVENT, apply);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const w = window as AdsWindow;
    w.adsbygoogle = w.adsbygoogle ?? [];
    w.adsbygoogle.requestNonPersonalizedAds = 1;
    const url = adsScriptUrl(publisherId);
    if (url && !scriptRequested) {
      scriptRequested = true;
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = url;
      document.head.appendChild(script); // if it is blocked, the slot just stays empty
    }
    try {
      // Ask for the ads in this page's slots that have not been asked for yet.
      document.querySelectorAll("ins.adsbygoogle:not([data-adsbygoogle-status])").forEach(() => w.adsbygoogle!.push({}));
    } catch {
      // a blocked or broken ad script never affects the page
    }
  }, [allowed, publisherId]);

  return allowed ? <>{children}</> : null;
}
