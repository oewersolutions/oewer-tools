"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Dir, interval, newGame, shareText, SIZE, step } from "../../lib/games/snake";
import { read, write } from "./shared";

type Phase = "ready" | "playing" | "paused" | "over";

const KEYS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

const PAD: { dir: Dir; label: string; symbol: string; area: string }[] = [
  { dir: "up", label: "Up", symbol: "↑", area: "col-start-2 row-start-1" },
  { dir: "left", label: "Left", symbol: "←", area: "col-start-1 row-start-2" },
  { dir: "right", label: "Right", symbol: "→", area: "col-start-3 row-start-2" },
  { dir: "down", label: "Down", symbol: "↓", area: "col-start-2 row-start-3" },
];

/** Classic Snake: steer, eat the apples, do not hit a wall or yourself. The best score stays in the browser. */
export default function Snake({ name, slug }: { name: string; slug: string }) {
  const bestKey = `oewer-game-${slug}-best`;
  const [state, setState] = useState(() => newGame());
  const [phase, setPhase] = useState<Phase>("ready");
  const [best, setBest] = useState(0);
  const [copied, setCopied] = useState(false);
  const dirRef = useRef<Dir>("right"); // the direction asked for; it is applied on the next move
  const boardRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => setBest(read<number>(bestKey, 0)), [bestKey]);

  const start = useCallback(() => {
    const fresh = newGame();
    dirRef.current = fresh.dir;
    setState(fresh);
    setPhase("playing");
    setCopied(false);
    boardRef.current?.focus();
  }, []);

  // The game loop: one move per tick, and a faster tick as the score grows.
  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setTimeout(() => setState((s) => step(s, dirRef.current)), interval(state.score));
    return () => window.clearTimeout(id);
  }, [phase, state]);

  useEffect(() => {
    if (!state.over || phase !== "playing") return;
    setPhase("over");
    if (state.score > best) {
      setBest(state.score);
      write(bestKey, state.score);
    }
  }, [state, phase, best, bestKey]);

  const steer = (dir: Dir) => {
    dirRef.current = dir;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const dir = KEYS[e.key];
    if (dir) {
      e.preventDefault(); // the arrow keys must not scroll the page
      if (phase === "ready" || phase === "over") start();
      steer(dir);
    } else if (e.key === " " || e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (phase === "playing") setPhase("paused");
      else if (phase === "paused") setPhase("playing");
      else start();
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const from = touch.current;
    const to = e.changedTouches[0];
    touch.current = null;
    if (!from || !to) return;
    const dx = to.clientX - from.x;
    const dy = to.clientY - from.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareText(name, state.score, best));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const cells: string[] = [];
  const snakeAt = new Map(state.snake.map((c, i) => [c.y * SIZE + c.x, i]));
  const foodAt = state.food ? state.food.y * SIZE + state.food.x : -1;
  for (let i = 0; i < SIZE * SIZE; i++) {
    const seg = snakeAt.get(i);
    cells.push(seg === 0 ? "bg-brand-700 ring-2 ring-inset ring-white/60" : seg !== undefined ? "bg-brand" : i === foodAt ? "m-[12%] rounded-full bg-red-600" : "");
  }

  const status =
    phase === "over" ? (state.won ? `You filled the board with ${state.score} apples!` : `Game over. You ate ${state.score} ${state.score === 1 ? "apple" : "apples"}.`) : phase === "paused" ? "Paused." : "";

  return (
    <div className="mx-auto w-full max-w-md" data-game="snake">
      <div className="mb-3 flex items-center justify-between text-sm text-ink-2">
        <p>
          Apples: <strong className="text-ink">{state.score}</strong>
        </p>
        <p>
          Best: <strong className="text-ink">{best}</strong>
        </p>
        <button type="button" onClick={() => setPhase((p) => (p === "playing" ? "paused" : p === "paused" ? "playing" : p))} disabled={phase !== "playing" && phase !== "paused"} className="btn btn-ghost !px-3 !py-1">
          {phase === "paused" ? "Resume" : "Pause"}
        </button>
      </div>

      <div
        ref={boardRef}
        tabIndex={0}
        role="application"
        aria-label={`${name} board. Use the arrow keys or W, A, S, D to steer. Space pauses.`}
        onKeyDown={onKeyDown}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) touch.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={onTouchEnd}
        className="relative grid aspect-square w-full touch-none select-none overflow-hidden rounded-2xl border border-line bg-tint"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
      >
        {cells.map((cls, i) => (
          <div key={i} aria-hidden="true" className={cls} />
        ))}
        {(phase === "ready" || phase === "over" || phase === "paused") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 p-4 text-center">
            {status && <p className="font-semibold text-ink">{status}</p>}
            {phase === "paused" ? (
              <button type="button" onClick={() => setPhase("playing")} className="btn">
                Resume
              </button>
            ) : (
              <button type="button" onClick={start} className="btn">
                {phase === "over" ? "Play again" : "Start"}
              </button>
            )}
            {phase === "ready" && <p className="text-sm text-ink-2">Or press any arrow key.</p>}
            {phase === "over" && (
              <button type="button" onClick={share} className="btn btn-ghost">
                {copied ? "Copied" : "Copy my score"}
              </button>
            )}
          </div>
        )}
      </div>

      <p role="status" className="sr-only">
        {status}
      </p>

      <div className="mx-auto mt-5 grid w-44 grid-cols-3 grid-rows-3 gap-1.5 sm:hidden" role="group" aria-label="Steering buttons">
        {PAD.map((b) => (
          <button
            key={b.dir}
            type="button"
            aria-label={b.label}
            onPointerDown={(e) => {
              e.preventDefault();
              if (phase === "ready" || phase === "over") start();
              steer(b.dir);
            }}
            className={`${b.area} btn btn-ghost !p-0 h-14 text-xl`}
          >
            {b.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
