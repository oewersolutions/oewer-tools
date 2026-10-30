/**
 * Static export fails when a dynamic route has no pages at all (for example a site with no published articles yet).
 * Return the real list, or a single placeholder that the page turns into a 404.
 */
export function nonEmptyParams<T>(params: T[], placeholder: T): T[] {
  return params.length > 0 ? params : [placeholder];
}
