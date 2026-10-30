/**
 * Ad placements. The `advertisements` sheet decides which placements are on; this file decides where the code can
 * actually put one. Ads are never placed inside a tool, next to its buttons, over content, or on the legal pages.
 */

/** The placements the pages can show, by page type. */
export const SUPPORTED_PLACEMENTS: Record<string, readonly string[]> = {
  home: ["top_banner", "mid_page"],
  tool_category: ["list_bottom"],
  tool: ["below_tool"],
  blog_index: ["list_bottom"],
  blog_post: ["in_article"],
};

export const isSupportedPlacement = (placementKey: string, pageType: string): boolean => SUPPORTED_PLACEMENTS[pageType]?.includes(placementKey) ?? false;

/** A public AdSense publisher ID such as ca-pub-1234567890123456. */
export const isPublisherId = (value: string): boolean => /^ca-pub-\d{16}$/.test(value);
/** A public ad slot number. */
export const isSlotId = (value: string): boolean => /^\d{6,20}$/.test(value);

export interface AdRow {
  placement_key: string;
  page_type: string;
  enabled: boolean;
  ad_unit_id: string;
}

export interface AdConfig {
  adsEnabled: boolean;
  publisherId: string;
  placements: AdRow[];
}

export type AdDecision = { kind: "ad"; publisherId: string; slotId: string } | { kind: "preview" } | null;

/**
 * Whether a placement shows. All of these must hold: ads are switched on for the site, a publisher ID is set, the
 * placement is enabled and has a valid slot number. A preview build (OEWER_PREVIEW_ADS) instead shows a plain
 * "Ad space" box in every supported placement, to check layouts before there is an ad account.
 */
export function decideAd(config: AdConfig, placementKey: string, pageType: string, preview = false): AdDecision {
  if (!isSupportedPlacement(placementKey, pageType)) return null;
  if (preview) return { kind: "preview" };
  if (!config.adsEnabled || !isPublisherId(config.publisherId)) return null;
  const row = config.placements.find((p) => p.placement_key === placementKey && p.page_type === pageType);
  if (!row || !row.enabled || !isSlotId(row.ad_unit_id)) return null;
  return { kind: "ad", publisherId: config.publisherId, slotId: row.ad_unit_id };
}

/** Minimum number of blocks before an article gets an ad, so short articles stay clean. */
export const MIN_BLOCKS_FOR_AD = 6;

/**
 * Index of the block an in-article ad goes after: roughly the third block, moved down one if that block is a heading
 * (so an ad never sits between a heading and its text), and never within the last two blocks.
 */
export function articleAdIndex(blockTypes: string[]): number | null {
  if (blockTypes.length < MIN_BLOCKS_FOR_AD) return null;
  let index = 2;
  while (index < blockTypes.length - 2 && blockTypes[index] === "heading") index++;
  return index < blockTypes.length - 2 ? index : null;
}

/** True when at least one placement could really show an ad, so the site needs to ask about advertising. */
export function adsActive(config: AdConfig): boolean {
  return SUPPORTED_ENTRIES.some(([key, pageType]) => decideAd(config, key, pageType) !== null);
}
const SUPPORTED_ENTRIES: [string, string][] = Object.entries(SUPPORTED_PLACEMENTS).flatMap(([pageType, keys]) => keys.map((key): [string, string] => [key, pageType]));

/** The line AdSense asks every site to publish at /ads.txt, so only your account can sell your ad space. */
export function buildAdsTxt(publisherId: string): string {
  return isPublisherId(publisherId) ? `google.com, ${publisherId.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n` : "# No advertising account is connected to this site yet.\n";
}

/** Address of Google's ad script for an account. Never built for an invalid id. */
export const adsScriptUrl = (publisherId: string): string | null => (isPublisherId(publisherId) ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}` : null);
