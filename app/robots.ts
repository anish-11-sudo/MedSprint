import type { MetadataRoute } from "next";

function publicSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl) return null;
  try {
    const url = new URL(configuredUrl);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = publicSiteUrl();
  if (!siteUrl) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/onboarding", "/learn", "/practice", "/billing", "/settings"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
