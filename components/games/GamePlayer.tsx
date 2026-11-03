"use client";

import type { FourGroupsData, Game, HiveWordsData, MiniCrosswordData, Puzzle, WordTrailData } from "../../lib/games/types";
import FourGroups from "./FourGroups";
import HiveWords from "./HiveWords";
import MiniCrossword from "./MiniCrossword";
import Snake from "./Snake";
import WordGuess from "./WordGuess";
import WordTrail from "./WordTrail";

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
    case "word_trail":
      return <WordTrail name={game.name} slug={game.slug} puzzles={puzzles as Puzzle<WordTrailData>[]} />;
    case "snake":
      return <Snake name={game.name} slug={game.slug} />;
    default:
      return <p className="text-muted">This game is not available yet.</p>;
  }
}
