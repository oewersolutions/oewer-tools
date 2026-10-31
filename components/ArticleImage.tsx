import { BASE_PATH } from "../lib/metadata";
import type { ImageInfo } from "../lib/images";

/**
 * A picture from an article: its real width and height (so the page keeps the space while it loads), the smaller
 * versions in a srcset (so a phone downloads the small one), lazy loading, and the description as alt text. The file
 * path comes from the workbook; this site's base path is added here.
 */
export default function ArticleImage({
  src,
  alt,
  info,
  sizes,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  info?: ImageInfo;
  sizes: string;
  className?: string;
  /** True for the picture at the top of the page: loaded first, never lazily. */
  priority?: boolean;
}) {
  const withBase = (path: string) => `${BASE_PATH}${path}`;
  const srcSet = info?.srcSet
    ? info.srcSet
        .split(", ")
        .map((entry) => withBase(entry))
        .join(", ")
    : undefined;
  return (
    // A plain <img>: a static export has no image optimiser, and the files are already sized by the admin.
    <img
      src={withBase(src)}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      width={info?.width}
      height={info?.height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      className={className}
    />
  );
}
