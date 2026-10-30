/**
 * Google Analytics 4, loaded only when the workbook has a Measurement ID and the visitor has accepted analytics.
 * Nothing here runs on the server, and every function is a safe no-op when analytics is off or blocked, so the
 * site never depends on it. Events carry the tool's name only, never what the visitor typed or chose.
 */

export const CONSENT_KEY = "oewer-consent";
export const CONSENT_EVENT = "oewer-consent-change";
/** Asks the consent banner to open so a visitor can change their choice. */
export const CONSENT_OPEN_EVENT = "oewer-consent-open";

/** A GA4 Measurement ID such as G-ABC123XYZ4. Empty means analytics is switched off. */
export const isMeasurementId = (value: string): boolean => /^G-[A-Z0-9]{6,12}$/.test(value);

/** Where a person can read the reports: an https address only, so a setting can never become a script link. */
export function isDashboardUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export type ToolEventName = "tool_open" | "tool_complete";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/** The visitor's choice: true accepted, false declined, undefined not asked yet. */
export function readConsent(): boolean | undefined {
  try {
    const value = (JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null") as { analytics?: unknown } | null)?.analytics;
    return typeof value === "boolean" ? value : undefined;
  } catch {
    return undefined; // storage blocked or unreadable: treat as not consented
  }
}

export function saveConsent(analytics: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics, at: new Date().toISOString() }));
  } catch {
    // choice cannot be remembered; it still applies to this page view below
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { analytics } }));
}

let loadedId: string | undefined;

/** Inject the Google tag once. Returns false when analytics is off, not consented, or the id is invalid. */
export function loadAnalytics(measurementId: string, consent: boolean | undefined = readConsent()): boolean {
  if (typeof document === "undefined" || consent !== true || !isMeasurementId(measurementId)) return false;
  (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = false; // consent given again after a withdrawal
  if (loadedId === measurementId) return true;
  loadedId = measurementId;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args); // gtag.js expects the arguments object pushed as-is
  } as Gtag;
  // Only measurement is allowed; advertising storage stays denied until ads are switched on (T7.7).
  window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script); // if it is blocked, gtag still queues harmlessly
  return true;
}

/** Names of Google Analytics cookies in a `document.cookie` string: `_ga` and `_ga_<container>`. */
export const analyticsCookieNames = (cookie: string): string[] =>
  cookie
    .split(";")
    .map((c) => c.split("=")[0]!.trim())
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));

/** Expire the analytics cookies on this host and its parent domains, so withdrawing consent leaves none behind. */
export function clearAnalyticsCookies(): void {
  const host = location.hostname;
  const parts = host.split(".");
  const domains = [undefined, ...parts.slice(0, -1).map((_, i) => `.${parts.slice(i).join(".")}`)];
  for (const name of analyticsCookieNames(document.cookie)) {
    for (const domain of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ""}`;
  }
}

/** Stop sending, e.g. when consent is withdrawn, and remove the analytics cookies. */
export function stopAnalytics(measurementId: string): void {
  (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = true;
  clearAnalyticsCookies();
}

const active = (): boolean => loadedId !== undefined && typeof window.gtag === "function" && readConsent() === true;

export function trackPageView(path: string, title: string): void {
  if (active()) window.gtag!("event", "page_view", { page_path: path, page_title: title });
}

/** `tool` is the tool's address slug, e.g. "emi-calculator". */
export function trackToolEvent(name: ToolEventName, tool: string): void {
  if (active()) window.gtag!("event", name, { tool_name: tool });
}
