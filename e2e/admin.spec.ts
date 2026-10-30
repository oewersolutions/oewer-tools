import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
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
  opts: {
    push?: boolean;
    token?: string;
    /** Another editor saves just before the person's first save. */
    concurrent?: (bytes: Buffer) => Promise<Buffer>;
    /** How the site update after a save ends, or that the token cannot read build status at all. */
    deploy?: "success" | "failure" | "forbidden";
  } = {},
): Promise<Fake> {
  let bytes: Buffer = WORKBOOK;
  let version = 0;
  let concurrentDone = false;
  let savedCommit: string | undefined;
  let polls = 0; // how many times the new run has been looked at: queued, then running, then finished
  const fake: Fake = { puts: [], gets: [], current: () => bytes };
  const json = (body: unknown, status = 200) => ({ status, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(body) });
  const file = "/repos/acme/site/contents/data/oewer_database.xlsx";

  await page.route("https://api.github.com/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (request.headers().authorization !== `Bearer ${opts.token ?? "github_pat_GOOD"}`) return route.fulfill(json({ message: "Bad credentials" }, 401));

    if (request.method() === "GET") fake.gets.push(url.pathname);
    if (url.pathname.includes("/actions/")) {
      if (opts.deploy === "forbidden") return route.fulfill(json({ message: "Resource not accessible by personal access token" }, 403));
      const run = (id: number, sha: string, status: string, conclusion: string | null, title: string) => ({ id, head_sha: sha, display_title: title, status, conclusion, html_url: `https://github.com/acme/site/actions/runs/${id}`, created_at: "2026-10-30T10:00:00Z", updated_at: "2026-10-30T10:01:00Z" });
      if (url.pathname.endsWith("/actions/workflows/deploy.yml/runs")) {
        const runs = [run(1, "0".repeat(40), "completed", "success", "Earlier update")];
        if (savedCommit) {
          polls++;
          const state = polls <= 1 ? ["queued", null] : polls === 2 ? ["in_progress", null] : ["completed", opts.deploy === "failure" ? "failure" : "success"];
          runs.unshift(run(2, savedCommit, state[0]!, state[1], "Admin: update"));
        }
        return route.fulfill(json({ workflow_runs: runs }));
      }
      if (url.pathname.endsWith("/actions/runs/2/jobs")) return route.fulfill(json({ jobs: [{ name: "build", conclusion: "failure", steps: [{ name: "Checkout", conclusion: "success" }, { name: "Validate workbook", conclusion: "failure" }] }] }));
    }
    const FIRST = "1".repeat(40);
    const FIRST_FILE = "9".repeat(40); // the workbook as it was in the first commit
    if (request.method() === "GET" && url.pathname === "/repos/acme/site/commits") {
      const commit = (sha: string, message: string, date: string) => ({ sha, html_url: `https://github.com/acme/site/commit/${sha}`, commit: { message, author: { name: "Editor", date } }, author: { login: "editor" } });
      const list = savedCommit ? [commit(savedCommit, "Admin: update records", "2026-10-30T11:00:00Z")] : [];
      return route.fulfill(json([...list, commit(FIRST, "Add workbook", "2026-10-29T09:00:00Z")]));
    }
    if (request.method() === "GET" && url.pathname === file && url.searchParams.get("ref") === FIRST) return route.fulfill(json({ type: "file", sha: FIRST_FILE, size: WORKBOOK.length }));
    if (request.method() === "GET" && url.pathname === `/repos/acme/site/git/blobs/${FIRST_FILE}`) return route.fulfill(json({ encoding: "base64", content: WORKBOOK.toString("base64") }));
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
      savedCommit = "c".repeat(40);
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

/** Open a sheet, edit one cell of a record through the row form, and add it to the pending changes. */
async function editCell(page: Page, sheet: string, pk: string, column: string, value: string) {
  await page.getByRole("navigation", { name: "Editor" }).getByRole("button", { name: "All sheets" }).click();
  await page.getByRole("navigation", { name: "Sheets" }).getByRole("button", { name: new RegExp(`^${sheet} `) }).click();
  await page.getByRole("button", { name: `Edit ${pk}` }).click();
  const form = page.getByRole("form", { name: new RegExp(`Edit ${pk}`) });
  const field = form.getByLabel(new RegExp(`^${column}( \\*)?$`));
  if ((await field.evaluate((el) => el.tagName)) === "SELECT") await field.selectOption(value);
  else await field.fill(value);
  await form.getByRole("button", { name: "Update pending changes" }).click();
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
  await editCell(page, "tools", "TOOL0001", "name", "Image Squeezer");
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
  await editCell(page, "tools", "TOOL0001", "name", "One");
  await editCell(page, "tools", "TOOL0002", "name", "Two");
  await editCell(page, "tools", "TOOL0001", "name", "One again"); // same cell: replaces the earlier change
  await expect(page.getByText(/Pending changes \(2\)/)).toBeVisible();
  await page.getByRole("button", { name: "Save 2 changes to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  expect(fake.puts).toHaveLength(1);
  expect(fake.puts[0]!.body.message).toBe("Admin: update tools TOOL0001 name and 1 more change");
});

test("a pending change can be removed before saving", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await editCell(page, "tools", "TOOL0001", "name", "One");
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText(/Pending changes \(0\)/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Save .* to GitHub/ })).toHaveCount(0);
  expect(fake.puts).toHaveLength(0);
});

