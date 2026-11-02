export type GameType = "word_guess" | "four_groups" | "word_trail" | "hive_words" | "mini_crossword";

/** The game types that have a playable game. A game of another type can be kept as a draft but not published. */
export const BUILT_GAME_TYPES: readonly GameType[] = ["word_guess", "four_groups", "hive_words", "mini_crossword"];

export interface Game {
  game_id: string;
  slug: string;
  name: string;
  tagline: string;
  game_type: GameType;
  how_to_play: string;
  status: string;
  sort_order: number;
}

export interface PuzzleRow {
  puzzle_id: string;
  game_id: string;
  puzzle_date: string;
  title: string;
  puzzle_data: string;
  status: string;
  author_note: string;
}

/** A puzzle as the pages and the games use it: the day it is for and its data, already parsed. */
export interface Puzzle<T = unknown> {
  id: string;
  date: string;
  title: string;
  data: T;
}

/** Four hidden groups of four words. `level` runs from 1 (easiest) to 4 (trickiest) and each group has its own. */
export interface FourGroupsData {
  groups: { title: string; level: number; words: string[] }[];
}

/** Seven letters, one of them required, and every word that can be made from them. */
export interface HiveWordsData {
  center: string;
  outer: string[];
  words: string[];
}

/** A 5 by 5 crossword. `grid` holds the answers, with # for black squares; clues are keyed by the entry's number. */
export interface MiniCrosswordData {
  grid: string[];
  across: Record<string, string>;
  down: Record<string, string>;
}

export interface WordGuessData {
  answer: string;
}
