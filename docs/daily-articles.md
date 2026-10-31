# Daily articles

Every day the scheduled run researches and publishes **5 new articles** across many subjects. This file is the whole job description: the run starts with no memory, so everything it needs is here. (Decided 31 October 2026: automatic publishing, 5 a day. Change those numbers here and in the schedule if they change.)

## Why the rules are strict

The site earns money from ads, and Google can refuse or remove ads on sites with large amounts of thin or unchecked content, whoever writes it. A wrong price or date also costs readers' trust. So volume is never an excuse for weak articles: **if five good articles cannot be written, publish fewer.** Zero is an acceptable day.

## Each day

1. **Get the latest.** In the project folder: `git fetch` and make the working copy equal to `origin/main` plus any earlier local daily-article commits that have not been pushed yet (never rewrite or force anything). This run has no GitHub token and must not look for one.
2. **See what exists.** `npm run articles:list`. Note every title and how many articles each category has.
3. **Choose 5 subjects.** Take them from different categories, favouring the categories with the fewest articles. Use the topic bank below or anything else that suits the site. Never repeat a title or a near-duplicate angle. Mix evergreen explainers (how it works, history) with at most two "current" subjects (prices, launches, announcements) a day.
4. **Research each one properly.** Use web search, then **open and read** the pages. Prefer official and primary sources (a company's own page, a manufacturer, a standards body, a museum, a government site). Use at least **two sources on different websites**. Only list a source you actually opened and that supports the claims you used it for. Note any dates.
5. **Write each article** (see "How to write" below), 700 to 1,100 words.
6. **Save the day's batch** as `content/batches/YYYY-MM-DD.json` (format below) and run:
   `npx tsx scripts/add-articles.ts content/batches/YYYY-MM-DD.json --status published`
   Read what it says. For every article it rejects, fix the problems it lists and try that article again (up to twice). Do not weaken an article just to pass; if it cannot be made good, drop it.
7. **Check the whole site builds:** `npm run validate` then `npm run build`. If either fails, do not commit; undo the workbook change (`git checkout data/oewer_database.xlsx`), and report what failed.
8. **Commit locally, do not push.** Commit with the message `Daily articles YYYY-MM-DD` plus a line per article. The owner pushes later in an interactive session; unpushed commits simply wait. If the workbook changed upstream meanwhile, that is handled at push time, not here.
9. **Report** in the final message: how many were published, how many daily commits are waiting to be pushed, titles and categories, anything rejected or dropped and why, and anything the owner should look at.

## The batch file

```json
{
  "date": "2026-11-01",
  "articles": [
    {
      "title": "How a Hybrid Car Switches Between Petrol and Electric Power",
      "category": "Cars and Bikes",
      "excerpt": "A 60 to 300 character summary shown in lists and search results.",
      "tags": ["hybrid", "engines"],
      "blocks": [
        ["paragraph", "Opening paragraph."],
        ["heading", "A section heading"],
        ["paragraph", "Text."],
        ["list", "First point\nSecond point"],
        ["callout", "A short note worth highlighting."]
      ],
      "sources": [
        { "title": "Page title, Publisher", "url": "https://example.org/the-page" }
      ],
      "checkedOn": "2026-11-01"
    }
  ]
}
```

Block types: `paragraph`, `heading`, `list` (one item per line), `quote`, `callout`, `code`. Text supports `**bold**`, `*italic*` and `[link text](https://…)`. No HTML, no `#` marks, no images. The tool adds the "Checked on" note and the **Sources** list at the end; do not write them yourself. New categories need `"categoryDescription"`; these exist already: AI, Technology, Cars and Bikes, Aviation, Vintage and History, Electronics, How It Works, Money Guides, How-To.

## How to write

- **Titles are 20 to 60 characters**, so the page title still fits in search results once the site name is added.

- **Plain and specific.** Short sentences, everyday words, concrete numbers and examples. Explain a term the first time it appears. One idea per paragraph.
- **Open with the answer.** The first paragraph says what the reader will learn and the main point.
- **Structure.** Three to eight headings that say what is under them. Use a list when there really is a list, and a callout for one useful tip or caution. Avoid padding.
- **Your own words.** Never copy sentences from a source. Facts are free; wording is not. A quotation, if any, is a few words, in quotation marks, named.
- **Say where numbers come from** ("according to the company's pricing page") and **when** ("as of 1 November 2026") for anything that changes: prices, plans, features, rankings, sales figures, specifications.
- **Be honest about the unknown.** Rumours and leaks are labelled as such; do not present them as fact. "The company has not said" is a fine sentence.
- **No invented experience.** Never write as if you tested, drove, flew, owned, visited or used something. Write from the sources.
- **No advice.** No financial, medical, legal or safety instructions beyond what a source states plainly. Say it is general information where relevant.
- **Neutral about companies.** No hype, no put-downs, no "best". Compare using facts. Names belong to their owners.
- **No filler.** The tool rejects stock phrases ("delve into", "game-changer", "in today's fast-paced world", and similar). Say the thing directly.
- **History:** every date, name and figure from a source; where sources disagree, say so.

## Topic bank (add to it freely)

**AI:** what the main chatbot plans cost and what each tier includes; free versus paid tiers; how AI chatbots are priced for developers (tokens explained); what a context window is; how image generators work; open versus closed models; what AI features phones and laptops now advertise; how AI is used in cars and cameras; what "training data" means; why AI makes things up; AI and copyright, in plain terms; energy use of AI data centres.

**Technology:** how Wi-Fi 7 differs from Wi-Fi 6; what 5G changes; how GPS works; how QR codes store data; how passkeys replace passwords; how solid-state storage works; how batteries age; what quantum computers are for; how the cloud works; how video streaming adapts to your connection; how encryption keeps messages private; how a CPU differs from a GPU.

**Cars and Bikes:** how a hybrid works; how an electric car's battery and charging work; what regenerative braking does; how a turbocharger works; how automatic gearboxes work; what ABS does; how a motorcycle stays upright; diesel versus petrol engines; how electric motorbikes differ; what the numbers on a tyre mean; how self-driving levels are defined; how a car's cruise control and lane assist work.

**Aviation:** how aeroplanes stay in the air; how jet engines work; why planes fly at high altitude; how pilots navigate; what the black box records; how air traffic control works; how helicopters fly; why contrails form; how airports plan runways; how electric aircraft are being developed.

**Vintage and History:** the Ford Model T and the assembly line; the Volkswagen Beetle's story; the history of Royal Enfield; the first motorcars; the Wright brothers' first flights; the Concorde; the Vespa and the scooter boom; how Toyota developed its production system; the Ambassador and Indian roads; the Tata company's vehicle history; classic Harley-Davidson models; steam locomotives; how car safety belts came about.

**Electronics:** how a smartphone camera works; how OLED differs from LCD; how wireless earbuds work; how a touchscreen senses touch; how a laptop battery is rated; what refresh rate means; how smartwatches measure heart rate; how a microwave oven heats food; how a USB-C charger negotiates power; how noise-cancelling works; how a drone stays stable.

**How It Works:** how a refrigerator cools; how a washing machine senses load; how a lift stays safe; how a bicycle gears work; how a clock keeps time; how a thermostat decides; how a barcode scanner reads; how a fuel pump knows when to stop; how a water purifier cleans water.

## The token

Scheduled runs have no token and never push. The owner pushes the waiting commits from an interactive session. Never ask for, search for or store a token during a scheduled run.

## Safety stops

- Never force-push, never rewrite history, never change files other than the workbook, the batch file and the generated summary.
- Never publish more than 12 articles in a run (the tool refuses).
- If the build or the deploy fails, revert and report; do not try to patch the site code.
- If the web research tools do not work, publish only evergreen articles you can write accurately from established knowledge **and** can support with at least two sources you have opened; if you cannot open sources, publish nothing that day.
