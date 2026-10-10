import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl();
  const [products, categories, pages] = await Promise.all([
    db.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true, categoryId: true } }),
    db.category.findMany({ select: { id: true, slug: true, updatedAt: true } }),
    db.page.findMany({ select: { slug: true, updatedAt: true } }),
  ]);
  // Only categories that actually contain published ebooks (avoid thin pages).
  const nonEmpty = new Set(products.map((p) => p.categoryId));
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/ebooks`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/categories`, changeFrequency: "monthly", priority: 0.6 },
    ...products.map((p) => ({ url: `${base}/ebooks/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...categories.filter((c) => nonEmpty.has(c.id)).map((c) => ({ url: `${base}/categories/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...pages.map((p) => ({ url: `${base}/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}
