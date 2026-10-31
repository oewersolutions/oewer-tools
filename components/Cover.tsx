/**
 * A generated cover: soft coloured light with a few thin rings. It stands in for a photograph until an article has
 * its own cover image (T9.7); the same text always gets the same cover, so a page never changes between visits.
 */
const PALETTES = [
  "cover-1",
  "cover-2",
  "cover-3",
  "cover-4",
  "cover-5",
  "cover-6",
] as const;

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export default function Cover({
  seed,
  number,
  className = "",
}: {
  seed: string;
  number?: number;
  className?: string;
}) {
  const h = hash(seed);
  // The colours follow the article's number when there is one, so neighbouring articles always look different;
  // the position of the rings comes from the address, so each cover is still its own.
  const palette = PALETTES[(number ?? h) % PALETTES.length];
  const cx = 80 + (h % 240);
  const cy = 60 + ((h >> 3) % 130);
  const r = 60 + ((h >> 6) % 40);
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden ${palette} ${className}`}
    >
      <svg
        viewBox="0 0 400 250"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        fill="none"
        stroke="rgba(255,255,255,.28)"
        strokeWidth="1.2"
      >
        <circle cx={cx} cy={cy} r={r} />
        <circle cx={cx} cy={cy} r={r + 40} />
        <path
          d={`M0 ${150 + (h % 40)} Q 120 ${100 + (h % 50)} 400 ${170 - (h % 30)}`}
        />
      </svg>
    </div>
  );
}