test("a change that would make the workbook invalid is refused and nothing is sent", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await editCell(page, "tools", "TOOL0001", "slug", "Not A Slug!");
  await expect(page.getByText(/cannot be saved yet/)).toBeVisible(); // shown at once, before saving
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText(/so nothing was saved/)).toBeVisible();
  expect(fake.puts).toHaveLength(0);
  await expect(page.getByText(/Pending changes \(1\)/)).toBeVisible(); // your change is kept so you can fix it
});

test("a wrong kind of value is caught as soon as it is added", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await editCell(page, "tools", "TOOL0001", "sort_order", "abc");
  await expect(page.getByText(/sort_order must be a whole number/)).toBeVisible();
  await expect(page.getByText(/Pending changes \(0\)/)).toBeVisible();
});

test("when someone saved a different cell first, your change is merged and saved", async ({ page }) => {
  const fake = await fakeGithub(page, { concurrent: withCell("tools", "TOOL0002", "name", "Their edit") });
  await signIn(page);
  await editCell(page, "tools", "TOOL0001", "name", "My edit");
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText(/merged with newer changes made by someone else/)).toBeVisible();

  const final = await loadWorkbook(new Uint8Array(fake.current()));
  expect(readCell(final, schema, { sheet: "tools", row: findRecord(final, schema, "tools", "TOOL0001"), column: "name" })).toBe("My edit");
  expect(readCell(final, schema, { sheet: "tools", row: findRecord(final, schema, "tools", "TOOL0002"), column: "name" })).toBe("Their edit");
});

