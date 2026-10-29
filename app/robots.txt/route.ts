import { BASE_PATH, getSiteUrl } from "../../lib/metadata";
import { buildRobotsTxt } from "../../lib/seo";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildRobotsTxt(getSiteUrl(), BASE_PATH), { headers: { "Content-Type": "text/plain" } });
}
