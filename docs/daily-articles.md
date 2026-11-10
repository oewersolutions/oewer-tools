# Daily articles

Every day the scheduled run researches and publishes **10 new news articles**, all written to a high standard. This file is the whole job description: the run starts with no memory, so everything it needs is here. (Changed 10 November 2026: the site moved from mixed evergreen and vehicle news to four news genres, 10 articles a day. Change the numbers here and in the schedule if they change.)

The four genres, every day:

- **Game launches and gaming news:** 3 articles.
- **Latest news (world, India, technology, business and everyday life):** 3 articles.
- **Politics and government:** 2 articles.
- **Stock market and business news:** 2 articles.

## Why the rules are strict

The site earns money from ads, and Google refused ads on the site for "low value content" in November 2026 because of large amounts of quickly published, derivative news. So the bar is higher now: **each article must add something a reader cannot get by reading one other news site**: clear context, background, what is known and unknown, what happens next, and a careful explanation of what it means for an ordinary reader. **If ten good articles cannot be written, publish fewer.** Zero is an acceptable day. Never pad, never rewrite another outlet's article, never stretch an old story.

## Each day

1. **Get the latest.** In the project folder: `git fetch` and make the working copy equal to `origin/main` plus any earlier local daily-article commits that have not been pushed yet (never rewrite or force anything). This run has no GitHub token and must not look for one.
2. **See what exists.** `npm run articles:list`. Note every title so you do not repeat a story. A follow-up on a story is allowed only when there is a genuinely new development, and it must say what changed.
3. **Choose 10 stories** in the split above. Search the web for the newest stories in each genre (add the month and year to the query). Prefer stories from the **last 3 days**, and never older than 7 days. Choose stories that matter to a reader and have enough verified material for a solid article.
4. **Research each one properly.** **Open and read** the pages. Use primary and official sources first, plus at least **two more independent sources on different websites** where they exist (a minimum of two sources in total). Only list a source you actually opened and that supports the claims you used it for. Note every date.
5. **Write each article** (see "How to write"), **700 to 1,000 words**. A story that only supports 600 words is probably too thin: drop it for a better one.
6. **Save the day's batch** as `content/batches/YYYY-MM-DD.json` (format below) and run:
   `npx tsx scripts/add-articles.ts content/batches/YYYY-MM-DD.json --status published`
   Read what it says. For every article it rejects, fix the problems it lists and try that article again (up to twice). Do not weaken an article just to pass; if it cannot be made good, drop it.
7. **Add a picture to every article.** Follow "Pictures" below. Games and politics will often have no openly licensed photo: keep the generated cover then and say so in the report.
8. **Check the whole site builds:** `npm run validate` then `npm run build`. If either fails, do not commit; undo the workbook change (`git checkout data/oewer_database.xlsx`), and report what failed.
9. **Commit locally, do not push.** Commit with the message `Daily articles YYYY-MM-DD` plus a line per article. The owner pushes later in an interactive session; unpushed commits simply wait.
10. **Report** in the final message: the commit id, how many were published, how many daily commits are waiting to be pushed, titles and categories, which pictures were added (and which articles kept the generated cover, and why), anything rejected or dropped and why, and anything the owner should look at.

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

Block types: `paragraph`, `heading`, `list` (one item per line), `quote`, `callout`, `code`. Text supports `**bold**`, `*italic*` and `[link text](https://…)`. No HTML, no `#` marks, and no image blocks in the batch file (pictures are added in step 7). The tool adds the "Checked on" note and the **Sources** list at the end; do not write them yourself. New categories need `"categoryDescription"`; these exist already: News and Launches (once the first news article is published), AI, Technology, Cars and Bikes, Aviation, Vintage and History, Electronics, How It Works, Money Guides, How-To.

## The four genres

All articles use `"category"` as below (new categories need the `categoryDescription` shown) and are tagged `news` plus the topic.

| Genre | Category | categoryDescription |
| --- | --- | --- |
| Game launches and gaming news | `Gaming News` | Game launches, release dates, prices and platform news, explained from official sources. |
| Latest news | `News and Launches` | Recent news and new launches: technology, business and everyday life, explained from official sources. |
| Politics and government | `Politics` | Government decisions, laws and policies, reported neutrally from official sources. |
| Stock market and business | `Markets` | Market and company news, reported from exchange and regulator filings. General information, not investment advice. |

