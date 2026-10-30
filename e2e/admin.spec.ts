import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { applyChanges, findRecord } from "../lib/admin/changes";
import { loadWorkbook, readCell, saveWorkbook } from "../lib/admin/edit";
import type { Schema } from "../lib/workbook/types";

// The schema is read from disk: the test runner cannot import a .json module the way the app does.
const schema = JSON.parse(readFileSync(resolve("schemas/workbook_schema.json"), "utf-8")) as Schema;

// A pretend GitHub: the admin page is exercised end to end without touching the real repository.
const WORKBOOK = readFileSync(resolve("data/oewer_database.xlsx"));
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,PUT,OPTIONS" };

interface Fake {
  puts: { headers: Record<string, string>; body: { message: string; content: string; sha: string; branch: string } }[];
  gets: string[];
  /** The workbook GitHub currently holds. */
  current(): Buffer;
}

const SHAS = ["a", "b", "c", "d", "e"].map((c) => c.repeat(40));

async function fakeGithub(
  page: Page,
  opts: { push?: boolean; token?: string; /** Another editor saves just before the person's first save. */ concurrent?: (bytes: Buffer) => Promise<Buffer> } = {},
): Promise<Fake> {
  let bytes: Buffer = WORKBOOK;
  let version = 0;
  let concurrentDone = false;
  const fake: Fake = { puts: [], gets: [], current: () => bytes };
  const json = (body: unknown, status = 200) => ({ status, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(body) });
  const file = "/repos/acme/site/contents/data/oewer_database.xlsx";

  await page.route("https://api.github.com/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (request.headers().authorization !== `Bearer ${opts.token ?? "github_pat_GOOD"}`) return route.fulfill(json({ message: "Bad credentials" }, 401));

    if (request.method() === "GET") fake.gets.push(url.pathname);
    if (request.method() === "GET" && url.pathname === "/repos/acme/site") return route.fulfill(json({ full_name: "acme/site", permissions: { push: opts.push ?? true } }));
    if (request.method() === "GET" && url.pathname === file) return route.fulfill(json({ type: "file", sha: SHAS[version], size: bytes.length }));
    if (request.method() === "GET" && url.pathname === `/repos/acme/site/git/blobs/${SHAS[version]}`) return route.fulfill(json({ encoding: "base64", content: bytes.toString("base64") }));
    if (request.method() === "PUT" && url.pathname === file) {
      const body = request.postDataJSON();
      if (opts.concurrent && !concurrentDone) {
        concurrentDone = true;
        bytes = await opts.concurrent(bytes); // someone else saved first
        version++;
      }
      if (body.sha !== SHAS[version]) return route.fulfill(json({ message: `${file} does not match ${body.sha}` }, 409));
      fake.puts.push({ headers: request.headers(), body });
      bytes = Buffer.from(body.content, "base64");
      version++;
      return route.fulfill(json({ content: { sha: SHAS[version] }, commit: { sha: "c".repeat(40), html_url: "https://github.com/acme/site/commit/ccc" } }));
    }
    return route.fulfill(json({ message: "Not Found" }, 404));
  });
  return fake;
}

/** A copy of the workbook with one cell changed, as another editor would save it. */
const withCell = (sheet: string, pk: string, column: string, value: string) => async (bytes: Buffer): Promise<Buffer> => {
  const wb = await loadWorkbook(new Uint8Array(bytes));
  const before = readCell(wb, schema, { sheet, row: findRecord(wb, schema, sheet, pk), column });
  applyChanges(wb, schema, [{ type: "set", sheet, pk, column, before, after: value }]);
  return Buffer.from(await saveWorkbook(wb));
};

async function addChange(page: Page, sheet: string, row: string, column: string, value: string) {
  await page.getByLabel("Sheet").selectOption(sheet);
  await page.getByLabel("Row", { exact: true }).fill(row);
  await page.getByLabel("Column").selectOption(column);
  await page.getByLabel("New value").fill(value);
  await page.getByRole("button", { name: "Add to pending changes" }).click();
}

async function signIn(page: Page, token = "github_pat_GOOD") {
  await page.goto("/admin/");
  await page.getByLabel("Repository (owner/name)").fill("acme/site");
  await page.getByLabel("Branch").fill("main");
  await page.getByLabel("GitHub token").fill(token);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("the admin page is hidden from search engines, the sitemap and the navigation", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const sitemap = readFileSync(resolve("out/sitemap.xml"), "utf-8");
  expect(sitemap).not.toContain("/admin");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /admin/i })).toHaveCount(0);
});

test("signing in loads the workbook and checks it", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Signed in to acme/site" })).toBeVisible();
  await expect(page.getByText("The workbook is valid.")).toBeVisible();
  await expect(page.getByText("version aaaaaaa")).toBeVisible();
  await expect(page.getByLabel("GitHub token")).toHaveCount(0); // the token field is gone
});

test("a wrong token gets a clear message and no workbook", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page, "github_pat_WRONG");
  await expect(page.getByText(/did not accept the token/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Signed in/ })).toHaveCount(0);
});

