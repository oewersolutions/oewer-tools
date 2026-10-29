import { getContent } from "../../lib/content";
import { buildSearchItems } from "../../lib/search";

export const dynamic = "force-static";

// Emitted as out/search-index.json and fetched by the search box on first use.
export function GET() {
  return Response.json(buildSearchItems(getContent()));
}
