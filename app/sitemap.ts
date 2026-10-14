import type { MetadataRoute } from "next";
import hero from "@/assets/hero.jpg";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      priority: 1,
      images: [new URL(hero.src, SITE_URL).toString()],
    },
  ];
}
