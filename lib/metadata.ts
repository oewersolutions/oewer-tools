import type { Metadata } from "next";
import { getContent, getSetting } from "./content";
import { absoluteUrl, seoOverrides, type SeoEntityType } from "./seo";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Public site URL: the NEXT_PUBLIC_SITE_URL environment value wins over the `site_url` setting. */
export const getSiteUrl = (): string => process.env.NEXT_PUBLIC_SITE_URL || getSetting("site_url");

interface PageSeo {
  title: string;
  description?: string;
  /** Site-relative path with trailing slash, e.g. "/tools/". */
  path: string;
  entity?: { type: SeoEntityType; id: string };
  type?: "website" | "article";
}

/** Metadata for a page: the `seo_metadata` row for the entity overrides title, description, canonical and noindex. */
export function pageMetadata({ title, description, path, entity, type = "website" }: PageSeo): Metadata {
  const override = entity ? seoOverrides(getContent()).get(`${entity.type}:${entity.id}`) : undefined;
  const finalTitle = override?.meta_title || title;
  const finalDescription = override?.meta_description || description;
  const canonical = override?.canonical_url || absoluteUrl(getSiteUrl(), BASE_PATH, path);

  return {
    title: override?.meta_title ? { absolute: finalTitle } : finalTitle,
    description: finalDescription,
    alternates: { canonical },
    robots: override?.noindex ? { index: false, follow: true } : undefined,
    openGraph: { title: finalTitle, description: finalDescription, url: canonical, siteName: getSetting("site_name"), type },
  };
}
