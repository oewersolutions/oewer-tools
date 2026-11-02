"use client";

import type { FourGroupsData, Game, Puzzle } from "../../lib/games/types";
import FourGroups from "./FourGroups";
import WordGuess from "./WordGuess";

/** Chooses the board for a game's type. Only built types reach here: validation stops others being published. */
export default function GamePlayer({ game, puzzles }: { game: Pick<Game, "slug" | "name" | "game_type">; puzzles: Puzzle[] }) {
  switch (game.game_type) {
    case "word_guess":
      return <WordGuess name={game.name} slug={game.slug} puzzles={puzzles as Puzzle<{ answer: string }>[]} />;
    case "four_groups":
      return <FourGroups name={game.name} slug={game.slug} puzzles={puzzles as Puzzle<FourGroupsData>[]} />;
    default:
      return <p className="text-muted">This game is not available yet.</p>;
  }
}
