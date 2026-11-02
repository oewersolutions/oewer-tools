import AdSlot from "../../../components/AdSlot";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { GameCard } from "../../../components/Cards";
import GamePlayer from "../../../components/games/GamePlayer";
import { Container, PageBand } from "../../../components/layout";
import { Prose } from "../../../components/Prose";
import { getGameBySlug, getPublishedGames, getPuzzles } from "../../../lib/content";
import { pageMetadata } from "../../../lib/metadata";
import { nonEmptyParams } from "../../../lib/static";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  // Placeholder (never linked, renders the 404 page) so the export does not fail when no game is published.
  return nonEmptyParams(getPublishedGames().map((g) => ({ slug: g.slug })), { slug: "_none" });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  return game ? pageMetadata({ title: `${game.name}: a free daily word game`, description: game.tagline, path: `/games/${game.slug}/` }) : {};
}

export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();
  const puzzles = getPuzzles(game.game_id);
  const others = getPublishedGames().filter((g) => g.game_id !== game.game_id);

  return (
    <>
      <PageBand
        breadcrumbs={<Breadcrumbs trail={[{ label: "Games", path: "/games/" }, { label: game.name }]} />}
        eyebrow="Daily game"
        title={game.name}
        description={game.tagline}
      />
      <Container className="space-y-16 py-10 sm:py-14 [overflow-wrap:anywhere]">
        <section aria-label={game.name} data-game-type={game.game_type}>
          <noscript>
            <p className="panel bg-surface p-5 text-ink-2">This game runs in your browser and needs JavaScript. Turn JavaScript on to play. The rules below work without it.</p>
          </noscript>
          <GamePlayer game={{ slug: game.slug, name: game.name, game_type: game.game_type }} puzzles={puzzles} />
        </section>

        <AdSlot placement="below_game" pageType="game" />

        <section aria-labelledby="how-heading" className="max-w-3xl space-y-5">
          <h2 id="how-heading" className="t-heading text-ink">
            How to play {game.name}
          </h2>
          <Prose source={game.how_to_play} />
        </section>

        {others.length > 0 && (
          <section aria-labelledby="more-heading">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="more-heading" className="t-heading text-ink">
                More games
              </h2>
              <Link href="/games/" className="font-medium text-brand hover:underline">
                All games
              </Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((g) => (
                <GameCard key={g.game_id} game={g} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
