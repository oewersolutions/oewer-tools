/** RSS 2.0 feed of published articles. */

export interface FeedItem {
  title: string;
  url: string;
  description: string;
  published: string | null;
  category?: string;
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function buildRss(site: { title: string; url: string; description: string; feedUrl: string }, items: FeedItem[]): string {
  const rows = items
    .map(
      (i) =>
        `<item><title>${escapeXml(i.title)}</title><link>${escapeXml(i.url)}</link><guid isPermaLink="true">${escapeXml(i.url)}</guid>` +
        `<description>${escapeXml(i.description)}</description>` +
        (i.published ? `<pubDate>${new Date(i.published).toUTCString()}</pubDate>` : "") +
        (i.category ? `<category>${escapeXml(i.category)}</category>` : "") +
        `</item>`,
    )
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>` +
    `<title>${escapeXml(site.title)}</title><link>${escapeXml(site.url)}</link><description>${escapeXml(site.description)}</description>` +
    `<atom:link href="${escapeXml(site.feedUrl)}" rel="self" type="application/rss+xml"/>\n${rows}\n</channel></rss>\n`
  );
}
