# Games section: plan (Phase 10)

**Status (2 November 2026): the foundation and the first game are built.** Done: schema 1.1.0 (the `games` and `game_puzzles` sheets, with a migration that adds sheets), the Games menu link, the `/games/` hub, the game page template, ad placements (`below_game` and the hub's `list_bottom`), search and sitemap entries, **Word Guess** with 21 daily puzzles (1 to 21 November 2026) **Four Groups** with 14, **Hive Words** with 14 and **Mini Crossword** with 12 (all starting 1 November 2026). `npm run puzzles:add` adds puzzles from a batch file. Not built yet: Mini Crossword, Word Trail, the daily puzzle task and the admin gap warning. The other two games exist in the workbook as drafts, so they are not shown.

A "Games" menu and a hub page of daily puzzles, in the style of the New York Times games page (a grid of game cards, each with a short line and a Play button). Everything is configured in the workbook, the same as tools and articles, and each game gets a new puzzle every day. Ads show on the games pages like the rest of the site.

I could not open the NYT page from here (the browser blocked it), so the layout follows what that page is known for: one card per game, a one-line description, today's puzzle number and a Play button.

## Decisions (change any of these before building)

1. **Original games with our own names.** Wordle, Connections, Strands, Spelling Bee and the Crossword are New York Times names, and the NYT protects them. The mechanics (guess a word, sort words into groups, find words in a letter grid, make words from seven letters, fill a grid from clues) are free to use. So the site's games are:

   | Our game | Plays like | Puzzle data |
   |---|---|---|
   | **Word Guess** | the five-letter, six-guess game | one answer word |
   | **Four Groups** | sort 16 words into four hidden groups | 4 groups, a title and 4 words each |
   | **Word Trail** | find themed words in a letter grid | a 6 by 8 grid, a theme, the theme words and a key word |
   | **Hive Words** | make words from seven letters, one is required | 7 letters, the centre letter, all valid words |
   | **Mini Crossword** | a 5 by 5 crossword | the grid, the answers and the clues |

   The names live in the workbook, so you can rename them any time.
2. **A new puzzle every day, chosen by the visitor's own date.** The site is static, so each game page carries the published puzzles and the browser picks today's. Only puzzles dated up to tomorrow are included, so answers for later days are not in the page. If a day has no puzzle yet, the visitor gets the latest one. Past puzzles stay playable ("Play an earlier puzzle").
3. **Puzzles come from a daily task, like the articles.** A scheduled task writes the next days' puzzles to a batch file, a script checks that each one is solvable and valid, and then adds them to the workbook, the same way `add-articles.ts` does for articles. You can also write or edit any puzzle by hand in the admin.
4. **Everything stays on the device.** Progress, streaks and statistics are kept in the browser's local storage. Nothing is sent anywhere, and the games make no network calls, so the privacy tests keep working.
5. **Ads** use the placements already in the site: one below the game on each game page and one at the bottom of the hub. Never inside the board, never over the keyboard, never during play. The page also carries real text (how to play, tips, an explanation of the rules), because AdSense rejects pages that are only a game with no content.

## Workbook (schema 1.1.0, a minor change)

Two new sheets, plus a Games link in the header menu:

- **`games`**: `game_id` (`GAME0001`), `slug`, `name`, `tagline` (one line for the card), `game_type` (`word_guess`, `four_groups`, `word_trail`, `hive_words`, `mini_crossword`), `how_to_play` (Markdown), `status` (draft, published, archived), `sort_order`.
- **`game_puzzles`**: `puzzle_id` (`PUZ00001`), `game_id`, `puzzle_date` (a date, `2026-11-03`), `title` (optional), `puzzle_data` (the puzzle, as JSON text), `status`, `author_note` (optional). One published puzzle per game and date.
- **`navigation`**: one new row, label "Games", URL `/games/`, location header.
- **Migration** `1.0.2 to 1.1.0`: today a migration can only add columns. It has to learn to add a sheet (with its header row), so existing workbooks upgrade in place.
- **Validation:** the schema checks the JSON of `puzzle_data` against the game's type (right number of words, grid size, answers inside the grid, no duplicate puzzle dates), and fails the build with a clear message, the same as for articles.
- **Admin:** the generic sheet editor already handles any sheet, so Games and Puzzles are editable at once. A friendlier form (a list of games, then its puzzles by date, with a preview of how a puzzle will play) comes after the first game works.

## Pages

- `/games/`: the hub. Header, a short intro, a card per published game (name, tagline, today's puzzle number, "Play"), and text about the games. Listed in the sitemap, search and breadcrumbs.
- `/games/<slug>/`: one page per game. The board, how to play, the share result button ("copy my result" as text, with emoji squares and no tracking), a streak, and an archive of past puzzles. Ad below the board.
- Header menu **Games**, home page section "Play today's puzzles", and search results for games.

## Building the five games

1. **Word Guess.** Six tries, five letters, coloured feedback with the standard rules for repeated letters, an on-screen keyboard and a physical keyboard, "hard mode" optional. Checks guesses against a word list. Word source: the public-domain ENABLE list, cut to five-letter words (about 9,000 words, about 55 KB, loaded only on this page).
2. **Four Groups.** Select four, submit; one away is told; four mistakes ends it. Group colours by difficulty. Shuffle button. The generator is told to avoid words that fit more than one group by accident.
3. **Word Trail.** Drag or tap across touching letters. Every letter of the grid belongs to exactly one theme word, and a key word spans the grid. The generator lays out a grid, and the checker confirms the words can be traced and nothing is left over.
4. **Hive Words.** Seven letters in a ring, the centre one required, words of four or more letters, a pangram (uses all seven) worth extra, ranks from "Beginner" up to "Genius". The puzzle carries its full answer list (made offline against the word list), so the page needs no big dictionary.
5. **Mini Crossword.** A 5 by 5 grid with black squares, across and down clues, keyboard and touch entry, a "check" button. The generator fills the grid from words in the word list, writes the clues, and the checker confirms every across and down entry is a real word.

## Daily puzzle task

- A scheduled task (like `Daily articles`) writes the next seven days of puzzles for each game into `content/puzzles/<date>.json`, then runs `npm run add-puzzles`.
- `scripts/add-puzzles.ts` validates every puzzle with the same checks as the build (and the per-game solvers above), refuses the batch if any fails, appends rows to `game_puzzles`, and commits. A weekly look at how many future days are stocked is shown in the admin dashboard, so you see a gap before a visitor does.
- Keeping a week ahead means a failed day does not leave the site without a puzzle.
- Difficulty rises through the week (easy on Monday, hardest on Saturday), as is usual for puzzle sites.

## Order of work

1. Plan (this document).
2. Foundation: schema 1.1.0 and the migration, the two sheets, the Games menu link, the hub page, tests and the admin lists. **Done.**
3. Word Guess, with its daily puzzles and the generator checks. **Done** (the daily task that writes new puzzles is step 8).
4. Four Groups. **Done.**
5. Hive Words. **Done.**
6. Mini Crossword. **Done.**
7. Word Trail.
8. The daily puzzle task and the admin dashboard gap warning.
9. Home page section, search, sitemap, ads on the games pages, the full browser and accessibility checks.

## Rules every game follows

- Playable with a keyboard alone and with a screen reader; colours are never the only signal (letters and marks too); respects "reduce motion".
- Works from 320 px wide, with no horizontal scroll, and with the on-screen keyboard open.
- No network calls while playing. Progress is saved in local storage and the game still works if storage is blocked.
- Text for every game page (how to play, an example, tips) is written for people, not filler, so the page has real content for search and ads.
- Each game is added to the accessibility, privacy, SEO, keyboard, responsive and no-JavaScript test lists. With JavaScript off the page shows the how-to text and a note that the game needs JavaScript.

## How to add or change things now

- **A puzzle:** admin, Manager, sheet `game_puzzles`, or write `content/puzzles/<date>.json` (`{"puzzles":[{"game":"word-guess","date":"2026-11-22","data":{"answer":"CRANE"}}]}`) and run `npm run puzzles:add -- content/puzzles/<date>.json`. The script checks the date, the word list and that an answer is never repeated.
- **A game's name, line or rules text:** sheet `games`. Only games whose type is built can be published.
- **The menu link:** sheet `navigation` (the Games row).
- **Ads on the games pages:** sheet `advertisements`, rows `below_game` (game) and `list_bottom` (game_hub). They reuse the below-tool and blog-list slots for now; create separate units in AdSense when you want separate numbers.
- **Word list:** `public/games/words-5.txt` (the public-domain ENABLE list, five-letter words). Players can guess any word in it, and every answer must be in it.
- **Puzzles are shipped up to tomorrow (UTC).** The site must be rebuilt about once a day (the daily articles commit does this). If it is not, visitors see the latest puzzle until it is.

## Hive Words word lists

- `content/games/common-words.txt` is the list of words Hive Words accepts (24,000 common English words of four letters or more). It is the public-domain ENABLE word list cut down to the common words in the `popular.txt` list from github.com/dolph/dictionary, with proper names (checked against the system dictionary) and everything in `content/games/blocked-words.txt` removed. Add a word to `blocked-words.txt` and delete it from `common-words.txt` to take it out of every puzzle (the puzzle's own list is stored in the workbook, so existing puzzles need their `puzzle_data` edited too).
- A Hive Words batch file only needs the letters: `{"game":"hive-words","date":"2026-11-15","data":{"center":"O","outer":["A","D","I","R","T","U"]}}`. `npm run puzzles:add` fills in every word the letters can make from the list, and refuses a set of letters with no pangram or fewer than ten words.
- Skim the words of each new puzzle before publishing. The lists are filtered but not hand-checked word by word.
- `npm run game:publish -- <slug> <how-to.md>` sets a game's rules text and publishes it.

## Mini Crossword puzzles

- A puzzle is `{"grid": ["AGO##","ROLL#","MEDIA","#SEND","##RED"], "across": {"1": "clue"}, "down": {"1": "clue"}}`: five rows of five capital letters, `#` for a black square, and one clue for every numbered word, keyed by its number (numbered left to right, top to bottom, the usual way). The checker works out the entries itself and refuses a grid with a two-letter run, a lone letter, a missing or extra clue, a clue that contains its own answer, or an answer of four or more letters that is not in `content/games/common-words.txt`.
- Filling a grid is the hard part. Grids with more black squares (three-letter words at the corners) fill far more easily than nearly open ones. The twelve published grids were found by a random search over frequent words and then read and clued by hand.
- There are 12 puzzles, not 14, so the supply runs out after 12 November. Write more by hand in the admin or as a batch file.

## Open questions for you

- Names: keep Word Guess, Four Groups, Word Trail, Hive Words, Mini Crossword?
- The order of building: should Word Guess go first (recommended: the simplest and the most popular)?
- Puzzle language: English only, with Indian places, food and cricket as themes where they fit?
