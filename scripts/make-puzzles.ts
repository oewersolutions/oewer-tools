/**
 * Helpers for keeping the daily puzzles stocked.
 *
 *   npx tsx scripts/make-puzzles.ts status
 *       How many days of puzzles each game has ready, and the first day with none.
 *   npx tsx scripts/make-puzzles.ts auto [--days 14] [--dry-run]
 *       Make and add the puzzles that need no writing: Word Guess answers and Hive Words letters, for every day from
 *       today up to --days days ahead that has none yet.
 *   npx tsx scripts/make-puzzles.ts crossword [--count 3] [--seed 1]
 *       Print filled Mini Crossword grids with their numbered answers. Write a clue for each answer, then add the
 *       puzzle with scripts/add-puzzles.ts.
 *   npx tsx scripts/make-puzzles.ts review [--from 2026-11-20]
 *       Print every puzzle dated from then on in readable form, to read before committing.
 *   npx tsx scripts/make-puzzles.ts drop-word WORD
 *       Take a word out of the Hive Words and Mini Crossword word list for good: it is removed from
 *       content/games/common-words.txt and from every Hive Words puzzle in the workbook, and added to blocked-words.txt.
 *   npx tsx scripts/make-puzzles.ts trail --key CRICKET --words "WICKET BOWLER ..." [--theme "On the field"] [--seed 1]
 *       Lay a key word and a pool of theme words out in the 8 by 6 grid, choosing words that add up to 48 letters, and
 *       print the puzzle data for add-puzzles.ts.
 */
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { addDays, CROSSWORD_SHAPES, fillCrossword, type Grid, hiveKey, packTrail, pickAnswers, pickHive, seeded, stockFrom, trailSubsets } from "../lib/games/make";
import { applyChanges, type Change } from "../lib/admin/changes";
import { loadWorkbook, saveWorkbook } from "../lib/admin/edit";
import { checkWorkbook, schema } from "../lib/workbook";

const [command = "status", ...rest] = process.argv.slice(2);
const flag = (name: string, fallback?: string) => (rest.includes(`--${name}`) ? rest[rest.indexOf(`--${name}`) + 1] : fallback);
const workbookPath = resolve(flag("workbook", "data/oewer_database.xlsx")!);
const today = flag("today") ?? new Date().toISOString().slice(0, 10);
const lines = async (file: string) => (await readFile(resolve(file), "utf-8")).split("\n").filter(Boolean);

const bytes = await readFile(workbookPath);
const check = await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.byteLength);
if (check.issues.length > 0) throw new Error(`The workbook is not valid: ${check.issues[0]!.message}`);
const games = (check.data.games ?? []).map((g) => ({ id: String(g.values.game_id), slug: String(g.values.slug), type: String(g.values.game_type), status: String(g.values.status), name: String(g.values.name) }));
const puzzles = (check.data.game_puzzles ?? []).map((p) => ({ game: String(p.values.game_id), date: String(p.values.puzzle_date), status: String(p.values.status), data: String(p.values.puzzle_data) }));
const datesOf = (gameId: string) => new Set(puzzles.filter((p) => p.game === gameId && p.status === "published").map((p) => p.date));

