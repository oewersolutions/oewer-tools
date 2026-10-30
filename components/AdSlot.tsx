import { getAdConfig } from "../lib/content";
import AdConsentGate from "./AdConsentGate";
import { decideAd } from "../lib/ads";

/**
 * A labelled, fixed-height space for one ad placement. Renders nothing unless the workbook switches the placement on
 * (see `decideAd`), so pages are unchanged until then. The reserved height stops the page jumping when an ad loads,
 * and the box is never sticky, never overlaps content and is always marked as an advertisement.
 */
export default function AdSlot({ placement, pageType }: { placement: string; pageType: string }) {
  const decision = decideAd(getAdConfig(), placement, pageType, process.env.OEWER_PREVIEW_ADS === "1");
  if (!decision) return null;

  const box = (
    <aside aria-label="Advertisement" data-ad-placement={placement} className="mx-auto my-12 w-full max-w-3xl clear-both">
      <p className="text-center text-xs font-medium uppercase tracking-wider text-slate-600">Advertisement</p>
      <div className="mt-2 flex min-h-[250px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-brand-200 bg-brand-50/60">
        {decision.kind === "ad" ? (
          <ins className="adsbygoogle" style={{ display: "block", width: "100%" }} data-ad-client={decision.publisherId} data-ad-slot={decision.slotId} data-ad-format="auto" data-full-width-responsive="true" />
        ) : (
          <span className="text-sm text-slate-600">Ad space (preview)</span>
        )}
      </div>
    </aside>
  );
  // A real ad is shown only once the visitor has allowed ads; the preview box needs no consent.
  return decision.kind === "ad" ? <AdConsentGate publisherId={decision.publisherId}>{box}</AdConsentGate> : box;
}
