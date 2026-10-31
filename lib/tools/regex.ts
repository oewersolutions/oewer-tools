/** Testing a regular expression against some text. */

export interface RegexInput {
  pattern: string;
  flags: string;
  text: string;
}
export interface RegexMatch {
  index: number;
  text: string;
  groups: (string | undefined)[];
  named: Record<string, string | undefined>;
}
export type RegexOutcome = { ok: true; matches: RegexMatch[]; truncated: boolean } | { ok: false; error: string };

export const MAX_MATCHES = 500;
export const MAX_TEXT = 50_000;
export const VALID_FLAGS = ["g", "i", "m", "s", "u", "y"] as const;

/**
 * Run the expression and list its matches. This function is self-contained (it uses nothing from outside itself) because it is
 * also sent to a background worker as source text, so that a pattern that takes forever can be stopped.
 */
export function runRegex(input: RegexInput): RegexOutcome {
  let re: RegExp;
  try {
    re = new RegExp(input.pattern, input.flags.includes("g") ? input.flags : input.flags + "g");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.replace(/^Invalid regular expression: /, "") : "Not a valid expression." };
  }
  const all = input.flags.includes("g");
  const matches: RegexMatch[] = [];
  let truncated = false;
  for (const m of input.text.matchAll(re)) {
    if (matches.length >= 500) {
      truncated = true;
      break;
    }
    matches.push({ index: m.index ?? 0, text: m[0], groups: m.slice(1), named: { ...(m.groups ?? {}) } });
    if (!all) break;
  }
  return { ok: true, matches, truncated };
}

/** Run in a worker that is stopped after `timeoutMs`, so a pattern with runaway backtracking cannot freeze the page. */
export function runRegexSafely(input: RegexInput, timeoutMs = 1500): { promise: Promise<RegexOutcome | "timeout">; cancel: () => void } {
  const source = `self.onmessage=function(e){postMessage((${runRegex.toString()})(e.data))}`;
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  const worker = new Worker(url);
  let finish: (v: RegexOutcome | "timeout") => void = () => {};
  const promise = new Promise<RegexOutcome | "timeout">((resolve) => (finish = resolve));
  const stop = () => {
    clearTimeout(timer);
    worker.terminate();
    URL.revokeObjectURL(url);
  };
  const timer = setTimeout(() => {
    stop();
    finish("timeout");
  }, timeoutMs);
  worker.onmessage = (e: MessageEvent<RegexOutcome>) => {
    stop();
    finish(e.data);
  };
  worker.onerror = () => {
    stop();
    finish({ ok: false, error: "The expression could not be run in this browser." });
  };
  worker.postMessage(input);
  return { promise, cancel: stop };
}
