"use client";

import { useEffect, type ReactNode } from "react";
import { adsScriptUrl } from "../lib/ads";

type AdsWindow = Window & { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };

let scriptRequested = false;

/**
 * Shows an ad slot and loads Google's ad script. Ads are not behind a visitor choice (the privacy choices panel is
 * about analytics only), and they are requested as non-personalised.
 */
export default function AdConsentGate({ publisherId, children }: { publisherId: string; children: ReactNode }) {
  useEffect(() => {
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
  }, [publisherId]);

  return <>{children}</>;
}
