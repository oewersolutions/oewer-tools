import { buildAdsTxt } from "../../lib/ads";
import { getOptionalSetting } from "../../lib/content";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildAdsTxt(getOptionalSetting("adsense_publisher_id")), { headers: { "Content-Type": "text/plain" } });
}
