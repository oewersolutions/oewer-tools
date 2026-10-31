/** The generated stand-in covers for the sample articles: which colours, where the files are, and how they are described. */
export const COVER_PALETTES = [
  { cls: "cover-1", description: "deep green with soft gold and teal light" },
  { cls: "cover-2", description: "dark purple with orange and gold glow" },
  { cls: "cover-3", description: "navy blue with sky blue and teal light" },
  { cls: "cover-4", description: "deep red with peach and coral glow" },
  { cls: "cover-5", description: "forest green with mint and gold light" },
  { cls: "cover-6", description: "indigo with lilac and teal light" },
] as const;

/** Same rule as the on-page generated cover: the article's number picks the colours. */
export const paletteFor = (postId: string) => COVER_PALETTES[(Number(postId.replace(/\D/g, "")) || 0) % COVER_PALETTES.length]!;

export const coverPath = (slug: string, width: 800 | 1600 = 1600) => `/images/blog/${slug}/cover-${width}.jpg`;

export const coverAlt = (postId: string) => `Abstract artwork in ${paletteFor(postId).description}`;
