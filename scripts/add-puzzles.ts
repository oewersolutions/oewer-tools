/**
 * Add daily puzzles to the workbook.
 *
 *   npx tsx scripts/add-puzzles.ts content/puzzles/2026-11-03.json [--status draft|published] [--dry-run]
 *
 * The file is {"puzzles": [{"game": "word-guess", "date": "2026-11-03", "title": "", "data": {...}}]}, where `game` is
 * the game's slug and `data` is the puzzle in the shape its game type needs (docs/games-plan.md). Each puzzle is
 * checked; the ones that pass are added, the rest are reported with the reasons and left out. The whole workbook is
 * validated before anything is written, so a bad batch can never leave the workbook broken. Prints a JSON summary and
 * exits 1 when nothing was added.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applyChanges, type Change } from "../lib/admin/changes";
import { loadWorkbook, saveWorkbook } from "../lib/admin/edit";
import { idAllocator } from "../lib/admin/forms";
import { cellString, toRows } from "../lib/admin/table";
import { wordsFor } from "../lib/games/hive-words";
import { checkPuzzleData, isPuzzleDate } from "../lib/games/puzzles";
import { BUILT_GAME_TYPES, type GameType } from "../lib/games/types";
import { checkWorkbook, formatIssue, schema } from "../lib/workbook";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => args[args.indexOf(`--${name}`) + 1];
if (!file) throw new Error("Give the batch file, e.g. content/puzzles/2026-11-03.json");
const status = flag("status") ? value("status") : "published";
if (status !== "draft" && status !== "published") throw new Error("--status must be draft or published");
const workbookPath = resolve(flag("workbook") ? value("workbook")! : "data/oewer_database.xlsx");

interface Entry {
  game: string;
  date: string;
  title?: string;
  data: unknown;
}
const batch = JSON.parse(await readFile(resolve(file), "utf-8")) as { puzzles?: Entry[] };
if (!Array.isArray(batch.puzzles) || batch.puzzles.length === 0) {
  console.error('The batch file must be {"puzzles": [ ... ]} with at least one puzzle.');
  process.exit(1);
}

const wordLists: Partial<Record<GameType, Set<string>>> = {
  word_guess: new Set((await readFile(resolve("public/games/words-5.txt"), "utf-8")).split("\n").filter(Boolean)),
  hive_words: new Set((await readFile(resolve("content/games/common-words.txt"), "utf-8")).split("\n").filter(Boolean)),
};
wordLists.mini_crossword = wordLists.hive_words;

let bytes: Uint8Array = new Uint8Array(await readFile(workbookPath));
const wb = await loadWorkbook(bytes);
const start = await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.byteLength);
if (start.issues.length > 0) {
  console.error(`The workbook is not valid to begin with:\n  ${start.issues.slice(0, 8).map(formatIssue).join("\n  ")}`);
  process.exit(1);
}
let data = start.data;

const added: { game: string; date: string }[] = [];
const rejected: { game: string; date: string; problems: string[] }[] = [];

for (const entry of batch.puzzles) {
  const problems: string[] = [];
  const game = toRows(data, "games", schema.sheets.games!).find((g) => cellString(g.values.slug) === entry.game);
  const type = game ? (cellString(game.values.game_type) as GameType) : undefined;
  if (!game) problems.push(`There is no game with the slug '${entry.game}'.`);
  else if (!BUILT_GAME_TYPES.includes(type!)) problems.push(`'${entry.game}' is a ${type} game, which is not built yet.`);
  if (!isPuzzleDate(String(entry.date))) problems.push(`'${entry.date}' is not a real date (use YYYY-MM-DD).`);
  const existing = game ? toRows(data, "game_puzzles", schema.sheets.game_puzzles!).filter((p) => cellString(p.values.game_id) === game.id) : [];
  if (existing.some((p) => cellString(p.values.puzzle_date) === entry.date)) problems.push(`${entry.game} already has a puzzle for ${entry.date}.`);
  // A Hive Words puzzle only needs its letters: the word list is every common word they can make.
  if (type === "hive_words") {
    const d = entry.data as { center?: string; outer?: string[]; words?: string[] };
    if (d && typeof d.center === "string" && Array.isArray(d.outer) && !d.words) entry.data = { center: d.center, outer: d.outer, words: wordsFor(d.center, d.outer, wordLists.hive_words!) };
  }
  const text = JSON.stringify(entry.data);
  if (type && BUILT_GAME_TYPES.includes(type)) {
    const bad = checkPuzzleData(type, text, wordLists[type]);
    if (bad) problems.push(`The puzzle ${bad}.`);
    // A word must not come round again: every earlier answer of this game is off limits.
    const answer = (entry.data as { answer?: string } | null)?.answer;
    if (type === "word_guess" && answer && existing.some((p) => (JSON.parse(cellString(p.values.puzzle_data)) as { answer?: string }).answer === answer)) problems.push(`${answer} has been an answer before.`);
  }
  if (problems.length > 0) {
    rejected.push({ game: entry.game, date: entry.date, problems });
    continue;
  }

  const change: Change = {
    type: "add",
    sheet: "game_puzzles",
    values: { puzzle_id: idAllocator(data, "game_puzzles")(), game_id: game!.id, puzzle_date: entry.date, title: entry.title ?? "", puzzle_data: text, status, author_note: "" },
  };
  const { conflicts } = applyChanges(wb, schema, [change], new Set());
  if (conflicts.length > 0) throw new Error(`Could not apply: ${JSON.stringify(conflicts[0])}`);
  bytes = await saveWorkbook(wb);
  const check = await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.byteLength);
  if (check.issues.length > 0) throw new Error(`The workbook would be invalid:\n  ${check.issues.slice(0, 8).map(formatIssue).join("\n  ")}`);
  data = check.data;
  added.push({ game: entry.game, date: entry.date });
}

if (added.length > 0 && !flag("dry-run")) await writeFile(workbookPath, bytes);
console.log(JSON.stringify({ status, dryRun: flag("dry-run"), added, rejected }, null, 2));
process.exit(added.length > 0 ? 0 : 1);