test("when someone changed the same cell, you choose and your edit is not lost", async ({ page }) => {
  const fake = await fakeGithub(page, { concurrent: withCell("tools", "TOOL0001", "name", "Their name") });
  await signIn(page);
  await editCell(page, "tools", "TOOL0001", "name", "My name");
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
  await editCell(page, "tools", "TOOL0001", "name", "My name");
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
  await editCell(page, "tools", "TOOL0001", "name", "X");
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
  await editCell(page, "tools", "TOOL0001", "name", "Policy check");
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

// ---- Spreadsheet manager (T5.4) ----

const sheetTab = (page: Page, name: string) => page.getByRole("navigation", { name: "Sheets" }).getByRole("button", { name: new RegExp(`^${name} `) });
const tableRows = (page: Page, sheet: string) => page.getByRole("region", { name: `${sheet} rows` }).getByRole("row");

async function managerPage(page: Page, opts?: Parameters<typeof fakeGithub>[1]) {
  const fake = await fakeGithub(page, opts);
  await signIn(page);
  await page.getByRole("navigation", { name: "Editor" }).getByRole("button", { name: "All sheets" }).click();
  await expect(page.getByRole("navigation", { name: "Sheets" })).toBeVisible();
  return fake;
}

async function cellOf(buffer: Buffer, sheet: string, pk: string, column: string) {
  const wb = await loadWorkbook(new Uint8Array(buffer));
  const row = findRecord(wb, schema, sheet, pk);
  return row === 0 ? undefined : readCell(wb, schema, { sheet, row, column });
}

test("every sheet is listed with its row count, and you can switch between them", async ({ page }) => {
  await managerPage(page);
  await expect(page.getByRole("navigation", { name: "Sheets" }).getByRole("button")).toHaveCount(16);
  await expect(sheetTab(page, "tools")).toContainText("(10)");
  await sheetTab(page, "tags").click();
  await expect(page.getByRole("heading", { name: "tags", level: 2 })).toBeVisible();
  await expect(sheetTab(page, "tags")).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Edit TAG0001" })).toBeVisible();
});

test("rows can be searched, filtered and sorted", async ({ page }) => {
  await managerPage(page);
  await sheetTab(page, "tools").click();
  await expect(tableRows(page, "tools")).toHaveCount(11); // header + 10

  await page.getByLabel("Search rows").fill("calculator");
  await expect(tableRows(page, "tools")).toHaveCount(5); // header + EMI, FD, GST, percentage
  await page.getByLabel("Search rows").fill("");

  await page.getByLabel("Filter by").selectOption("category_id");
  await page.getByLabel("Filter value").selectOption("TCAT0002");
  await expect(tableRows(page, "tools")).toHaveCount(5);
  await page.getByLabel("Filter by").selectOption("");

  await page.getByLabel("Sort by").selectOption("name");
  await expect(tableRows(page, "tools").nth(1)).toContainText("EMI Calculator");
  await page.getByLabel("Descending").check();
  await expect(tableRows(page, "tools").nth(1)).toContainText("Word Counter");

  await page.getByLabel("Search rows").fill("zzzz-nothing");
  await expect(page.getByText("No rows match.")).toBeVisible();
});

test("long sheets are split into pages", async ({ page }) => {
  await managerPage(page);
  await sheetTab(page, "tool_settings").click();
  await expect(page.getByRole("navigation", { name: "Pages" })).toContainText("page 1 of 3");
  await expect(tableRows(page, "tool_settings")).toHaveCount(26); // header + 25
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("navigation", { name: "Pages" })).toContainText("page 3 of 3");
  await expect(tableRows(page, "tool_settings")).toHaveCount(5); // header + the last 4
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
});

test("a row can be added, with the next free ID suggested, and is saved", async ({ page }) => {
  const fake = await managerPage(page);
  await sheetTab(page, "tags").click();
  await page.getByRole("button", { name: "Add row" }).click();
  const form = page.getByRole("form", { name: /Add a row to tags/ });
  await expect(form.getByLabel(/^tag_id/)).toHaveValue("TAG0007");
  await form.getByLabel(/^name/).fill("Savings tips");
  await form.getByLabel(/^slug/).fill("savings-tips");
  await form.getByRole("button", { name: "Add to pending changes" }).click();

  await expect(page.getByText("tags: add a row (TAG0007)")).toBeVisible();
  await expect(page.getByText("The workbook is valid with these changes.")).toBeVisible();
  await expect(page.getByRole("row", { name: /TAG0007/ })).toContainText("New");
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  expect(fake.puts[0]!.body.message).toBe("Admin: add a row to tags");
  expect(await cellOf(fake.current(), "tags", "TAG0007", "name")).toBe("Savings tips");
});

test("an ID that is already used is refused", async ({ page }) => {
  await managerPage(page);
  await sheetTab(page, "tags").click();
  await page.getByRole("button", { name: "Add row" }).click();
  const form = page.getByRole("form", { name: /Add a row to tags/ });
  await form.getByLabel(/^tag_id/).fill("TAG0001");
  await form.getByRole("button", { name: "Add to pending changes" }).click();
  await expect(page.getByText(/TAG0001 is already used in tags/)).toBeVisible();
});

test("a row can be deleted, and a row that others still use cannot", async ({ page }) => {
  const fake = await managerPage(page);
  await sheetTab(page, "tags").click();
  await page.getByRole("button", { name: "Delete TAG0002" }).click(); // still carried by articles
  await expect(page.getByText(/cannot be saved yet/)).toBeVisible();
  await expect(page.getByText(/TAG0002/).first()).toBeVisible();
  await page.getByRole("button", { name: "Discard all" }).click();

  await sheetTab(page, "advertisements").click();
  await page.getByRole("button", { name: "Delete AD0003" }).click();
  await expect(page.getByText("The workbook is valid with these changes.")).toBeVisible();
  await expect(page.getByRole("row", { name: /AD0003/ })).toHaveCount(0); // gone from the table at once
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  expect(await cellOf(fake.current(), "advertisements", "AD0003", "placement_key")).toBeUndefined();
});

test("a sheet can be exported as CSV and the whole workbook downloaded", async ({ page }) => {
  await managerPage(page);
  await sheetTab(page, "tags").click();
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export tags as CSV" }).click()]);
  expect(csv.suggestedFilename()).toBe("tags.csv");
  const text = (await readFile(await csv.path(), "utf-8")).split("\r\n");
  expect(text[0]).toBe("tag_id,name,slug");
  expect(text[1]).toBe("TAG0001,Loans,loans");

  const [book] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download the workbook" }).click()]);
  expect(book.suggestedFilename()).toBe("oewer_database.xlsx");
  expect((await readFile(await book.path())).length).toBe(WORKBOOK.length);
});

test("a CSV can be imported: new rows are added, changed cells updated, nothing is deleted", async ({ page }) => {
  const fake = await managerPage(page);
  await sheetTab(page, "tags").click();
  await page.getByLabel("Choose a CSV file to import into tags").setInputFiles({
    name: "tags.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("tag_id,name,slug\nTAG0001,Loan help,loans\nTAG0007,Fresh,fresh\n"),
  });
  await expect(page.getByText(/would add 1, update 1 and leave 0 row/)).toBeVisible();
  await page.getByRole("button", { name: "Add 2 changes to pending" }).click();
  await expect(page.getByText(/Pending changes \(2\)/)).toBeVisible();
  await page.getByRole("button", { name: "Save 2 changes to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  expect(await cellOf(fake.current(), "tags", "TAG0001", "name")).toBe("Loan help");
  expect(await cellOf(fake.current(), "tags", "TAG0007", "slug")).toBe("fresh");
  expect(await cellOf(fake.current(), "tags", "TAG0002", "name")).toBe("Calculators"); // not in the file, still there
});

test("a CSV that does not fit the sheet is explained and nothing is added", async ({ page }) => {
  await managerPage(page);
  await sheetTab(page, "tags").click();
  await page.getByLabel("Choose a CSV file to import into tags").setInputFiles({ name: "bad.csv", mimeType: "text/csv", buffer: Buffer.from("tag_id,colour\nTAG0009,red\n") });
  await expect(page.getByText("This file cannot be imported:")).toBeVisible();
  await expect(page.getByText(/Unknown column: colour/)).toBeVisible();
  await expect(page.getByText(/Pending changes \(0\)/)).toBeVisible();
});

test("the manager has no accessibility violations with a row form open", async ({ page }) => {
  await managerPage(page);
  await sheetTab(page, "tools").click();
  await page.getByRole("button", { name: "Edit TOOL0001" }).click();
  const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(violations).toEqual([]);
});

// ---- Content forms (T5.5) ----

const editor = (page: Page, name: string) => page.getByRole("navigation", { name: "Editor" }).getByRole("button", { name });

/** All rows of a sheet in a saved workbook, as strings keyed by column name. */
async function rowsOf(buffer: Buffer, sheet: string): Promise<Record<string, string>[]> {
  const wb = await loadWorkbook(new Uint8Array(buffer));
  const ws = wb.getWorksheet(sheet)!;
  const header: string[] = [];
  ws.getRow(1).eachCell((c, n) => (header[n] = String(c.value)));
  const rows: Record<string, string>[] = [];
  ws.eachRow((row, r) => {
    if (r === 1) return;
    const out: Record<string, string> = {};
    header.forEach((h, n) => h && (out[h] = row.getCell(n).value === null ? "" : String(row.getCell(n).value)));
    rows.push(out);
  });
  return rows;
}

test("the tools editor changes a tool's questions, related tools and search settings in one go", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await expect(editor(page, "Tools")).toHaveAttribute("aria-current", "page"); // the friendly editors come first
  await page.getByRole("button", { name: "Edit tool EMI Calculator" }).click();
  const form = page.getByRole("form", { name: /Edit tool EMI Calculator/ });
  await form.getByLabel("Answer 1").fill("It uses the standard reducing-balance formula.");
  await form.getByRole("group", { name: "Related tools" }).getByLabel("FD Interest Calculator").uncheck();
  await form.getByLabel("Search title").fill("EMI Calculator: monthly loan payment");
  await form.getByLabel("Search description").fill("Work out your EMI.");
  await form.getByRole("button", { name: "Update pending changes" }).click();

  await expect(page.getByText("The workbook is valid with these changes.")).toBeVisible();
  await page.getByRole("button", { name: /^Save \d+ changes? to GitHub/ }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();

  const settings = await rowsOf(fake.current(), "tool_settings");
  const faq = JSON.parse(settings.find((r) => r.tool_id === "TOOL0004" && r.setting_key === "faq")!.setting_value) as { a: string }[];
  expect(faq[0]!.a).toBe("It uses the standard reducing-balance formula.");
  expect(JSON.parse(settings.find((r) => r.tool_id === "TOOL0004" && r.setting_key === "related")!.setting_value)).toEqual(["TOOL0007"]);
  const seo = (await rowsOf(fake.current(), "seo_metadata")).find((r) => r.entity_id === "TOOL0004")!;
  expect(seo.meta_title).toBe("EMI Calculator: monthly loan payment");
});

test("a tool can be hidden from the site by setting it to draft", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await page.getByRole("button", { name: "Edit tool Word Counter" }).click();
  await page.getByRole("form", { name: /Edit tool Word Counter/ }).getByLabel("Status").selectOption("draft");
  await page.getByRole("form", { name: /Edit tool Word Counter/ }).getByRole("button", { name: "Update pending changes" }).click();
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  expect((await rowsOf(fake.current(), "tools")).find((r) => r.tool_id === "TOOL0010")!.status).toBe("draft");
});

test("adding a tool is only offered while an unused tool component exists", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await expect(page.getByRole("button", { name: "Add tool" })).toBeDisabled();
  await expect(page.getByText(/Every tool component built so far is in use/)).toBeVisible();
});

test("a category can be added and gets its address from its name", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await editor(page, "Categories").click();
  await page.getByRole("button", { name: "Add category" }).click();
  const form = page.getByRole("form", { name: /Add a tool category/ });
  await form.getByLabel("Name").fill("Health Tools");
  await expect(form.getByLabel("Page address (slug)")).toHaveValue("health-tools");
  await form.getByRole("button", { name: "Update pending changes" }).click();
  await expect(page.getByText(/description: is required/)).toBeVisible(); // caught at once, before any save
  await page.getByRole("button", { name: "Edit category Health Tools" }).click();
  await page.getByRole("form", { name: /Edit category Health Tools/ }).getByLabel("Description", { exact: true }).fill("Tools for health and fitness.");
  await page.getByRole("form", { name: /Edit category Health Tools/ }).getByRole("button", { name: "Update pending changes" }).click();
  await expect(page.getByText("The workbook is valid with these changes.")).toBeVisible();
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  const added = (await rowsOf(fake.current(), "tool_categories")).find((r) => r.name === "Health Tools")!;
  expect(added).toMatchObject({ category_id: "TCAT0005", slug: "health-tools", enabled: "true" });
});

