import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl) return [];
  try {
    const url = new URL(configuredUrl);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return [];
    return [{
      url: url.origin,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    }];
  } catch {
    return [];
  }
}
