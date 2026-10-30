import { getBlogCategory, getContent, getPublishedPosts, getSetting } from "../../lib/content";
import { buildRss } from "../../lib/feed";
import { BASE_PATH, getSiteUrl } from "../../lib/metadata";
import { absoluteUrl } from "../../lib/seo";

export const dynamic = "force-static";

// Emitted as out/feed.xml.
export function GET() {
  getContent();
  const site = getSiteUrl();
  const xml = buildRss(
    { title: getSetting("site_name"), url: absoluteUrl(site, BASE_PATH, "/"), description: getSetting("site_tagline"), feedUrl: absoluteUrl(site, BASE_PATH, "/feed.xml") },
    getPublishedPosts().map((p) => ({
      title: p.title,
      url: absoluteUrl(site, BASE_PATH, `/blog/${p.slug}/`),
      description: p.excerpt,
      published: p.published_at,
      category: getBlogCategory(p.category_id)?.name,
    })),
  );
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml" } });
}
