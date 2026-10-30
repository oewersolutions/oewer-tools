import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// A pretend GitHub: the admin page is exercised end to end without touching the real repository.
const WORKBOOK = readFileSync(resolve("data/oewer_database.xlsx"));
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,PUT,OPTIONS" };

interface Fake {
  puts: { headers: Record<string, string>; body: { message: string; content: string; sha: string; branch: string } }[];
  gets: string[];
}

async function fakeGithub(page: Page, opts: { push?: boolean; token?: string; conflictOnPut?: boolean } = {}): Promise<Fake> {
  const fake: Fake = { puts: [], gets: [] };
  let sha = "a".repeat(40);
  const json = (body: unknown, status = 200) => ({ status, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(body) });

  await page.route("https://api.github.com/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (request.headers().authorization !== `Bearer ${opts.token ?? "github_pat_GOOD"}`) return route.fulfill(json({ message: "Bad credentials" }, 401));

    if (request.method() === "GET") fake.gets.push(url.pathname);
    if (request.method() === "GET" && url.pathname === "/repos/acme/site") return route.fulfill(json({ full_name: "acme/site", permissions: { push: opts.push ?? true } }));
    if (request.method() === "GET" && url.pathname === "/repos/acme/site/contents/data/oewer_database.xlsx") return route.fulfill(json({ type: "file", sha, size: WORKBOOK.length }));
    if (request.method() === "GET" && url.pathname === `/repos/acme/site/git/blobs/${sha}`) return route.fulfill(json({ encoding: "base64", content: WORKBOOK.toString("base64") }));
    if (request.method() === "PUT" && url.pathname === "/repos/acme/site/contents/data/oewer_database.xlsx") {
      if (opts.conflictOnPut) return route.fulfill(json({ message: "does not match" }, 409));
      fake.puts.push({ headers: request.headers(), body: request.postDataJSON() });
      sha = "b".repeat(40);
      return route.fulfill(json({ content: { sha }, commit: { sha: "c".repeat(40), html_url: "https://github.com/acme/site/commit/ccc" } }));
    }
    return route.fulfill(json({ message: "Not Found" }, 404));
  });
  return fake;
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

test("editing a cell validates it and saves one commit with the previous version's SHA", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await page.getByLabel("Sheet").selectOption("tools");
  await page.getByLabel("Row", { exact: true }).fill("2");
  await page.getByLabel("Column").selectOption("name");
  await page.getByLabel("New value").fill("Image Squeezer");
  await page.getByRole("button", { name: "Check this change" }).click();
  await expect(page.getByText("The workbook is still valid after this change.")).toBeVisible();
  await page.getByRole("button", { name: "Save to GitHub" }).click();
  await expect(page.getByText("View the commit on GitHub")).toBeVisible();

  expect(fake.puts).toHaveLength(1);
  const put = fake.puts[0]!;
  expect(put.body.sha).toBe("a".repeat(40));
  expect(put.body.branch).toBe("main");
  expect(put.body.message).toBe("Admin: change tools row 2 name");
  expect(put.headers.authorization).toBe("Bearer github_pat_GOOD");
  expect(Buffer.from(put.body.content, "base64").length).toBeGreaterThan(1000);
  await expect(page.getByText("version bbbbbbb")).toBeVisible();
});

test("a change that would make the workbook invalid cannot be saved", async ({ page }) => {
  const fake = await fakeGithub(page);
  await signIn(page);
  await page.getByLabel("Sheet").selectOption("tools");
  await page.getByLabel("Column").selectOption("status");
  await page.getByLabel("New value").fill("live");
  await page.getByRole("button", { name: "Check this change" }).click();
  await expect(page.getByText(/would leave \d+ problem/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save to GitHub" })).toBeDisabled();
  expect(fake.puts).toHaveLength(0);
});

test("a conflict with a newer version is explained and offers a reload", async ({ page }) => {
  await fakeGithub(page, { conflictOnPut: true });
  await signIn(page);
  await page.getByLabel("Sheet").selectOption("tools");
  await page.getByLabel("Column").selectOption("name");
  await page.getByLabel("New value").fill("Changed");
  await page.getByRole("button", { name: "Check this change" }).click();
  await page.getByRole("button", { name: "Save to GitHub" }).click();
  await expect(page.getByText(/changed on GitHub/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload the latest workbook" })).toBeVisible();
});

test("a read-only token is told it cannot save", async ({ page }) => {
  await fakeGithub(page, { push: false });
  await signIn(page);
  await expect(page.getByText(/can only read the repository/)).toBeVisible();
  await page.getByLabel("Sheet").selectOption("tools");
  await page.getByLabel("Column").selectOption("name");
  await page.getByLabel("New value").fill("X");
  await page.getByRole("button", { name: "Check this change" }).click();
  await expect(page.getByRole("button", { name: "Save to GitHub" })).toBeDisabled();
});

test("signing out forgets the token", async ({ page }) => {
  await fakeGithub(page);
  await signIn(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("GitHub token")).toHaveValue("");
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
  expect(stored).not.toContain("github_pat");
});

test("the token is never written to browser storage", async ({ page }) => {
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