test("a new article is written block by block, tagged and published", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await editor(page, "Articles").click();
  await page.getByRole("button", { name: "New article" }).click();
  const form = page.getByRole("form", { name: /New article/ });
  await form.getByLabel("Title", { exact: true }).fill("Saving on Loan Interest");
  await expect(form.getByLabel("Page address (slug)")).toHaveValue("saving-on-loan-interest");
  await form.getByLabel("Summary (shown in lists and search results)").fill("Pay less interest.");
  await form.getByLabel("Status").selectOption("published");
  await form.getByLabel("Block 1 text").fill("Start with the basics.");
  await form.getByLabel("New block type").selectOption("heading");
  await form.getByRole("button", { name: "Add block" }).click();
  await form.getByLabel("Block 2 text").fill("Pay early");
  await form.getByLabel("Create a new tag").fill("Interest");
  await form.getByRole("button", { name: "Add tag" }).click();
  await form.getByRole("button", { name: "Update pending changes" }).click();

  await expect(page.getByText("The workbook is valid with these changes.")).toBeVisible();
  await page.getByRole("button", { name: /^Save \d+ changes? to GitHub/ }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();

  const post = (await rowsOf(fake.current(), "posts")).find((r) => r.title === "Saving on Loan Interest")!;
  expect(post).toMatchObject({ status: "published", slug: "saving-on-loan-interest" });
  expect(post.published_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // dated automatically on publishing
  const blocks = (await rowsOf(fake.current(), "post_blocks")).filter((r) => r.post_id === post.post_id);
  expect(blocks.map((b) => [b.sort_order, b.block_type, b.content])).toEqual([["1", "paragraph", "Start with the basics."], ["2", "heading", "Pay early"]]);
  const tag = (await rowsOf(fake.current(), "tags")).find((t) => t.name === "Interest")!;
  expect((await rowsOf(fake.current(), "post_tags")).some((r) => r.post_id === post.post_id && r.tag_id === tag.tag_id)).toBe(true);
});

test("blocks of an existing article can be moved, and publishing with no blocks is caught at once", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await editor(page, "Articles").click();
  await page.getByRole("button", { name: "Edit article How EMI Is Calculated" }).click();
  const form = page.getByRole("form", { name: /Edit article How EMI Is Calculated/ });
  await form.getByRole("button", { name: "Move block 1 down" }).click();
  await expect(form.getByLabel("Block 2 text")).toHaveValue(/An EMI, or equated monthly instalment/);
  await form.getByRole("button", { name: "Update pending changes" }).click();
  await expect(page.getByText("The workbook is valid with these changes.")).toBeVisible();
  await page.getByRole("button", { name: /^Save \d+ changes? to GitHub/ }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  const blocks = (await rowsOf(fake.current(), "post_blocks")).filter((r) => r.post_id === "POST0001").sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  expect(blocks[0]!.block_type).toBe("heading");
  expect(blocks[1]!.content).toMatch(/An EMI, or equated/);
});

test("an article published with no blocks is flagged before saving", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await editor(page, "Articles").click();
  await page.getByRole("button", { name: "New article" }).click();
  const form = page.getByRole("form", { name: /New article/ });
  await form.getByLabel("Title", { exact: true }).fill("Empty");
  await form.getByLabel("Status").selectOption("published");
  await form.getByRole("button", { name: "Remove block 1" }).click();
  await form.getByRole("button", { name: "Update pending changes" }).click();
  await expect(page.getByText(/cannot be saved yet/)).toBeVisible();
  await expect(page.getByText(/no post_blocks/)).toBeVisible();
});

