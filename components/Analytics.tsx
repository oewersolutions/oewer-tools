"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, isMeasurementId, loadAnalytics, readConsent, stopAnalytics, trackPageView } from "../lib/analytics";

/** Loads analytics after consent and reports page views as visitors move around the site. Renders nothing. */
export default function Analytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const enabled = isMeasurementId(measurementId);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const apply = () => {
      if (readConsent() === true) setLoaded(loadAnalytics(measurementId));
      else {
        stopAnalytics(measurementId);
        setLoaded(false);
      }
    };
    apply();
    window.addEventListener(CONSENT_EVENT, apply);
    return () => window.removeEventListener(CONSENT_EVENT, apply);
  }, [enabled, measurementId]);

  // One page view per page shown, including the first one once consent has been given.
  useEffect(() => {
    if (loaded) trackPageView(pathname, document.title);
  }, [loaded, pathname]);

  return null;
}
