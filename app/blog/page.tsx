import AdSlot from "../../components/AdSlot";
import type { Metadata } from "next";
import Link from "next/link";
import BlogHeader, { PostGrid } from "../../components/BlogHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
import { PostCard } from "../../components/Cards";
import { Container } from "../../components/layout";
import {
  getBlogCategory,
  getPostReadingMinutes,
  getPublishedPosts,
  getTagsInUse,
} from "../../lib/content";
import { BASE_PATH, pageMetadata } from "../../lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Articles",
  description: "Guides and explainers to help you get the most from our tools.",
  path: "/blog/",
});

export default function BlogIndexPage() {
  const posts = getPublishedPosts();
  const tags = getTagsInUse();

  return (
    <>
      <BlogHeader
        breadcrumbs={<Breadcrumbs trail={[{ label: "Articles" }]} />}
        title="Articles"
        description="Plain-language guides on money, images and everyday tasks, written to go with the tools."
        dates={posts.map((p) => p.published_at)}
        count={posts.length}
        active=""
      />
      <Container className="py-12 sm:py-14">
        {posts.length > 0 ? (
          <PostGrid>
            {posts.map((p, i) => (
              <PostCard
              priority={i === 0}
                heading="h2"
                key={p.post_id}
                post={p}
                categoryName={getBlogCategory(p.category_id)?.name}
                minutes={getPostReadingMinutes(p.post_id)}
              />
            ))}
          </PostGrid>
        ) : (
          <p className="text-muted">No articles yet.</p>
        )}
        <AdSlot placement="list_bottom" pageType="blog_index" />
        {tags.length > 0 && (
          <section
            aria-labelledby="topics-heading"
            className="rule mt-16 pt-10"
          >
            <h2 id="topics-heading" className="t-subheading text-ink">
              Browse by topic
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {tags.map((t) => (
                <li key={t.tag_id}>
                  <Link
                    href={`/blog/tag/${t.slug}/`}
                    className="pill !px-4 !py-1.5 !text-sm transition-colors hover:bg-brand hover:text-white"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm">
              <a
                href={`${BASE_PATH}/feed.xml`}
                className="font-medium text-brand hover:underline"
              >
                Subscribe with RSS
              </a>
            </p>
          </section>
        )}
      </Container>
    </>
  );
}
