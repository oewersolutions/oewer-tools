import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyChanges, commitMessageFor, describeChange, findRecord, queueSet, recordIdAt, type Change } from "../lib/admin/changes";
import { loadWorkbook, readCell, saveWorkbook } from "../lib/admin/edit";
import { GithubError, type CommitResult, type WorkbookFile } from "../lib/admin/github";
import { saveChanges, type Repo } from "../lib/admin/save";
import { checkWorkbook, schema } from "../lib/workbook";
import { buildSeedWorkbook } from "../scripts/create-seed-workbook";

let dir: string;
let seed: Uint8Array;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "oewer-changes-"));
  const file = join(dir, "seed.xlsx");
  await buildSeedWorkbook(file);
  seed = new Uint8Array(await readFile(file));
});
afterAll(() => rm(dir, { recursive: true, force: true }));

const set = (pk: string, column: string, before: string, after: string, sheet = "tools"): Change => ({ type: "set", sheet, pk, column, before, after });
const cell = (wb: Awaited<ReturnType<typeof loadWorkbook>>, pk: string, column: string, sheet = "tools") =>
  readCell(wb, schema, { sheet, row: findRecord(wb, schema, sheet, pk), column });

describe("records are found by ID, not row number", () => {
  it("finds a record and maps a row back to its ID", async () => {
    const wb = await loadWorkbook(seed);
    expect(findRecord(wb, schema, "tools", "TOOL0004")).toBe(5);
    expect(findRecord(wb, schema, "tools", "TOOL9999")).toBe(0);
    expect(recordIdAt(wb, schema, "tools", 5)).toBe("TOOL0004");
    expect(() => recordIdAt(wb, schema, "tools", 1)).toThrow(/Row must be/);
  });
});

describe("applyChanges", () => {
  it("sets a cell when it still holds the value the person saw", async () => {
    const wb = await loadWorkbook(seed);
    const before = cell(wb, "TOOL0001", "name");
    const r = applyChanges(wb, schema, [set("TOOL0001", "name", before, "Squeezer")]);
    expect(r).toEqual({ conflicts: [], alreadyDone: [] });
    expect(cell(wb, "TOOL0001", "name")).toBe("Squeezer");
  });

  it("reports a conflict when someone else changed the cell, and leaves it alone", async () => {
    const wb = await loadWorkbook(seed);
    const current = cell(wb, "TOOL0001", "name");
    const r = applyChanges(wb, schema, [set("TOOL0001", "name", "Something older", "Squeezer")]);
    expect(r.conflicts).toMatchObject([{ index: 0, kind: "changed", theirs: current }]);
    expect(cell(wb, "TOOL0001", "name")).toBe(current);
  });

  it("applies a conflicting change when the person chose their own version", async () => {
    const wb = await loadWorkbook(seed);
    const r = applyChanges(wb, schema, [set("TOOL0001", "name", "Something older", "Squeezer")], new Set([0]));
    expect(r.conflicts).toEqual([]);
    expect(cell(wb, "TOOL0001", "name")).toBe("Squeezer");
  });

  it("treats a change that is already in place as done", async () => {
    const wb = await loadWorkbook(seed);
    const current = cell(wb, "TOOL0001", "name");
    expect(applyChanges(wb, schema, [set("TOOL0001", "name", "Older", current)])).toEqual({ conflicts: [], alreadyDone: [0] });
  });

  it("reports a conflict when the record is gone", async () => {
    const wb = await loadWorkbook(seed);
    expect(applyChanges(wb, schema, [set("TOOL9999", "name", "a", "b")]).conflicts[0]?.kind).toBe("row_missing");
  });

  it("adds a row and refuses an ID that is already taken", async () => {
    const wb = await loadWorkbook(seed);
    const tag = { tag_id: "TAG0099", name: "Fresh", slug: "fresh" };
    expect(applyChanges(wb, schema, [{ type: "add", sheet: "tags", values: tag }]).conflicts).toEqual([]);
    expect(cell(wb, "TAG0099", "name", "tags")).toBe("Fresh");
    expect(applyChanges(wb, schema, [{ type: "add", sheet: "tags", values: tag }]).conflicts[0]?.kind).toBe("id_taken");
  });

  it("deletes a row, and deleting a missing row is already done", async () => {
    const wb = await loadWorkbook(seed);
    const rowsBefore = wb.getWorksheet("tags")!.rowCount;
    expect(applyChanges(wb, schema, [{ type: "delete", sheet: "tags", pk: "TAG0002" }]).conflicts).toEqual([]);
    expect(wb.getWorksheet("tags")!.rowCount).toBe(rowsBefore - 1);
    expect(findRecord(wb, schema, "tags", "TAG0002")).toBe(0);
    expect(applyChanges(wb, schema, [{ type: "delete", sheet: "tags", pk: "TAG0002" }]).alreadyDone).toEqual([0]);
  });
});