if (command === "status") {
  for (const g of games.filter((g) => g.status === "published")) {
    const { days, nextMissing } = stockFrom(datesOf(g.id), today);
    const last = [...datesOf(g.id)].sort().pop() ?? "none";
    console.log(`${g.slug.padEnd(15)} ${String(days).padStart(3)} day(s) ready from ${today}; first day without a puzzle: ${nextMissing}; last puzzle: ${last}`);
  }
} else if (command === "auto") {
  const days = Number(flag("days", "14"));
  const rng = seeded(Number(flag("seed", String(Date.now() % 100000))));
  const batch: { game: string; date: string; title: string; data: unknown }[] = [];
  const guessWords = (await lines("content/games/frequent-words.txt")).filter((w) => w.length === 5 && !w.endsWith("S"));
  const common = await lines("content/games/common-words.txt");
  for (const g of games.filter((g) => g.status === "published" && (g.type === "word_guess" || g.type === "hive_words"))) {
    const have = datesOf(g.id);
    const missing = Array.from({ length: days }, (_, i) => addDays(today, i)).filter((d) => !have.has(d));
    if (g.type === "word_guess") {
      const usedAnswers = new Set(puzzles.filter((p) => p.game === g.id).map((p) => (JSON.parse(p.data) as { answer: string }).answer));
      const answers = pickAnswers(guessWords, usedAnswers, missing.length, rng);
      missing.slice(0, answers.length).forEach((date, i) => batch.push({ game: g.slug, date, title: "", data: { answer: answers[i] } }));
    } else {
      const usedSets = new Set(puzzles.filter((p) => p.game === g.id).map((p) => hiveKey(JSON.parse(p.data) as { center: string; outer: string[] })));
      for (const date of missing) {
        const pick = pickHive(common, usedSets, rng);
        if (!pick) break;
        usedSets.add(hiveKey(pick));
        batch.push({ game: g.slug, date, title: "", data: pick });
      }
    }
  }
  if (batch.length === 0) console.log("Nothing to add: Word Guess and Hive Words are stocked for the next " + days + " days.");
  else {
    const file = resolve(`content/puzzles/auto-${today}.json`);
    await writeFile(file, JSON.stringify({ puzzles: batch }, null, 1) + "\n");
    console.log(`Wrote ${batch.length} puzzle(s) to ${file}`);
    if (!rest.includes("--dry-run")) {
      try {
        execFileSync("npx", ["tsx", "scripts/add-puzzles.ts", file, "--workbook", workbookPath], { stdio: "inherit" });
      } catch {
        process.exitCode = 1;
      }
    }
  }
} else if (command === "crossword") {
  const count = Number(flag("count", "3"));
  const rng = seeded(Number(flag("seed", String(Date.now() % 100000))));
  const words = await lines("content/games/frequent-words.txt");
  const out: Grid[] = [];
  for (let attempt = 0; out.length < count && attempt < 400; attempt++) {
    const found = fillCrossword(CROSSWORD_SHAPES[attempt % CROSSWORD_SHAPES.length]!, words, rng, 800);
    if (found && !out.some((o) => o.grid.join() === found.grid.join())) out.push(found);
  }
  console.log(JSON.stringify(out, null, 1));
} else if (command === "trail") {
  const key = flag("key")?.toUpperCase();
  const pool = (flag("words") ?? "").toUpperCase().split(/\s+/).filter(Boolean);
  if (!key || pool.length === 0) throw new Error('Give --key WORD and --words "A B C ..."');
  const rng = seeded(Number(flag("seed", String(Date.now() % 100000))));
  const subsets = trailSubsets([key, ...pool], key, rng);
  if (subsets.length === 0) throw new Error("No mix of those words adds up to 48 letters with the key word. Add more words, or different lengths.");
  let result = null;
  for (const words of subsets) {
    result = packTrail(words, key, rng, 4000);
    if (result) break;
  }
  if (!result) throw new Error("No layout was found. Try again, or give a different pool of words.");
  console.log(JSON.stringify({ theme: flag("theme") ?? "", grid: result.grid, words: result.words }, null, 1));
} else if (command === "review") {
  const from = flag("from", today)!;
  const slugOf = new Map(games.map((g) => [g.id, g]));
  for (const p of puzzles.filter((p) => p.date >= from).sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const g = slugOf.get(p.game);
    if (!g) continue;
    const d = JSON.parse(p.data) as Record<string, unknown>;
    let text = "";
    if (g.type === "word_guess") text = String(d.answer);
    else if (g.type === "hive_words") text = `centre ${String(d.center)}, others ${(d.outer as string[]).join("")}: ${(d.words as string[]).join(" ")}`;
    else if (g.type === "four_groups") text = (d.groups as { title: string; level: number; words: string[] }[]).map((x) => `[${x.level}] ${x.title}: ${x.words.join(", ")}`).join(" | ");
    else if (g.type === "mini_crossword") text = `${(d.grid as string[]).join("/")}  across ${JSON.stringify(d.across)} down ${JSON.stringify(d.down)}`;
    else if (g.type === "word_trail") text = `${String(d.theme)}: ${(d.words as { word: string }[]).map((w) => w.word).join(" ")}`;
    console.log(`${p.date} ${g.slug.padEnd(15)} ${p.status.padEnd(9)} ${text}`);
  }
} else if (command === "drop-word") {
  const word = (rest[0] ?? "").toUpperCase();
  if (!/^[A-Z]{4,}$/.test(word)) throw new Error("Give one word of four or more letters, for example: drop-word BADWORD");
  const listFile = resolve("content/games/common-words.txt");
  const list = (await readFile(listFile, "utf-8")).split("\n").filter(Boolean);
  await writeFile(listFile, list.filter((w) => w !== word).join("\n") + "\n");
  const blockedFile = resolve("content/games/blocked-words.txt");
  const blocked = (await readFile(blockedFile, "utf-8")).split("\n").filter(Boolean);
  if (!blocked.includes(word)) await writeFile(blockedFile, [...blocked, word].sort().join("\n") + "\n");
  const hiveIds = new Set(games.filter((g) => g.type === "hive_words").map((g) => g.id));
  const changes: Change[] = [];
  for (const row of check.data.game_puzzles ?? []) {
    if (!hiveIds.has(String(row.values.game_id))) continue;
    const before = String(row.values.puzzle_data);
    const data = JSON.parse(before) as { words: string[] };
    if (!data.words.includes(word)) continue;
    changes.push({ type: "set", sheet: "game_puzzles", pk: String(row.values.puzzle_id), column: "puzzle_data", before, after: JSON.stringify({ ...data, words: data.words.filter((w) => w !== word) }) });
  }
  if (changes.length > 0) {
    const wb = await loadWorkbook(new Uint8Array(bytes));
    const { conflicts } = applyChanges(wb, schema, changes, new Set());
    if (conflicts.length > 0) throw new Error(`Could not apply: ${JSON.stringify(conflicts[0])}`);
    const out = await saveWorkbook(wb);
    const after = await checkWorkbook(out as unknown as ArrayBuffer, out.byteLength);
    if (after.issues.length > 0) throw new Error(`The workbook would be invalid: ${after.issues[0]!.message}`);
    await writeFile(workbookPath, out);
  }
  console.log(`Removed ${word} from the word list and from ${changes.length} Hive Words puzzle(s).`);
} else {
  throw new Error(`Unknown command '${command}'. Use status, auto, crossword or trail.`);
}
