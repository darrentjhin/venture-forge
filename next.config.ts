import type { NextConfig } from "next";

const githubPages = process.env.GITHUB_PAGES === "true";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "venture-forge";

const nextConfig: NextConfig = {
  output: githubPages ? "export" : undefined,
  basePath: githubPages ? `/${repositoryName}` : undefined,
  assetPrefix: githubPages ? `/${repositoryName}/` : undefined,
  images: { unoptimized: true },
};

export default nextConfig;
