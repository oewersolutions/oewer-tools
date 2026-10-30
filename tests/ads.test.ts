import { describe, expect, it } from "vitest";
import { adsActive, adsScriptUrl, articleAdIndex, buildAdsTxt, decideAd, isPublisherId, isSlotId, isSupportedPlacement, SUPPORTED_PLACEMENTS, type AdConfig } from "../lib/ads";

const config = (over: Partial<AdConfig> = {}, row: Partial<AdConfig["placements"][number]> = {}): AdConfig => ({
  adsEnabled: true,
  publisherId: "ca-pub-1234567890123456",
  placements: [{ placement_key: "below_tool", page_type: "tool", enabled: true, ad_unit_id: "1234567890", ...row }],
  ...over,
});

describe("ad IDs", () => {
  it("accepts public ids only", () => {
    expect(isPublisherId("ca-pub-1234567890123456")).toBe(true);
    for (const bad of ["", "ca-pub-123", "pub-1234567890123456", "ca-pub-1234567890123456; x"]) expect(isPublisherId(bad), bad).toBe(false);
    expect(isSlotId("1234567890")).toBe(true);
    for (const bad of ["", "12345", "ca-pub-1", "123456789012345678901"]) expect(isSlotId(bad), bad).toBe(false);
  });
});

describe("supported placements", () => {
  it("covers listing and content pages but never tools themselves, the legal pages or the admin", () => {
    expect(SUPPORTED_PLACEMENTS.page).toBeUndefined();
    expect(isSupportedPlacement("below_tool", "tool")).toBe(true);
    expect(isSupportedPlacement("in_article", "blog_post")).toBe(true);
    expect(isSupportedPlacement("below_tool", "page")).toBe(false);
    expect(isSupportedPlacement("sidebar", "home")).toBe(false);
  });
});

describe("decideAd", () => {
  it("shows an ad only when everything is in place", () => {
    expect(decideAd(config(), "below_tool", "tool")).toEqual({ kind: "ad", publisherId: "ca-pub-1234567890123456", slotId: "1234567890" });
  });
  it("shows nothing when ads are off, there is no publisher id, the placement is off, or the slot is invalid", () => {
    expect(decideAd(config({ adsEnabled: false }), "below_tool", "tool")).toBeNull();
    expect(decideAd(config({ publisherId: "" }), "below_tool", "tool")).toBeNull();
    expect(decideAd(config({}, { enabled: false }), "below_tool", "tool")).toBeNull();
    expect(decideAd(config({}, { ad_unit_id: "" }), "below_tool", "tool")).toBeNull();
    expect(decideAd(config({}, { ad_unit_id: "abc" }), "below_tool", "tool")).toBeNull();
    expect(decideAd(config(), "below_tool", "home")).toBeNull(); // no such row
  });
  it("never shows an ad in a place the pages do not support, even in a preview build", () => {
    expect(decideAd(config({}, { placement_key: "sidebar", page_type: "page" }), "sidebar", "page")).toBeNull();
    expect(decideAd(config(), "sidebar", "page", true)).toBeNull();
  });
  it("a preview build shows a plain space in every supported placement, with no ad code", () => {
    expect(decideAd(config({ adsEnabled: false, publisherId: "" }), "below_tool", "tool", true)).toEqual({ kind: "preview" });
  });
});

describe("articleAdIndex", () => {
  const blocks = (...t: string[]) => t;
  it("gives short articles no ad", () => {
    expect(articleAdIndex(blocks("paragraph", "paragraph", "paragraph", "paragraph", "paragraph"))).toBeNull();
  });
  it("puts the ad after the third block", () => {
    expect(articleAdIndex(Array(8).fill("paragraph"))).toBe(2);
  });
  it("never leaves an ad between a heading and its text", () => {
    expect(articleAdIndex(blocks("paragraph", "paragraph", "heading", "paragraph", "paragraph", "paragraph", "paragraph"))).toBe(3);
  });
  it("never puts an ad in the last two blocks", () => {
    expect(articleAdIndex(blocks("paragraph", "paragraph", "heading", "heading", "heading", "paragraph"))).toBeNull();
  });
});

describe("adsActive", () => {
  it("is true only when a placement could really show an ad", () => {
    expect(adsActive(config())).toBe(true);
    expect(adsActive(config({ adsEnabled: false }))).toBe(false);
    expect(adsActive(config({ publisherId: "" }))).toBe(false);
    expect(adsActive(config({}, { enabled: false }))).toBe(false);
    expect(adsActive(config({}, { ad_unit_id: "" }))).toBe(false);
    expect(adsActive(config({}, { placement_key: "sidebar" }))).toBe(false); // a place the pages cannot show
    expect(adsActive({ adsEnabled: true, publisherId: "ca-pub-1234567890123456", placements: [] })).toBe(false);
  });
});

describe("ads.txt and the ad script address", () => {
  it("publishes the account line Google expects, without the ca- prefix", () => {
    expect(buildAdsTxt("ca-pub-1234567890123456")).toBe("google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
  });
  it("says there is no account when none is set or the id is not valid", () => {
    for (const bad of ["", "ca-pub-1", "pub-1234567890123456"]) expect(buildAdsTxt(bad)).toMatch(/^# No advertising account/);
  });
  it("builds Google's script address only for a valid account", () => {
    expect(adsScriptUrl("ca-pub-1234567890123456")).toBe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456");
    expect(adsScriptUrl("ca-pub-1&x=<script>")).toBeNull();
    expect(adsScriptUrl("")).toBeNull();
  });
});
