# Daily puzzles

Every day the scheduled run tops up the puzzles for the five games so that **every game has at least 14 days of puzzles ready, counting from today**. This file is the whole job description: the run starts with no memory, so everything it needs is here. How the games and their data work is in `docs/games-plan.md`.

## Why this matters

A game page with no puzzle for today shows the latest older one, so a gap does not break the site, but visitors who play every day notice at once. The admin dashboard shows a warning when any game has fewer than 5 days ready. A run that cannot make a good puzzle should make **fewer, not worse**: an easy puzzle that is fair is better than a clever one that has two answers.

## Each day

1. **Get the latest.** In the project folder: `git fetch` and make the working copy equal to `origin/main` plus any earlier local daily commits that have not been pushed yet (never rewrite or force anything). This run has no GitHub token and must not look for one.
2. **See what is needed.** `npm run puzzles:make -- status`. For every game it prints the days ready from today and the first day with no puzzle. The goal is 14 days ready for every game. In one run add **at most 7 days per game**; a long gap is caught up over several runs.
3. **Word Guess and Hive Words: automatic.** Run `npm run puzzles:make -- auto --days 14`. It picks answers and letter sets itself and adds them. Then read what it made with `npm run puzzles:make -- review --from <first new date>`.
   - Word Guess: the answer must be an ordinary everyday word. If one is obscure, a place name, a name of a person, or something you would not want on a family website, delete that puzzle row in the workbook, or replace it by writing the day's batch by hand (format in `docs/games-plan.md`).
   - Hive Words: skim the word lists. For every word that is a proper name, a rude or offensive word, an abbreviation or something no ordinary reader knows, run `npm run puzzles:make -- drop-word THEWORD`. It removes the word from the word list for good and from every Hive Words puzzle.
4. **Four Groups: write them.** For each missing day write one puzzle (format below) in `content/puzzles/four-groups-YYYY-MM-DD.json` and add it with `npm run puzzles:add -- <file>`.
5. **Mini Crossword: fill and clue.** `npm run puzzles:make -- crossword --count 4` prints filled grids with their numbered answers. Pick one whose answers are all ordinary words you can write a short, correct clue for (skip the grid if any answer is a name, an abbreviation, slang or a fragment such as DEL). Write the clues (format below) into `content/puzzles/mini-crossword-YYYY-MM-DD.json` and add it. Ask for more grids with a different `--seed` if none is good.
6. **Word Trail: choose a theme and lay it out.** Pick a theme, a **key word** that names it (6 to 10 letters, it will run across the grid), and a pool of 8 to 12 other theme words of 4 to 9 letters. Run `npm run puzzles:make -- trail --key KEYWORD --theme "Short theme title" --words "WORD1 WORD2 ..."`. It chooses words that add up to 48 letters and prints the puzzle data. Save it as `content/puzzles/word-trail-YYYY-MM-DD.json` in the batch format and add it. Do not reuse a theme from the last 30 days (`npm run puzzles:make -- review --from 2026-11-01` lists them).
7. **Read it all once more.** `npm run puzzles:make -- review --from <first new date>`. Fix or delete anything wrong.
8. **Check the whole site builds:** `npm run validate` then `npm run build`. If either fails, do not commit; undo the workbook change (`git checkout data/oewer_database.xlsx`), and report what failed.
9. **Commit locally, do not push.** Message `Daily puzzles YYYY-MM-DD` plus a line per game saying how many days were added. The owner pushes later in an interactive session; unpushed commits simply wait.
10. **Report** in the final message: the commit id, how many puzzles were added to each game, the days ready per game afterwards (`status`), any word you dropped, anything rejected or skipped and why, and how many daily commits are waiting to be pushed.

## Batch files

Every file is `{"puzzles": [ ... ]}`. Each entry has `game` (the game's slug), `date` (`YYYY-MM-DD`) and `data`. `npm run puzzles:add -- <file>` checks every puzzle and reports the ones it rejects with the reasons; fix those and add them again.

**Four Groups** (`game: "four-groups"`):
```json
{"game": "four-groups", "date": "2026-11-15", "data": {"groups": [
  {"title": "Fruits", "level": 1, "words": ["MANGO", "GUAVA", "PAPAYA", "LYCHEE"]},
  {"title": "Cricket fielding positions", "level": 2, "words": ["SLIP", "GULLY", "POINT", "COVER"]},
  {"title": "___ fish", "level": 3, "words": ["GOLD", "CAT", "SWORD", "JELLY"]},
  {"title": "Start with a body part", "level": 4, "words": ["ARMOUR", "LEGEND", "SHINGLE", "CHINA"]}
]}}
```
Four groups, four words each, 16 different capital-letter words (up to 14 characters), levels 1 (easiest) to 4 (trickiest) each used once. Level 1 is a plain category, level 4 is wordplay (hidden words, add a letter, sounds like). Rules for a fair puzzle: **every word fits exactly one solution**. A word may look as if it fits two groups (that is the fun), but the whole puzzle must have only one way to sort all 16. Avoid anything that depends on opinion. Mix everyday and Indian themes. Never repeat a group title used before.

**Mini Crossword** (`game: "mini-crossword"`):
```json
{"game": "mini-crossword", "date": "2026-11-15", "data": {
  "grid": ["AGO##", "ROLL#", "MEDIA", "#SEND", "##RED"],
  "across": {"1": "Gone by; in the past", "4": "Bread bun, or to tumble over"},
  "down": {"1": "Limb with an elbow", "2": "Travels or leaves"}
}}
```
`grid` comes from the `crossword` command. Numbers are the usual ones (left to right, top to bottom), and **every** answer in the grid needs a clue under `across` or `down`, keyed by its number. Clues are a short definition or hint (under 120 characters), accurate, in plain words, never containing the answer itself. Plurals get plural clues, past tenses past-tense clues. No clues that need a search engine.

**Word Trail** (`game: "word-trail"`): the `trail` command prints `theme`, `grid` and `words` with every word's squares. Put them under `data`. The theme title is short and points at the key word without being it.

## Quality rules

- Original puzzles only. Never copy a puzzle, a clue or a group from any newspaper, app or website, and never use the name of another game.
- Suitable for all ages. No sexual, violent or hateful words; no living people's names; no brand names unless they are everyday words.
- Plain English. Words must be ones an ordinary adult in India or the UK would know; avoid slang that only some people know.
- Never put a token or password in a file, a commit message or a report.
