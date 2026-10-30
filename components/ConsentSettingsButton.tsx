"use client";

import { CONSENT_OPEN_EVENT, isMeasurementId } from "../lib/analytics";

/** Footer link that reopens the analytics choice. Shown only when the site has analytics switched on. */
export default function ConsentSettingsButton({ measurementId }: { measurementId: string }) {
  if (!isMeasurementId(measurementId)) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT))} className="text-sm text-brand-100 transition hover:text-white hover:underline">
      Analytics settings
    </button>
  );
}
