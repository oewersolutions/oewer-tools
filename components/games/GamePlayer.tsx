"use client";

import type { FourGroupsData, Game, HiveWordsData, MiniCrosswordData, Puzzle } from "../../lib/games/types";
import FourGroups from "./FourGroups";
import HiveWords from "./HiveWords";
import MiniCrossword from "./MiniCrossword";
import WordGuess from "./WordGuess";

/** Chooses the board for a game's type. Only built types reach here: validation stops others being published. */
export default function GamePlayer({ game, puzzles }: { game: Pick<Game, "slug" | "name" | "game_type">; puzzles: Puzzle[] }) {
  switch (game.game_type) {
    case "word_guess":
      return <WordGuess name={game.name} slug={game.slug} puzzles={puzzles as Puzzle<{ answer: string }>[]} />;
    case "four_groups":
      return <FourGroups name={game.name} slug={game.slug} puzzles={puzzles as Puzzle<FourGroupsData>[]} />;
    case "hive_words":
      return <HiveWords name={game.name} slug={game.slug} puzzles={puzzles as Puzzle<HiveWordsData>[]} />;
    case "mini_crossword":
      return <MiniCrossword name={game.name} slug={game.slug} puzzles={puzzles as Puzzle<MiniCrosswordData>[]} />;
    default:
      return <p className="text-muted">This game is not available yet.</p>;
  }
}