test("editing a cell saves one commit with the previous version's SHA", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await addChange(page, "tools", "2", "name", "Image Squeezer");
  await expect(page.getByText(/tools TOOL0001, name: .* → Image Squeezer/)).toBeVisible();
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();

  expect(fake.puts).toHaveLength(1);
  const put = fake.puts[0]!;
  expect(put.body.sha).toBe(SHAS[0]);
  expect(put.body.branch).toBe("main");
  expect(put.body.message).toBe("Admin: update tools TOOL0001 name");
  expect(put.headers.authorization).toBe("Bearer github_pat_GOOD");
  await expect(page.getByText("version bbbbbbb")).toBeVisible();
  await expect(page.getByText(/Pending changes \(0\)/)).toBeVisible();
});

test("several changes are saved together as one commit", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await addChange(page, "tools", "2", "name", "One");
  await addChange(page, "tools", "3", "name", "Two");
  await addChange(page, "tools", "2", "name", "One again"); // same cell: replaces the earlier change
  await expect(page.getByText(/Pending changes \(2\)/)).toBeVisible();
  await page.getByRole("button", { name: "Save 2 changes to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  expect(fake.puts).toHaveLength(1);
  expect(fake.puts[0]!.body.message).toBe("Admin: update tools TOOL0001 name and 1 more change");
});

test("a pending change can be removed before saving", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await addChange(page, "tools", "2", "name", "One");
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText(/Pending changes \(0\)/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Save .* to GitHub/ })).toHaveCount(0);
  expect(fake.puts).toHaveLength(0);
});

test("a change that would make the workbook invalid is refused and nothing is sent", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await addChange(page, "tools", "2", "status", "live");
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText(/would leave \d+ problem/)).toBeVisible();
  expect(fake.puts).toHaveLength(0);
  await expect(page.getByText(/Pending changes \(1\)/)).toBeVisible(); // your change is kept so you can fix it
});

test("a wrong kind of value is caught as soon as it is added", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await addChange(page, "tools", "2", "featured", "maybe");
  await expect(page.getByText(/must be true or false/)).toBeVisible();
  await expect(page.getByText(/Pending changes \(0\)/)).toBeVisible();
});

test("when someone saved a different cell first, your change is merged and saved", async ({ page }) => {
  const fake = await fakeGithub(page, { concurrent: withCell("tools", "TOOL0002", "name", "Their edit") });
  await signIn(page);
  await addChange(page, "tools", "2", "name", "My edit");
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText(/merged with newer changes made by someone else/)).toBeVisible();

  const final = await loadWorkbook(new Uint8Array(fake.current()));
  expect(readCell(final, schema, { sheet: "tools", row: findRecord(final, schema, "tools", "TOOL0001"), column: "name" })).toBe("My edit");
  expect(readCell(final, schema, { sheet: "tools", row: findRecord(final, schema, "tools", "TOOL0002"), column: "name" })).toBe("Their edit");
});

test("when someone changed the same cell, you choose and your edit is not lost", async ({ page }) => {
  const fake = await fakeGithub(page, { concurrent: withCell("tools", "TOOL0001", "name", "Their name") });
  await signIn(page);
  await addChange(page, "tools", "2", "name", "My name");
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();

  await expect(page.getByText(/Someone else changed the workbook on GitHub/)).toBeVisible();
  await expect(page.getByText("Their name")).toBeVisible(); // what is on GitHub now
  expect(fake.puts).toHaveLength(0); // nothing was overwritten
  await expect(page.getByText(/Pending changes \(1\)/)).toBeVisible(); // and your edit is still here
  await expect(page.getByRole("button", { name: "Apply my choices and save" })).toBeDisabled();

  await page.getByLabel("Use my version (overwrite theirs)").check();
  await page.getByRole("button", { name: "Apply my choices and save" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  const final = await loadWorkbook(new Uint8Array(fake.current()));
  expect(readCell(final, schema, { sheet: "tools", row: findRecord(final, schema, "tools", "TOOL0001"), column: "name" })).toBe("My name");
});

test("choosing to keep their version drops your change", async ({ page }) => {
  const fake = await fakeGithub(page, { concurrent: withCell("tools", "TOOL0001", "name", "Their name") });
  await signIn(page);
  await addChange(page, "tools", "2", "name", "My name");
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await page.getByLabel("Keep what is on GitHub (drop my change)").check();
  await page.getByRole("button", { name: "Apply my choices and save" }).click();
  await expect(page.getByText(/Pending changes \(0\)/)).toBeVisible();
  const final = await loadWorkbook(new Uint8Array(fake.current()));
  expect(readCell(final, schema, { sheet: "tools", row: findRecord(final, schema, "tools", "TOOL0001"), column: "name" })).toBe("Their name");
  expect(fake.puts).toHaveLength(0);
});

test("a read-only token is told it cannot save", async ({ page }) => {
  await fakeGithub(page, { push: false });
  await signIn(page);
  await expect(page.getByText(/can only read the repository/)).toBeVisible();
  await addChange(page, "tools", "2", "name", "X");
  await expect(page.getByRole("button", { name: "Save 1 change to GitHub" })).toBeDisabled();
});

test("signing out forgets the token", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("GitHub token")).toHaveValue("");
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
  expect(stored).not.toContain("github_pat");
});