test("search settings are listed for every page and can be edited", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await editor(page, "Search settings").click();
  await expect(page.getByRole("row", { name: /EMI Calculator.*Custom/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /About OEWER Tools.*Custom/ })).toBeVisible();
  await page.getByRole("button", { name: "Edit search settings for Contact Us" }).click();
  const form = page.getByRole("form", { name: /Search settings for Contact Us/ });
  await form.getByLabel("Search title").fill("Contact OEWER Tools");
  await expect(form.getByText("19 of 70 characters")).toBeVisible();
  await form.getByLabel("Search description").fill("Get in touch with the team.");
  await form.getByRole("button", { name: "Update pending changes" }).click();
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  expect((await rowsOf(fake.current(), "seo_metadata")).find((r) => r.entity_id === "PAGE0004")).toMatchObject({ meta_title: "Contact OEWER Tools", noindex: "false" });
});

test("ad placements can be switched on with a slot ID, and a wrong slot ID is caught", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await editor(page, "Ads").click();
  const form = page.getByRole("form", { name: "Ad placements" });
  await form.getByLabel("Placement 1 slot ID").fill("ca-pub-123");
  await form.getByRole("button", { name: "Update pending changes" }).click();
  await expect(page.getByText(/cannot be saved yet/)).toBeVisible();
  await page.getByRole("button", { name: "Discard all" }).click();

  await form.getByLabel("Show ads on the site").check();
  await form.getByLabel("Placement 1 slot ID").fill("1234567890");
  await form.getByLabel("Enable placement 1").check();
  await form.getByRole("button", { name: "Update pending changes" }).click();
  await expect(page.getByText("The workbook is valid with these changes.")).toBeVisible();
  await page.getByRole("button", { name: /^Save \d+ changes? to GitHub/ }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  expect((await rowsOf(fake.current(), "site_settings")).find((r) => r.setting_key === "ads_enabled")!.setting_value).toBe("true");
  expect((await rowsOf(fake.current(), "advertisements")).find((r) => r.ad_id === "AD0001")).toMatchObject({ enabled: "true", ad_unit_id: "1234567890" });
});

