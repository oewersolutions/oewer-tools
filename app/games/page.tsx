import AdSlot from "../../components/AdSlot";
import type { Metadata } from "next";
import Breadcrumbs from "../../components/Breadcrumbs";
import { GameCard } from "../../components/Cards";
import { Container, PageBand } from "../../components/layout";
import { getPublishedGames } from "../../lib/content";
import { pageMetadata } from "../../lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Daily word games and puzzles",
  description: "Free daily word games: guess the word, sort the groups, find the trail and more. A new puzzle every day, no sign-up, and nothing leaves your device.",
  path: "/games/",
});

export default function GamesIndexPage() {
  const games = getPublishedGames();
  return (
    <>
      <PageBand
        breadcrumbs={<Breadcrumbs trail={[{ label: "Games" }]} />}
        eyebrow="Games"
        title="Daily word games"
        description="A new puzzle every day. Play for a few minutes, share your result, come back tomorrow. Free, with no sign-up."
      />
      <Container className="space-y-16 py-12 sm:py-16">
        {games.length > 0 ? (
          <section aria-labelledby="games-heading">
            <h2 id="games-heading" className="t-heading text-ink">
              Today&rsquo;s puzzles
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {games.map((g) => (
                <GameCard key={g.game_id} game={g} />
              ))}
            </div>
          </section>
        ) : (
          <p className="text-muted">The games are coming soon.</p>
        )}

        <AdSlot placement="list_bottom" pageType="game_hub" />

        <section aria-labelledby="how-heading" className="max-w-3xl space-y-4">
          <h2 id="how-heading" className="t-heading text-ink">
            How the daily puzzles work
          </h2>
          <p className="text-ink-2">
            Every game has a new puzzle each day, the same for everyone. Your progress, streaks and results are saved only in your own browser, so there is nothing to
            sign up for and we never see how you played. Missed a day? Each game lets you play earlier puzzles too.
          </p>
          <p className="text-ink-2">
            Snake is different: it has no daily puzzle. Play it whenever you like and try to beat your best score.
          </p>
          <p className="text-ink-2">
            Games on this site are original. They borrow the familiar ideas of word puzzles (guess a word, sort words into groups, find words in a grid) but use their own words,
            names and rules, and the puzzles are written fresh for this site.
          </p>
        </section>
      </Container>
    </>
  );
}
