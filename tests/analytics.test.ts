import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_EVENT, CONSENT_KEY, isMeasurementId, loadAnalytics, readConsent, saveConsent, stopAnalytics, trackPageView, trackToolEvent } from "../lib/analytics";

// A minimal browser: storage, a document that records injected scripts, and a window that records events.
function fakeBrowser(storage: Record<string, string> = {}) {
  const scripts: { src: string; async: boolean }[] = [];
  const events: string[] = [];
  const win: Record<string, unknown> = { dispatchEvent: (e: Event) => events.push(e.type) };
  vi.stubGlobal("window", win);
  vi.stubGlobal("CustomEvent", class { constructor(public type: string, public init?: unknown) {} });
  vi.stubGlobal("localStorage", { getItem: (k: string) => storage[k] ?? null, setItem: (k: string, v: string) => void (storage[k] = v) });
  vi.stubGlobal("document", {
    head: { appendChild: (s: { src: string; async: boolean }) => scripts.push(s) },
    createElement: () => ({ src: "", async: false }),
  });
  return { scripts, events, win, storage };
}

const ID = "G-ABC123XYZ4";
const queued = (win: Record<string, unknown>) => (win.dataLayer as unknown[][]).map((a) => Array.from(a as ArrayLike<unknown>));

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("isMeasurementId", () => {
  it("accepts GA4 ids only", () => {
    expect(isMeasurementId(ID)).toBe(true);
    for (const bad of ["", "G-", "G-abc123xyz4", "UA-1234-1", "G-ABC123XYZ4; alert(1)", " G-ABC123XYZ4"]) expect(isMeasurementId(bad)).toBe(false);
  });
});

describe("consent", () => {
  it("is undefined until the visitor chooses, and treats unreadable storage as no consent", () => {
    fakeBrowser();
    expect(readConsent()).toBeUndefined();
    fakeBrowser({ [CONSENT_KEY]: "{not json" });
    expect(readConsent()).toBeUndefined();
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); } });
    expect(readConsent()).toBeUndefined();
  });
  it("remembers a choice and announces it", () => {
    const b = fakeBrowser();
    saveConsent(true);
    expect(readConsent()).toBe(true);
    saveConsent(false);
    expect(readConsent()).toBe(false);
    expect(b.events).toEqual([CONSENT_EVENT, CONSENT_EVENT]);
  });
});

describe("loadAnalytics", () => {
  it("does nothing without consent, with a declined choice, or with an invalid or empty id", async () => {
    const m = await import("../lib/analytics");
    const b = fakeBrowser();
    expect(m.loadAnalytics(ID)).toBe(false); // not asked yet
    expect(m.loadAnalytics(ID, false)).toBe(false);
    expect(m.loadAnalytics("", true)).toBe(false);
    expect(m.loadAnalytics("nope", true)).toBe(false);
    expect(b.scripts).toEqual([]);
    expect(b.win.dataLayer).toBeUndefined();
  });
  it("loads the Google tag once after consent, with advertising storage denied and no automatic page view", async () => {
    const m = await import("../lib/analytics");
    const b = fakeBrowser();
    expect(m.loadAnalytics(ID, true)).toBe(true);
    expect(m.loadAnalytics(ID, true)).toBe(true);
    expect(b.scripts).toHaveLength(1);
    expect(b.scripts[0]!.src).toBe(`https://www.googletagmanager.com/gtag/js?id=${ID}`);
    const calls = queued(b.win);
    expect(calls[0]).toEqual(["consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }]);
    expect(calls.find((c) => c[0] === "config")).toEqual(["config", ID, expect.objectContaining({ send_page_view: false, allow_google_signals: false })]);
  });
  it("can be switched off again when consent is withdrawn", async () => {
    const m = await import("../lib/analytics");
    const b = fakeBrowser();
    m.loadAnalytics(ID, true);
    m.stopAnalytics(ID);
    expect(b.win[`ga-disable-${ID}`]).toBe(true);
    m.loadAnalytics(ID, true);
    expect(b.win[`ga-disable-${ID}`]).toBe(false);
  });
});

describe("events", () => {
  it("send nothing unless analytics is loaded and consented", async () => {
    const m = await import("../lib/analytics");
    const b = fakeBrowser({ [CONSENT_KEY]: JSON.stringify({ analytics: true }) });
    m.trackToolEvent("tool_open", "emi-calculator"); // not loaded yet
    m.trackPageView("/", "Home");
    expect(b.win.dataLayer).toBeUndefined();

    m.loadAnalytics(ID);
    const before = queued(b.win).length;
    m.trackToolEvent("tool_open", "emi-calculator");
    m.trackToolEvent("tool_complete", "emi-calculator");
    m.trackPageView("/tools/", "Tools");
    expect(queued(b.win).slice(before)).toEqual([
      ["event", "tool_open", { tool_name: "emi-calculator" }],
      ["event", "tool_complete", { tool_name: "emi-calculator" }],
      ["event", "page_view", { page_path: "/tools/", page_title: "Tools" }],
    ]);

    b.storage[CONSENT_KEY] = JSON.stringify({ analytics: false }); // consent withdrawn
    const count = queued(b.win).length;
    m.trackToolEvent("tool_open", "emi-calculator");
    expect(queued(b.win)).toHaveLength(count);
  });
  it("exports stable names", () => {
    expect([loadAnalytics, stopAnalytics, trackPageView, trackToolEvent].every((f) => typeof f === "function")).toBe(true);
  });
});