test("the content editors have no accessibility violations", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  const scan = async () => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  await page.getByRole("button", { name: "Edit tool EMI Calculator" }).click();
  expect(await scan()).toEqual([]);
  await editor(page, "Articles").click();
  await page.getByRole("button", { name: "Edit article How EMI Is Calculated" }).click();
  expect(await scan()).toEqual([]);
  await editor(page, "Categories").click();
  await page.getByRole("button", { name: "Add category" }).click();
  expect(await scan()).toEqual([]);
  await editor(page, "Search settings").click();
  expect(await scan()).toEqual([]);
  await editor(page, "Ads").click();
  expect(await scan()).toEqual([]);
});

// ---- Publish flow (T5.6) ----

/** Move the fake clock on in steps until something shows up: the page polls on a timer that is set after each reply. */
async function wait(page: Page, text: string | RegExp) {
  const target = page.getByText(text).first();
  for (let i = 0; i < 12 && !(await target.isVisible()); i++) {
    await page.clock.fastForward("00:07");
    await page.waitForTimeout(150);
  }
  await expect(target).toBeVisible();
}

test("the site status is shown as soon as you sign in", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Site status" })).toBeVisible();
  await expect(page.getByText("The site is up to date.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Recent site updates" }).getByText("Earlier update")).toBeVisible();
  await expect(page.getByRole("link", { name: "View the live site" })).toHaveAttribute("href", /\/$/);
});

