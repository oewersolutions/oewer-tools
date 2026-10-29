import { getContent } from "../../lib/content";
import { BASE_PATH, getSiteUrl } from "../../lib/metadata";
import { absoluteUrl, buildSitemapEntries } from "../../lib/seo";

export const dynamic = "force-static";

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Emitted as out/sitemap.xml. Only published, indexable pages are listed.
export function GET() {
  const urls = buildSitemapEntries(getContent())
    .map((e) => {
      const lastmod = e.lastModified ? `<lastmod>${e.lastModified}</lastmod>` : "";
      return `<url><loc>${escapeXml(absoluteUrl(getSiteUrl(), BASE_PATH, e.path))}</loc>${lastmod}</url>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
