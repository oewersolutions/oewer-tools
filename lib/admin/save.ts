import { applyChanges, type Change, type Conflict } from "./changes";
import { loadWorkbook, saveWorkbook } from "./edit";
import { GithubError, type CommitResult, type WorkbookFile } from "./github";
import { checkWorkbook, schema, type Issue } from "../workbook";

/** The two GitHub calls the save workflow needs; tests replace them with an in-memory repository. */
export interface Repo {
  read(): Promise<WorkbookFile>;
  commit(bytes: Uint8Array, sha: string, message: string): Promise<CommitResult>;
}

export type SaveResult =
  /** Saved. `base` is the version now on GitHub. */
  | { status: "saved"; commit: CommitResult; base: WorkbookFile; rebased: boolean }
  /** The changes would leave the workbook invalid, so nothing was sent. */
  | { status: "invalid"; issues: Issue[] }
  /** Some changes clash with newer edits. Nothing was sent; `base` is the newest version to resolve against. */
  | { status: "conflicts"; conflicts: Conflict[]; base: WorkbookFile };

const MAX_REBASES = 2;

/**
 * Safe write workflow:
 *  1. apply the changes to the version they were made from, and check the result is valid;
 *  2. save it with that version's SHA, so GitHub refuses if anyone saved in the meantime;
 *  3. if GitHub refuses, fetch the newest version, apply the same changes to it, and try again.
 * Changes that cannot be applied to the newest version are returned as conflicts, never silently dropped or forced.
 */
export async function saveChanges(repo: Repo, base: WorkbookFile, changes: Change[], message: string, force: ReadonlySet<number> = new Set()): Promise<SaveResult> {
  let rebased = false;
  for (let attempt = 0; attempt <= MAX_REBASES; attempt++) {
    const wb = await loadWorkbook(base.bytes);
    const { conflicts } = applyChanges(wb, schema, changes, force);
    if (conflicts.length > 0) return { status: "conflicts", conflicts, base };

    const bytes = await saveWorkbook(wb);
    const { issues } = await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.byteLength);
    if (issues.length > 0) return { status: "invalid", issues };

    try {
      const commit = await repo.commit(bytes, base.sha, message);
      return { status: "saved", commit, base: { bytes, sha: commit.fileSha, size: bytes.length }, rebased };
    } catch (e) {
      if (!(e instanceof GithubError) || e.kind !== "conflict") throw e;
      base = await repo.read(); // someone saved first: start again from their version
      rebased = true;
    }
  }
  throw new GithubError("conflict", "The workbook keeps changing on GitHub, so your changes could not be saved. Wait a moment and try again.");
}
