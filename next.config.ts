import type { NextConfig } from "next";

// GITHUB_PAGES=true triggers a static export suitable for GitHub Pages,
// served under /<repo-name>/. Render (and any normal Node host) runs the
// full dynamic app instead — including the live /api/outages route — so
// leave GITHUB_PAGES unset there.
const isGithubPages = process.env.GITHUB_PAGES === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";

const nextConfig: NextConfig = isGithubPages
  ? {
      output: "export",
      basePath: repoName ? `/${repoName}` : "",
      assetPrefix: repoName ? `/${repoName}/` : "",
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