describe("queueSet and messages", () => {
  it("merges edits to the same cell, keeping the original 'before'", () => {
    let q: Change[] = [];
    q = queueSet(q, set("T1", "name", "A", "B") as never);
    q = queueSet(q, set("T1", "name", "B", "C") as never);
    expect(q).toEqual([set("T1", "name", "A", "C")]);
  });
  it("drops an edit that puts the value back", () => {
    let q: Change[] = [];
    q = queueSet(q, set("T1", "name", "A", "B") as never);
    q = queueSet(q, set("T1", "name", "B", "A") as never);
    expect(q).toEqual([]);
    expect(queueSet([], set("T1", "name", "A", "A") as never)).toEqual([]);
  });
  it("writes readable descriptions and commit messages", () => {
    expect(describeChange(set("TOOL0001", "name", "", "X"))).toBe("tools TOOL0001, name: (empty) → X");
    expect(commitMessageFor([set("TOOL0001", "name", "a", "b")])).toBe("Admin: update tools TOOL0001 name");
    expect(commitMessageFor([set("TOOL0001", "name", "a", "b"), set("TOOL0002", "name", "a", "b")])).toBe("Admin: update tools TOOL0001 name and 1 more change");
    expect(commitMessageFor([set("a", "b", "c", "d"), set("e", "f", "g", "h"), set("i", "j", "k", "l")])).toBe("Admin: update tools a b and 2 more changes");
  });
});

/** An in-memory repository whose file SHA changes with every save, like GitHub's. */
function fakeRepo(initial: Uint8Array) {
  let bytes = initial;
  let version = 1;
  const log: string[] = [];
  const file = (): WorkbookFile => ({ bytes, sha: `sha${version}`, size: bytes.length });
  const repo: Repo & { beforeNextCommit?: () => Promise<void> } = {
    read: async () => file(),
    commit: async (b, sha, message): Promise<CommitResult> => {
      const hook = repo.beforeNextCommit;
      repo.beforeNextCommit = undefined;
      await hook?.();
      if (sha !== `sha${version}`) throw new GithubError("conflict", "changed", 409);
      bytes = b;
      version++;
      log.push(message);
      return { commitSha: `c${version}`, commitUrl: `https://example/c${version}`, fileSha: `sha${version}` };
    },
  };
  return { repo, log, current: () => file() };
}