### Rules for all news

1. **Fresh.** The story is from the **last 7 days** (3 days is better). Check the date on the source page and put both the event's date and the "as of" date in the text.
2. **Primary source first.** The company, publisher, ministry, court, exchange or regulator's own page, then independent outlets. Open them all. If only one source exists, or sources disagree on a figure, say so; if the story rests on a single unofficial source, do not publish it.
3. **Official facts only.** Rumours, leaks and "expected" figures are never stated as fact; label them in one short line or leave them out.
4. **Your own explanation.** Do not rewrite another outlet's article. Give the key facts in the first paragraph, then add what makes the article worth reading: **background** (how we got here), **context** (how it compares by published numbers), **what is still unknown**, and **what happens next** with dates. Use a list only for real lists such as specifications, dates or figures.
5. **No opinion, no verdict, no predictions, no "best".** You did not play, watch or attend anything. Compare using published facts.
6. **Exact and labelled:** currency, dates, time zones, platforms, index levels with the time they were taken. Never round a price or figure up or down.
7. **Titles** state the news plainly, 20 to 60 characters, with the name and month where it fits (for example "Hollow Knight Silksong DLC Date Set for Dec 2026").
8. A news article stays accurate by being dated. This job never edits it later.

### Game launches and gaming news (3 a day)

New game launches, release dates, delays, editions, price changes, platform and Game Pass or PlayStation Plus announcements, updates and patches, esports event results, and major studio news. Use the publisher or developer's own page, the store listing (Steam, PlayStation Store, Xbox, Nintendo eShop, Epic) and ratings boards. Give release date and time by region where the source does, platforms, price in rupees and dollars when listed, editions, system requirements when published, and what the publisher has not confirmed. No review voice: you did not play it. Skip leaks and rumours. Age ratings and violence are stated plainly and neutrally.

### Latest news (3 a day)

The biggest verified stories of the day in technology, business, science, transport and everyday money rules, India first, then world. Choose stories with real consequences for readers, not celebrity gossip, crime or disasters. Skip anything violent or graphic.

### Politics and government (2 a day, India first)

A plain **explainer of what was decided and what it changes for ordinary people**. Strictly neutral:

1. **Report, never take sides.** Attribute every claim ("the Finance Ministry said", "the court ruled"). No praise, blame, labels or loaded words, and no "good for" or "bad for" a party. Where parties disagree, give each position in its own words with equal weight.
2. **Primary sources first:** PIB, gazette notifications, the ministry's own site, the court's order, the Election Commission, parliament records, a party's official statement. Rumours, anonymous "sources say" claims, opinion columns, exit polls and predictions are not used.
3. **Explain, do not campaign.** Lead with the decision, the date and what it changes (who, from when, any amount or deadline). No calls to vote, donate, protest or support anyone.
4. **People:** name office-holders by role and name as the source does; no speculation about motives, health, family or private life; nothing about private individuals. Allegations are stated as allegations, attributed. Court cases: report the order, never guilt or innocence.
5. **Avoid:** violence and graphic events, communal or religious conflict, hate speech, conspiracy claims, live election results and seat predictions.
6. Tag `politics`. At most one of the two political articles may be about world politics outside India.

### Stock market and business news (2 a day)

Exchange and regulator facts: index closing levels (NSE Nifty 50, BSE Sensex) with the date, results announcements, IPO dates, price bands and listing facts, SEBI and RBI decisions, major company filings and deals. Sources: NSE, BSE, SEBI, RBI, company filings and press releases, then reputable business outlets. Rules:

1. **No advice and no predictions.** Never say buy, sell, hold, target, "stocks to watch", "will rise", or "good time to invest". No forecast of any price, index or result.
2. **Facts with a time stamp.** A level or price always carries the date and, for intraday figures, the time. Say where it came from.
3. **Explain the mechanics.** What a result, rate decision or IPO term means, in plain words, with the published numbers.
4. **End every article** with a short line that it is general information and not investment advice.
5. Tag `stocks` or `markets`.

## Pictures

Pictures make the lists, the home page and shared links work, so each article gets one. The tools are described in `docs/blog-content.md` ("Where the pictures came from"); the steps for a new article are:

