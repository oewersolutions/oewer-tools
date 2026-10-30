/** Text statistics for the word counter. */

export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
}

export const READING_WPM = 200;
export const SPEAKING_WPM = 130;

type SegmenterCtor = new (locale: string | undefined, options: { granularity: "word" | "sentence" | "grapheme" }) => {
  segment(text: string): Iterable<{ segment: string; isWordLike?: boolean }>;
};
const Segmenter = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;

function countWords(text: string): number {
  if (Segmenter) {
    let n = 0;
    // Count segments that contain a letter or digit. `isWordLike` is not used: some engines (WebKit on Linux) report it as false for every word.
    for (const s of new Segmenter(undefined, { granularity: "word" }).segment(text)) if (/[\p{L}\p{N}]/u.test(s.segment)) n++;
    return n;
  }
  return text.split(/\s+/).filter(Boolean).length;
}

function countSentences(text: string): number {
  if (Segmenter) {
    let n = 0;
    for (const s of new Segmenter(undefined, { granularity: "sentence" }).segment(text)) if (/[\p{L}\p{N}]/u.test(s.segment)) n++;
    return n;
  }
  return text.split(/[.!?]+(?:\s|$)/).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
}

function countGraphemes(text: string): number {
  if (!Segmenter) return Array.from(text).length;
  return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(text)).length;
}

export function analyzeText(text: string): TextStats {
  return {
    words: countWords(text),
    characters: countGraphemes(text),
    charactersNoSpaces: countGraphemes(text.replace(/\s/g, "")),
    sentences: countSentences(text),
    paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim() !== "").length,
    lines: text === "" ? 0 : text.split("\n").length,
  };
}

/** "less than a minute", "1 min", "2 min 30 sec" */
export function formatDuration(words: number, wordsPerMinute: number): string {
  if (words === 0) return "0 sec";
  const seconds = Math.round((words / wordsPerMinute) * 60);
  if (seconds < 60) return seconds < 5 ? "less than a minute" : `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} sec`;
}