test("after saving, the update is followed from waiting to building to live", async ({ page }) => {
  await page.clock.install();
  await fakeGithub(page);
  await signIn(page);
  await editCell(page, "tools", "TOOL0001", "name", "Image Squeezer");
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  await expect(page.getByText(/Waiting for GitHub to start updating the site|being published/)).toBeVisible();
  await wait(page, "The site is up to date.");
  await expect(page.getByRole("list", { name: "Recent site updates" }).getByText("Live")).toHaveCount(2);
});

test("a failed update says why in plain words and that the live site is unchanged", async ({ page }) => {
  await page.clock.install();
  await fakeGithub(page, { deploy: "failure" });
  await signIn(page);
  await editCell(page, "tools", "TOOL0001", "name", "Image Squeezer");
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  await wait(page, /could not be updated. The live site still shows the previous version/);
  await wait(page, /did not pass validation/);
  await expect(page.getByRole("list", { name: "Recent site updates" }).getByRole("link", { name: "Details" }).first()).toHaveAttribute("href", /actions\/runs\/2$/);
});

test("a token that cannot read build status still saves, and the page explains what to add", async ({ page }) => {
  const fake = await fakeGithub(page, { deploy: "forbidden" });
  await signIn(page);
  await expect(page.getByText("Build status is not available.")).toBeVisible();
  await expect(page.getByText(/Add the Actions: Read permission/)).toBeVisible();
  await editCell(page, "tools", "TOOL0001", "name", "Image Squeezer");
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  expect(fake.puts).toHaveLength(1);
});

