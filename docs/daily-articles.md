# Daily articles

Every day the scheduled run researches and publishes **5 new articles** across many subjects. This file is the whole job description: the run starts with no memory, so everything it needs is here. (Decided 31 October 2026: automatic publishing, 5 a day. Change those numbers here and in the schedule if they change.)

## Why the rules are strict

The site earns money from ads, and Google can refuse or remove ads on sites with large amounts of thin or unchecked content, whoever writes it. A wrong price or date also costs readers' trust. So volume is never an excuse for weak articles: **if five good articles cannot be written, publish fewer.** Zero is an acceptable day.

## Each day

1. **Get the latest.** In the project folder: `git fetch` and make the working copy equal to `origin/main` plus any earlier local daily-article commits that have not been pushed yet (never rewrite or force anything). This run has no GitHub token and must not look for one.
2. **See what exists.** `npm run articles:list`. Note every title and how many articles each category has.
3. **Choose 5 subjects: news first.** Since 3 November 2026 the daily articles lead with **recent news**, and **at least 3 of the 5 are news** (see "News articles" below). The rest are evergreen explainers from the topic bank. Before choosing, run `npm run articles:list` and skip any story the site already covers. Where the news is thin that day, write fewer news articles rather than stretching an old story.
4. **Research each one properly.** For news, start with a web search for the newest stories (add the month and year to the query), then **open and read** the pages. Prefer official and primary sources (a company's own page, a manufacturer, a standards body, a museum, a government site). Use at least **two sources on different websites**. Only list a source you actually opened and that supports the claims you used it for. Note any dates.
5. **Write each article** (see "How to write" below), 700 to 1,100 words (news: 500 to 900).
6. **Save the day's batch** as `content/batches/YYYY-MM-DD.json` (format below) and run:
   `npx tsx scripts/add-articles.ts content/batches/YYYY-MM-DD.json --status published`
   Read what it says. For every article it rejects, fix the problems it lists and try that article again (up to twice). Do not weaken an article just to pass; if it cannot be made good, drop it.
7. **Add a picture to every article, news first.** Every new article gets a real cover photo (a news article should never be left with only the generated cover if a suitable photo exists), and a second picture in the text where one fits. Follow "Pictures" below. Do this after step 6 so the article exists, and before the build check.
8. **Check the whole site builds:** `npm run validate` then `npm run build`. If either fails, do not commit; undo the workbook change (`git checkout data/oewer_database.xlsx`), and report what failed.
9. **Commit locally, do not push.** Commit with the message `Daily articles YYYY-MM-DD` plus a line per article. The owner pushes later in an interactive session; unpushed commits simply wait. If the workbook changed upstream meanwhile, that is handled at push time, not here.
10. **Report** in the final message: how many were published, how many daily commits are waiting to be pushed, titles and categories, which pictures were added (and which articles kept the generated cover, and why), anything rejected or dropped and why, and anything the owner should look at.

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

## News articles

News is the main point of the site's blog now. Focus on what people in India and worldwide are searching for this week:

- **New vehicle launches and unveilings:** cars, SUVs, motorcycles, scooters, electric vehicles, trucks and buses, with launch dates, variants, prices (ex-showroom for India, say so), battery and range figures, engines and features the maker announces. Also facelifts, price changes, recalls and safety ratings (Bharat NCAP, Global NCAP, Euro NCAP).
- **Political and government news:** decisions, laws, budgets, policies, court rulings, elections and official announcements in India first, then major world politics. Written as a plain **explainer of what was decided and what it changes for ordinary people** (see the extra rules below).
- **Recent news** in the site's other areas: new phones and gadgets, AI models and product announcements, aviation (new aircraft, routes, airline announcements), major technology and electronics launches, and changes to money-related rules or prices that affect everyday readers.

Rules for news:

1. **Fresh.** The story must be from the **last 7 days** (the last 3 days is better). Check the date on the source page. Put the event's date and the "as of" date in the text.
2. **Primary source first.** The maker's or company's own press release or page, a regulator, an airline or airport, a standards body. A reputable news outlet is the second source. Open both. If only one source can be found, or the sources disagree on a figure, say so in the article; if the story rests on a single unofficial source, do not publish it.
3. **Official facts only.** Report what the company or regulator has said. Rumours, leaks, spy shots and "expected" prices are never stated as fact; if you mention them at all, label them clearly and keep them to one short line.
4. **Your own explanation.** Do not rewrite another outlet's article. Give the key facts in the first paragraph (what, who, when, price or figure), then explain what it means for a reader: who it competes with by facts, what changes from the previous model, what is still unknown. Use a list for specifications and a short table-like list for variants and prices.
5. **No opinion, no verdict, no "best".** No test-drive voice; you did not drive it. Compare using the published numbers.
6. **Prices and dates are exact and labelled** (currency, ex-showroom or on-road, launch or booking date). Never round a price up or down.
7. **Category:** use `News and Launches` for these (new category; give it `"categoryDescription": "Recent news and new launches: vehicles, gadgets, AI and aviation, explained from official sources."`). Tag each with `news`, plus `launch` for a launch, and the maker or topic.
8. **Titles** state the news plainly and carry the name and the month, for example "Tata Motors Launches the Sierra EV in India: Price and Range (Nov 2026)". Keep within the 20 to 60 character limit.
9. News articles may be shorter: **500 to 900 words** is fine. Clean facts beat length.
10. A news article stays accurate by being dated. It is never edited later by this job.

Extra rules for political news (these protect readers, and the site's ad approval):

1. **Report, never take sides.** Describe what a government, minister, party, court or commission officially said or decided, and attribute it every time ("the Finance Ministry said", "the court ruled"). No praise, blame, labels or loaded words, and no "good for" or "bad for" a party. Where parties or governments disagree, give each position in its own words, with the same weight.
2. **Primary sources first:** the government or ministry notification (PIB, gazette, the ministry's own site), the court's order, the Election Commission, parliament records, the party's official statement. A reputable news outlet is the second source. Rumours, anonymous "sources say" claims, opinion columns, exit polls and predictions are not used.
3. **Explain, do not campaign.** Lead with the decision, the date and what it changes (who is affected, from when, any amount or deadline). Add short background. No calls to vote, donate, protest or support anyone.
4. **People:** name office-holders by role and name as the source does; never speculate about anyone's motives, health, family or private life; nothing about private individuals. Allegations are stated as allegations, attributed, with the person's or body's response if the source gives it. Court cases: report the order, never guilt or innocence.
5. **Avoid on this site:** violence and graphic events, communal or religious conflict, hate speech, conspiracy claims, and live election results or seat predictions. If a political story is mostly about those, skip it.
6. **Category:** `News and Launches`, tagged `news` and `politics`. At most **1 political article per run**, and not more than 2 political articles among the 5 news items in a day's total, so vehicles and technology stay the core of the news.
7. **Titles** name the decision plainly with no judgement, for example "Union Budget 2027: Income Tax Slab Changes Explained".

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

- Never force-push, never rewrite history, never change files other than the workbook, the batch file, the generated summary and the pictures (`public/images/blog/`, `content/images/credits.json`, `content/images/text.json`); commit the pictures with the articles.
- Never publish more than 12 articles in a run (the tool refuses).
- If the build or the deploy fails, revert and report; do not try to patch the site code.
- If the web research tools do not work, publish only evergreen articles you can write accurately from established knowledge **and** can support with at least two sources you have opened; if you cannot open sources, publish nothing that day.