describe("saveChanges", () => {
  it("refuses to delete a row that other rows still point at", async () => {
    const { repo, log } = fakeRepo(seed);
    const result = await saveChanges(repo, await repo.read(), [{ type: "delete", sheet: "tags", pk: "TAG0002" }], "m");
    expect(result.status).toBe("invalid");
    expect(log).toEqual([]);
  });

  it("saves valid changes with the SHA of the version they were made from", async () => {
    const { repo, log, current } = fakeRepo(seed);
    const base = await repo.read();
    const result = await saveChanges(repo, base, [set("TOOL0001", "name", cell(await loadWorkbook(seed), "TOOL0001", "name"), "Squeezer")], "Admin: edit");
    expect(result.status).toBe("saved");
    expect(log).toEqual(["Admin: edit"]);
    expect(cell(await loadWorkbook(current().bytes), "TOOL0001", "name")).toBe("Squeezer");
    if (result.status === "saved") expect(result).toMatchObject({ rebased: false, base: { sha: "sha2" } });
  });

  it("does not send a change that would make the workbook invalid", async () => {
    const { repo, log } = fakeRepo(seed);
    const wb = await loadWorkbook(seed);
    const result = await saveChanges(repo, await repo.read(), [set("TOOL0001", "status", cell(wb, "TOOL0001", "status"), "live")], "m");
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.issues.some((i) => i.column === "status")).toBe(true);
    expect(log).toEqual([]);
  });

  it("when someone saved first, applies the same changes to their version and saves again", async () => {
    const { repo, log, current } = fakeRepo(seed);
    const base = await repo.read();
    const wb = await loadWorkbook(seed);
    // Another editor changes a different cell while the person is working.
    repo.beforeNextCommit = async () => {
      const theirs = await loadWorkbook(seed);
      applyChanges(theirs, schema, [set("TOOL0002", "name", cell(theirs, "TOOL0002", "name"), "Their edit")]);
      const other = await saveWorkbook(theirs);
      // simulate their commit landing first
      await repo.commit(other, "sha1", "Other editor");
    };
    const result = await saveChanges(repo, base, [set("TOOL0001", "name", cell(wb, "TOOL0001", "name"), "My edit")], "Mine");
    expect(result.status).toBe("saved");
    if (result.status === "saved") expect(result.rebased).toBe(true);
    const final = await loadWorkbook(current().bytes);
    expect(cell(final, "TOOL0001", "name")).toBe("My edit"); // mine is kept
    expect(cell(final, "TOOL0002", "name")).toBe("Their edit"); // theirs is kept
    expect(log).toEqual(["Other editor", "Mine"]);
  });

  it("when someone changed the same cell, returns a conflict and sends nothing", async () => {
    const { repo, log } = fakeRepo(seed);
    const base = await repo.read();
    const wb = await loadWorkbook(seed);
    const original = cell(wb, "TOOL0001", "name");
    repo.beforeNextCommit = async () => {
      const theirs = await loadWorkbook(seed);
      applyChanges(theirs, schema, [set("TOOL0001", "name", original, "Their name")]);
      await repo.commit(await saveWorkbook(theirs), "sha1", "Other editor");
    };
    const result = await saveChanges(repo, base, [set("TOOL0001", "name", original, "My name")], "Mine");
    expect(result.status).toBe("conflicts");
    if (result.status === "conflicts") {
      expect(result.conflicts[0]).toMatchObject({ kind: "changed", theirs: "Their name" });
      expect(result.base.sha).toBe("sha2"); // resolve against their newest version
      // choosing "mine" for that change saves it on top of theirs
      const forced = await saveChanges(repo, result.base, [set("TOOL0001", "name", original, "My name")], "Mine, kept", new Set([0]));
      expect(forced.status).toBe("saved");
    }
    expect(log).toEqual(["Other editor", "Mine, kept"]);
  });

  it("gives up with a clear error if the file keeps changing", async () => {
    const { repo } = fakeRepo(seed);
    const alwaysChanging: Repo = { read: repo.read, commit: async () => { throw new GithubError("conflict", "changed", 409); } };
    const wb = await loadWorkbook(seed);
    await expect(saveChanges(alwaysChanging, await repo.read(), [set("TOOL0001", "name", cell(wb, "TOOL0001", "name"), "X")], "m")).rejects.toThrow(/keeps changing/);
  });

  it("passes on other GitHub errors untouched", async () => {
    const { repo } = fakeRepo(seed);
    const denied: Repo = { read: repo.read, commit: async () => { throw new GithubError("forbidden", "no", 403); } };
    const wb = await loadWorkbook(seed);
    await expect(saveChanges(denied, await repo.read(), [set("TOOL0001", "name", cell(wb, "TOOL0001", "name"), "X")], "m")).rejects.toMatchObject({ kind: "forbidden" });
  });

  it("keeps the workbook valid after adding and deleting rows", async () => {
    const { repo, current } = fakeRepo(seed);
    const result = await saveChanges(
      repo,
      await repo.read(),
      [
        { type: "add", sheet: "tags", values: { tag_id: "TAG0099", name: "Fresh", slug: "fresh" } },
        { type: "delete", sheet: "advertisements", pk: "AD0003" },
      ],
      "m",
    );
    expect(result.status).toBe("saved");
    const check = await checkWorkbook(current().bytes as unknown as ArrayBuffer, current().bytes.length);
    expect(check.issues).toEqual([]);
  });
});

