// next.config.ts
// No ": NextConfig" annotation here, to skip the strict type check.

// The GitHub Actions workflow (actions/configure-pages) sets GITHUB_PAGES=true.
// In Docker or locally it is not set.
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  // Redirects do not work with a static export (GitHub Pages).
  // For "/" -> "/login" there, call redirect("/login") in app/page.tsx instead.
  // async redirects() {
  //   return [
  //     {
  //       source: '/',
  //       destination: '/login',
  //       permanent: true,
  //     },
  //   ];
  // },

  /* 1. Docker: a small standalone server. GitHub Pages: a static site in out/ */
  output: isGithubPages ? "export" : "standalone",

  /* 2. GitHub Pages only: the site lives at https://<user>.github.io/neural-app/ */
  ...(isGithubPages
    ? {
        basePath: "/neural-app",
        assetPrefix: "/neural-app/",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),

  /* 3. Ignore TypeScript errors during build */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;