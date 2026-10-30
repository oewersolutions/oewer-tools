import { describe, expect, it } from "vitest";
import { pickRelatedPosts } from "../lib/posts";

const post = (id: string, category: string, date: string) => ({ post_id: id, category_id: category, published_at: date });
const tags = (m: Record<string, string[]>) => new Map(Object.entries(m).map(([k, v]) => [k, new Set(v)]));

describe("pickRelatedPosts", () => {
  const a = post("POST0001", "C1", "2026-10-01T00:00:00Z");
  const b = post("POST0002", "C1", "2026-10-05T00:00:00Z"); // same category, no shared tag
  const c = post("POST0003", "C2", "2026-10-03T00:00:00Z"); // shares two tags
  const d = post("POST0004", "C2", "2026-10-04T00:00:00Z"); // shares one tag
  const e = post("POST0005", "C3", "2026-10-06T00:00:00Z"); // unrelated
  const t = tags({ POST0001: ["x", "y"], POST0003: ["x", "y"], POST0004: ["y"], POST0005: ["z"] });
  const all = [a, b, c, d, e];

  it("ranks by shared tags, then the same category, and leaves out unrelated articles and itself", () => {
    expect(pickRelatedPosts(a, t, all).map((p) => p.post_id)).toEqual(["POST0003", "POST0004", "POST0002"]);
  });
  it("respects the limit", () => {
    expect(pickRelatedPosts(a, t, all, 1).map((p) => p.post_id)).toEqual(["POST0003"]);
  });
  it("breaks ties with the newest article first", () => {
    const x = post("POST0010", "C1", "2026-10-01T00:00:00Z");
    const y = post("POST0011", "C1", "2026-10-09T00:00:00Z");
    expect(pickRelatedPosts(a, new Map(), [x, y]).map((p) => p.post_id)).toEqual(["POST0011", "POST0010"]);
  });
  it("returns nothing when nothing is related", () => {
    expect(pickRelatedPosts(e, t, [a, b])).toEqual([]);
  });
});