test("the token is never written to browser storage by default", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Signed in to acme/site" })).toBeVisible();
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
  expect(stored).not.toContain("github_pat");
});

test("the admin page has no accessibility violations, signed out or signed in", async ({ page }) => {
  await fakeGithub(page);
  const scan = async () => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  await page.goto("/admin/");
  expect(await scan()).toEqual([]);
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Signed in to acme/site" })).toBeVisible();
  expect(await scan()).toEqual([]);
});

// ---- Token handling and Content Security Policy (T5.2) ----

const csp = (page: Page) => page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");

test("the admin page has a strict Content Security Policy", async ({ page }) => {
  await page.goto("/admin/");
  const policy = (await csp(page))!;
  expect(policy).toContain("default-src 'none'");
  expect(policy).toContain("connect-src 'self' https://api.github.com");
  expect(policy).not.toContain("unsafe-inline");
  expect(policy).not.toContain("unsafe-eval");
  expect(policy).toMatch(/script-src 'self' 'sha256-/);
});

test("the whole sign-in and save flow runs without breaking the policy", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __violations: string[] }).__violations = [];
    document.addEventListener("securitypolicyviolation", (e) => (window as unknown as { __violations: string[] }).__violations.push(`${e.violatedDirective}: ${e.blockedURI}`));
  });
  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  await fakeGithub(page);
  await signIn(page);
  await addChange(page, "tools", "2", "name", "Policy check");
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations)).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("an inline script that is not part of the page cannot run", async ({ page }) => {
  await page.goto("/admin/");
  const ran = await page.evaluate(async () => {
    const w = window as unknown as { __injected?: boolean };
    const s = document.createElement("script");
    s.textContent = "window.__injected = true";
    document.head.appendChild(s);
    await new Promise((r) => setTimeout(r, 200));
    return w.__injected === true;
  });
  expect(ran).toBe(false);
});

test("the admin page loads no third-party scripts and talks only to itself and GitHub", async ({ page }) => {
  const origins = new Set<string>();
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) origins.add(new URL(r.url()).origin);
  });
  await fakeGithub(page);
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Signed in to acme/site" })).toBeVisible();
  const scriptSources = await page.locator("script[src]").evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src));
  const own = new URL(page.url()).origin;
  expect(scriptSources.length).toBeGreaterThan(0);
  expect(scriptSources.filter((s) => new URL(s).origin !== own)).toEqual([]);
  expect([...origins].filter((o) => o !== own).sort()).toEqual(["https://api.github.com"]);
});

test("leaving the admin page starts the next page clean, without the admin policy", async ({ page }) => {
  await page.goto("/admin/");
  expect(await csp(page)).toBeTruthy();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Tools" }).click();
  await expect(page).toHaveURL(/\/tools\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "All tools" })).toBeVisible();
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(0);
});

test("the token is not remembered unless you ask, and 'remember' uses this tab's session storage only", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Signed in to acme/site" })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.length + localStorage.length)).toBe(0);
  await page.getByRole("button", { name: "Sign out" }).click();

  await page.getByLabel("Repository (owner/name)").fill("acme/site");
  await page.getByLabel("GitHub token").fill("github_pat_GOOD");
  await page.getByLabel(/Keep me signed in/).check();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Signed in to acme/site" })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual(["oewer-admin-session"]);
  expect(await page.evaluate(() => localStorage.length + document.cookie.length)).toBe(0);

  await page.reload(); // still signed in after a reload of this tab
  await expect(page.getByRole("heading", { name: "Signed in to acme/site" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  await page.reload();
  await expect(page.getByLabel("GitHub token")).toBeVisible();
});

test("a remembered token that GitHub no longer accepts is discarded", async ({ page }) => {
  await fakeGithub(page, { token: "github_pat_NEW" });
  await page.goto("/admin/");
  await page.evaluate(() => sessionStorage.setItem("oewer-admin-session", JSON.stringify({ repo: "acme/site", branch: "main", token: "github_pat_OLD" })));
  await page.reload();
  await expect(page.getByText(/saved session was not used.*did not accept the token/)).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("oewer-admin-session"))).toBeNull(); // the old token is gone
});

test("you are signed out after 30 minutes without activity", async ({ page }) => {
  await page.clock.install();
  await fakeGithub(page);
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Signed in to acme/site" })).toBeVisible();
  await page.clock.fastForward("29:00");
  await expect(page.getByRole("heading", { name: "Signed in to acme/site" })).toBeVisible();
  await page.keyboard.press("Shift"); // activity resets the clock
  await page.clock.fastForward("29:00");
  await expect(page.getByRole("heading", { name: "Signed in to acme/site" })).toBeVisible();
  await page.clock.fastForward("02:00");
  await expect(page.getByText("You were signed out after 30 minutes without activity.")).toBeVisible();
  await expect(page.getByLabel("GitHub token")).toBeVisible();
});