test("before saving, the pending panel says what will appear, change or disappear on the live site", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await page.getByRole("button", { name: "Edit tool Word Counter" }).click();
  await page.getByRole("form", { name: /Edit tool Word Counter/ }).getByLabel("Status").selectOption("draft");
  await page.getByRole("form", { name: /Edit tool Word Counter/ }).getByRole("button", { name: "Update pending changes" }).click();
  const summary = page.getByLabel("What will change on the live site");
  await expect(summary).toContainText("Removed: tool “Word Counter”");

  await page.getByRole("button", { name: "Edit tool EMI Calculator" }).click();
  await page.getByRole("form", { name: /Edit tool EMI Calculator/ }).getByLabel("Answer 1").fill("A changed answer.");
  await page.getByRole("form", { name: /Edit tool EMI Calculator/ }).getByRole("button", { name: "Update pending changes" }).click();
  await expect(summary).toContainText("Updated: tool “EMI Calculator”");
});

test("changes that visitors cannot see are labelled as such", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await editor(page, "Articles").click();
  await page.getByRole("button", { name: "New article" }).click();
  const form = page.getByRole("form", { name: /New article/ });
  await form.getByLabel("Title", { exact: true }).fill("Work in progress");
  await form.getByLabel("Summary (shown in lists and search results)").fill("Notes for later.");
  await form.getByLabel("Block 1 text").fill("Draft text.");
  await form.getByRole("button", { name: "Update pending changes" }).click();
  await expect(page.getByLabel("What will change on the live site")).toContainText("Nothing visitors can see");
});

test("an article can be previewed as it will look, including a draft, before it is saved", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await editor(page, "Articles").click();
  await page.getByRole("button", { name: "New article" }).click();
  const form = page.getByRole("form", { name: /New article/ });
  await form.getByLabel("Title", { exact: true }).fill("Preview me");
  await form.getByLabel("Block 1 text").fill("A **bold** opening.");
  await form.getByLabel("New block type").selectOption("heading");
  await form.getByRole("button", { name: "Add block" }).click();
  await form.getByLabel("Block 2 text").fill("A section");
  await form.getByRole("button", { name: "Preview article" }).click();
  const preview = form.getByLabel("Article preview");
  await expect(preview.getByRole("heading", { name: "Preview me", level: 2 })).toBeVisible();
  await expect(preview.locator("strong", { hasText: "bold" })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "A section" })).toBeVisible();
  await expect(preview).toContainText("Draft preview"); // not published yet, and it says so
  await form.getByLabel("Status").selectOption("published");
  await expect(preview).not.toContainText("Draft preview");
});

test("a previous version can be restored, after a confirmation, as a new commit", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Signed in to acme/site" })).toBeVisible();
  await page.getByRole("button", { name: "Show earlier versions" }).click();
  const list = page.getByRole("list", { name: "Earlier versions" });
  await expect(list.getByText("Add workbook")).toBeVisible();
  await expect(list.getByRole("button", { name: /^Restore/ })).toHaveCount(0); // with one version, the latest is all there is

  // save an edit of our own so the workbook differs from the first commit
  await editCell(page, "tools", "TOOL0001", "name", "Image Squeezer");
  await page.getByRole("button", { name: "Save 1 change to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();
  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(list.getByText("Admin: update records")).toBeVisible();

  await list.getByRole("button", { name: "Restore version 1111111" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Restore the workbook to “Add workbook”?");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect(fake.puts).toHaveLength(1); // nothing is restored before confirming

  await list.getByRole("button", { name: "Restore version 1111111" }).click();
  await page.getByRole("button", { name: "Yes, restore this version" }).click();
  await expect(page.getByText("Restored version 1111111.")).toBeVisible();
  expect(fake.puts).toHaveLength(2);
  expect(fake.puts[1]!.body.message).toBe("Restore workbook to version 1111111: Add workbook");
  expect(Buffer.from(fake.puts[1]!.body.content, "base64").equals(WORKBOOK)).toBe(true);
});
