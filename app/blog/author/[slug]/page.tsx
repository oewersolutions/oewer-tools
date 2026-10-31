import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../components/Breadcrumbs";
import { PostCard } from "../../../../components/Cards";
import BlogHeader, { PostGrid } from "../../../../components/BlogHeader";
import { Container } from "../../../../components/layout";
import {
  authorSlug,
  getAuthorBySlug,
  getAuthors,
  getBlogCategory,
  getPostReadingMinutes,
  getPostsByAuthor,
} from "../../../../lib/content";
import { pageMetadata } from "../../../../lib/metadata";
import { nonEmptyParams } from "../../../../lib/static";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

// Only authors with a published article get a page.
export function generateStaticParams() {
  return nonEmptyParams(
    getAuthors()
      .filter((a) => getPostsByAuthor(a.author_id).length > 0)
      .map((a) => ({ slug: authorSlug(a) })),
    { slug: "_none" },
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const author = getAuthorBySlug((await params).slug);
  return author
    ? pageMetadata({
        title: `Articles by ${author.display_name}`,
        description: author.bio || undefined,
        path: `/blog/author/${authorSlug(author)}/`,
      })
    : {};
}

export default async function AuthorPage({ params }: Props) {
  const author = getAuthorBySlug((await params).slug);
  if (!author) notFound();
  const posts = getPostsByAuthor(author.author_id);
  if (posts.length === 0) notFound();

  return (
    <>
      <BlogHeader
        breadcrumbs={
          <Breadcrumbs
            trail={[
              { label: "Articles", path: "/blog/" },
              { label: author.display_name },
            ]}
          />
        }
        eyebrow="Author"
        title={author.display_name}
        description={author.bio || undefined}
        dates={posts.map((p) => p.published_at)}
        count={posts.length}
      />
      <Container className="py-12 sm:py-14">
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
      </Container>
    </>
  );
}
