import type { NextConfig } from "next";

// GitHub Pages project sites live under /<repo-name>. Set NEXT_PUBLIC_BASE_PATH in CI
// (e.g. "/oewer-tools"); leave it empty for a custom domain or local development.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true, // /tools/x/ -> tools/x/index.html, which GitHub Pages serves without rewrites
  images: { unoptimized: true }, // no image server on static hosting
};

export default nextConfig;