1. Search Wikimedia Commons for a photo of the subject: `npx tsx scripts/commons-images.ts search queries.json sheet.png` (write `queries.json` first), then look at the contact sheet.
2. Fetch the best one: `npx tsx scripts/commons-images.ts fetch "File:Name.jpg" <article-slug> cover` (and, if a second photo fits, once more with a name such as `figure`). Then run `npx tsx scripts/shrink-images.ts`.
3. Add an entry for the article's slug to `content/images/text.json` (`coverAlt`, and `figureAlt` and `figureCaption`, or `null` for both when there is no second picture), then run `npx tsx scripts/apply-article-images.ts`. It sets the cover, adds the picture in the text, and writes the "Image credits" line.

Rules for pictures:

- **Only openly licensed pictures from Wikimedia Commons** (Public domain, CC0, CC BY, CC BY-SA). The tool refuses the rest. Never use a manufacturer's press photo, a news agency or newspaper photo, a screenshot from a website or a social media picture, even to illustrate a launch. If you cannot get an openly licensed photo, the article keeps the generated cover.
- **The picture must be honest.** It must really show what the alt text and caption say. A brand-new vehicle often has no free photo yet: use a free photo of the **earlier model, the same maker's previous generation, or the same type of vehicle**, and **say so in the caption** ("The previous-generation Tata Nexon", "An electric SUV charging", never "the new ..."). Never present an old photo as the new product, and never draw or generate a picture of a product that has not been photographed.
- **Alt text** says what the picture shows, in plain words. **Captions** are short and name the subject and, for an older model or stand-in, say so.
- **Politics:** use a neutral picture of the building, institution, document or place (a parliament building, a court, a flag, a rupee note). Never a photo of a living politician unless the article is about their official act and the photo is a plain official portrait; do not use pictures of crowds, protests or violence.
- **Keep the credits.** CC BY and CC BY-SA need the author and licence shown; the tool adds the "Image credits" line, and it must stay.
- If fetching pictures fails (no internet or Commons is down), publish the article with its generated cover and say so in the report.

## How to write

Write like a careful human reporter, not a template.

- **Titles are 20 to 60 characters**, so the page title still fits in search results once the site name is added.
- **Lead with the news, then the reason it matters.** The first paragraph carries who, what, when and the key number. The second says why a reader should care.
- **Vary the shape.** Do not give every article the same headings. Pick a structure that fits the story: a timeline, a question-and-answer, a "what changes" list, a before-and-after. Three to eight headings that say what is under them, no stock headings repeated day after day.
- **Natural voice.** Mix short and longer sentences. Use everyday words and concrete numbers. Explain a term the first time it appears. Use "we" rarely and only as an editorial voice ("we have not found a confirmed date"). No exclamation marks, no hype, no rhetorical flourish, no formula such as "In conclusion" or "Let's dive in".
- **Your own words.** Never copy sentences from a source. A quotation, if any, is a few words, in quotation marks, named.
- **Say where the numbers come from** ("according to the company's page") and **when** ("as of 10 November 2026").
- **Be honest about the unknown.** "The company has not said" is a fine sentence.
- **No invented experience.** Never write as if you played, watched, tested, visited or attended something. Write from the sources.
- **No advice.** Nothing on investing, health, legal or safety beyond what a source states plainly.
- **Neutral about companies, people and parties.** No hype, no put-downs. Names belong to their owners.
- **No filler.** The tool rejects stock phrases. Say the thing directly.
- **Read it back.** Before saving, check each article answers: what happened, why it matters, what is unknown, what comes next. If it does not, improve it or drop it.

## Topic bank (not used while the daily run is news-only)

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

- Never force-push, never rewrite history, never change files other than the workbook, the batch file, the generated summary and the pictures (`public/images/blog/`, `content/images/credits.json`, `content/images/text.json`); commit the pictures with the articles.
- Never publish more than 12 articles in a run (the tool refuses), and aim for 10.
- If the build or the deploy fails, revert and report; do not try to patch the site code.
- If the web research tools do not work, publish only evergreen articles you can write accurately from established knowledge **and** can support with at least two sources you have opened; if you cannot open sources, publish nothing that day.
