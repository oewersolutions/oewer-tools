/**
 * Set up the Games section in the workbook: the five games, the Games menu link and the ad rows for the games pages.
 * Safe to run again: anything already there is left alone. Only Word Guess is published; the others stay drafts until
 * their game is built.
 *
 *   npx tsx scripts/setup-games.ts [--workbook path]
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applyChanges, type Change } from "../lib/admin/changes";
import { loadWorkbook, saveWorkbook } from "../lib/admin/edit";
import { idAllocator } from "../lib/admin/forms";
import { cellString, toRows } from "../lib/admin/table";
import { checkWorkbook, formatIssue, schema } from "../lib/workbook";

const workbookPath = resolve(process.argv.includes("--workbook") ? process.argv[process.argv.indexOf("--workbook") + 1]! : "data/oewer_database.xlsx");

const WORD_GUESS_HOW = `Guess the hidden five-letter word in six tries.

# How it works

- Type a five-letter word and press **Enter**. Every guess must be a real word from the word list.
- After each guess, every letter changes colour to tell you how close you are.
- A **green tile with a tick** means the letter is in the word and in the right place.
- A **gold tile with a dot** means the letter is in the word, but in another place.
- A **grey tile** means the letter is not in the word, or it is used up: if you guess a letter twice and the word has it once, only one of them is marked.
- Solve it in six guesses or fewer. A new word arrives every day, the same for everyone.

# Tips

- Start with a word that has several different common letters, such as one with two vowels and three consonants.
- Use your second guess to test new letters instead of repeating the ones you already know are wrong.
- Letters can repeat. If a word like LEVEL seems possible, remember that each copy is marked on its own.
- Think about where letters usually sit: Q is nearly always followed by U, and many words end in E, Y, T or S.

# Your results

Your streak and results are saved only in your own browser. Nothing is sent to us. After you finish, **Copy my result** gives you a row of coloured squares to share without giving the word away. Missed a day? Use the puzzle picker above the board to play an earlier puzzle.`;

const DRAFT = "This game is being built. Check back soon.";
const GAMES: [slug: string, name: string, tagline: string, type: string, how: string, status: string][] = [
  ["word-guess", "Word Guess", "Guess the hidden five-letter word in six tries. A new word every day.", "word_guess", WORD_GUESS_HOW, "published"],
  ["four-groups", "Four Groups", "Sort sixteen words into four hidden groups. Watch out for red herrings.", "four_groups", DRAFT, "draft"],
  ["word-trail", "Word Trail", "Trace themed words through a grid of letters. Every letter is used once.", "word_trail", DRAFT, "draft"],
  ["hive-words", "Hive Words", "Make as many words as you can from seven letters. One letter is always needed.", "hive_words", DRAFT, "draft"],
  ["mini-crossword", "Mini Crossword", "A quick crossword on a small grid, with a fresh set of clues each day.", "mini_crossword", DRAFT, "draft"],
];
// The games pages reuse the below-tool and blog-list ad slots until separate ones are made in AdSense.
const ADS: [placement: string, page: string, slot: string][] = [
  ["below_game", "game", "3090571800"],
  ["list_bottom", "game_hub", "6427181580"],
];

let bytes: Uint8Array = new Uint8Array(await readFile(workbookPath));
const wb = await loadWorkbook(bytes);
let data = (await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.byteLength)).data;

async function run(change: Change) {
  const { conflicts } = applyChanges(wb, schema, [change], new Set());
  if (conflicts.length > 0) throw new Error(`Could not apply: ${JSON.stringify(conflicts[0])}`);
  bytes = await saveWorkbook(wb);
  const check = await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.byteLength);
  if (check.issues.length > 0) throw new Error(`The workbook would be invalid:\n  ${check.issues.slice(0, 8).map(formatIssue).join("\n  ")}`);
  data = check.data;
}

const done: string[] = [];
for (const [i, [slug, name, tagline, type, how, status]] of GAMES.entries()) {
  if (toRows(data, "games", schema.sheets.games!).some((g) => cellString(g.values.slug) === slug)) continue;
  await run({ type: "add", sheet: "games", values: { game_id: idAllocator(data, "games")(), slug, name, tagline, game_type: type, how_to_play: how, status, sort_order: String(i + 1) } });
  done.push(`game ${name}`);
}

const nav = toRows(data, "navigation", schema.sheets.navigation!);
if (!nav.some((n) => cellString(n.values.url) === "/games")) {
  // Games sits between Tools and Blog in the header, so the later header links move along by one.
  for (const n of nav.filter((n) => cellString(n.values.location) === "header" && Number(n.values.sort_order) >= 2)) {
    await run({ type: "set", sheet: "navigation", pk: n.id, column: "sort_order", before: String(n.values.sort_order), after: String(Number(n.values.sort_order) + 1) });
  }
  await run({ type: "add", sheet: "navigation", values: { nav_id: idAllocator(data, "navigation")(), label: "Games", url: "/games", location: "header", sort_order: "2", enabled: "TRUE" } });
  done.push("menu link Games");
}

for (const [placement, page, slot] of ADS) {
  if (toRows(data, "advertisements", schema.sheets.advertisements!).some((a) => cellString(a.values.placement_key) === placement && cellString(a.values.page_type) === page)) continue;
  await run({ type: "add", sheet: "advertisements", values: { ad_id: idAllocator(data, "advertisements")(), placement_key: placement, page_type: page, enabled: "TRUE", ad_unit_id: slot } });
  done.push(`ad ${placement} on ${page}`);
}

if (done.length > 0) await writeFile(workbookPath, bytes);
console.log(done.length > 0 ? `Added:\n  - ${done.join("\n  - ")}` : "Nothing to add; the Games section is already set up.");