import { queueAdd, queueDelete, queueRowEdit, touchedIds } from "../lib/admin/changes";

describe("pending change helpers for rows", () => {
  it("queues a row edit as one change per differing column", () => {
    const q = queueRowEdit([], "tools", "tool_id", "T1", { tool_id: "T1", name: "A", slug: "a" }, { tool_id: "T1", name: "B", slug: "a" });
    expect(q).toEqual([set("T1", "name", "A", "B")]);
    expect(queueRowEdit([], "tools", "tool_id", "T1", { name: "A" }, { name: "A" })).toEqual([]);
  });
  it("keeps the original 'before' when the same cell is edited again", () => {
    let q = queueRowEdit([], "tools", "tool_id", "T1", { name: "A" }, { name: "B" });
    q = queueRowEdit(q, "tools", "tool_id", "T1", { name: "B" }, { name: "C" });
    expect(q).toEqual([set("T1", "name", "A", "C")]);
  });
  it("editing a row added in this session updates the add, not a set", () => {
    let q = queueAdd([], "tags", "tag_id", { tag_id: "TAG9", name: "One", slug: "one" });
    q = queueRowEdit(q, "tags", "tag_id", "TAG9", { tag_id: "TAG9", name: "One", slug: "one" }, { tag_id: "TAG9", name: "Two", slug: "two" });
    expect(q).toEqual([{ type: "add", sheet: "tags", values: { tag_id: "TAG9", name: "Two", slug: "two" } }]);
  });
  it("adding the same ID twice replaces the first", () => {
    let q = queueAdd([], "tags", "tag_id", { tag_id: "TAG9", name: "One" });
    q = queueAdd(q, "tags", "tag_id", { tag_id: "TAG9", name: "Two" });
    expect(q).toHaveLength(1);
    expect((q[0] as unknown as { values: { name: string } }).values.name).toBe("Two");
  });
  it("deleting drops pending edits, and forgets a row that was only added here", () => {
    let q = queueRowEdit([], "tags", "tag_id", "TAG1", { name: "A" }, { name: "B" });
    q = queueDelete(q, "tags", "tag_id", "TAG1");
    expect(q).toEqual([{ type: "delete", sheet: "tags", pk: "TAG1" }]);
    expect(queueDelete(q, "tags", "tag_id", "TAG1")).toEqual(q); // deleting twice is still one delete

    const added = queueAdd([], "tags", "tag_id", { tag_id: "TAG9", name: "x" });
    expect(queueDelete(added, "tags", "tag_id", "TAG9")).toEqual([]);
  });
  it("lists which rows are touched", () => {
    const q: Change[] = [set("T1", "name", "a", "b", "tools"), { type: "add", sheet: "tools", values: { tool_id: "T9" } }, set("X", "name", "a", "b", "tags")];
    expect([...touchedIds(q, "tools", "tool_id")]).toEqual([["T1", "changed"], ["T9", "added"]]);
  });
});
