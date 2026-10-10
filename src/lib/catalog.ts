import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { coverUrl } from "./storage";

/** Fields needed to render a product card anywhere in the storefront. */
export const cardSelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  shortDescription: true,
  type: true,
  coverPath: true,
  coverAlt: true,
  isDemo: true,
  saleStartsAt: true,
  saleEndsAt: true,
  publishedAt: true,
  category: { select: { name: true, slug: true } },
  prices: { select: { currency: true, amount: true, saleAmount: true } },
} satisfies Prisma.ProductSelect;

export type CardProduct = Prisma.ProductGetPayload<{ select: typeof cardSelect }> & { coverUrl: string | null };

function withCover<T extends { coverPath: string | null }>(rows: T[]): (T & { coverUrl: string | null })[] {
  return rows.map((r) => ({ ...r, coverUrl: coverUrl(r.coverPath) }));
}

export const PUBLISHED: Prisma.ProductWhereInput = { status: "PUBLISHED" };

export async function featuredProducts(limit = 4): Promise<CardProduct[]> {
  return withCover(
    await db.product.findMany({ where: { ...PUBLISHED, isFeatured: true }, select: cardSelect, orderBy: { publishedAt: "desc" }, take: limit }),
  );
}

export async function newReleases(limit = 4): Promise<CardProduct[]> {
  return withCover(await db.product.findMany({ where: PUBLISHED, select: cardSelect, orderBy: { publishedAt: "desc" }, take: limit }));
}

/**
 * Bestsellers from real paid orders only. Returns an empty list unless a product has at least `minOrders`
 * paid (and not fully refunded) orders, so the label is never shown without sales to back it.
 */
export async function bestsellers(minOrders: number, limit = 4): Promise<CardProduct[]> {
  const grouped = await db.orderItem.groupBy({
    by: ["productId"],
    where: { productId: { not: null }, order: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } } },
    _count: { _all: true },
    orderBy: { _count: { productId: "desc" } },
    take: 20,
  });
  const ids = grouped.filter((g) => g._count._all >= minOrders).map((g) => g.productId!) ;
  if (!ids.length) return [];
  const rows = await db.product.findMany({ where: { ...PUBLISHED, id: { in: ids } }, select: cardSelect });
  return withCover(ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean).slice(0, limit) as typeof rows);
}

export async function categoriesWithCounts() {
  const cats = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: PUBLISHED } } } },
  });
  return cats;
}

export type CatalogQuery = {
  q?: string;
  category?: string;
  min?: number; // minor units, in base currency
  max?: number;
  currency: string; // currency used for price filter / sort
  sort?: "newest" | "price-asc" | "price-desc" | "title";
  page?: number;
  pageSize?: number;
};

export async function searchCatalog(query: CatalogQuery) {
  const pageSize = query.pageSize ?? 12;
  const page = Math.max(1, query.page ?? 1);
  const q = query.q?.trim().slice(0, 100);

  const where: Prisma.ProductWhereInput = { ...PUBLISHED };
  const and: Prisma.ProductWhereInput[] = [];
  if (q) {
    const words = q.split(/\s+/).filter(Boolean).slice(0, 6);
    for (const w of words) {
      and.push({
        OR: [
          { title: { contains: w, mode: "insensitive" } },
          { subtitle: { contains: w, mode: "insensitive" } },
          { shortDescription: { contains: w, mode: "insensitive" } },
          { tags: { has: w.toLowerCase() } },
          { category: { name: { contains: w, mode: "insensitive" } } },
        ],
      });
    }
  }
  if (query.category) and.push({ category: { slug: query.category } });
  if (query.min != null || query.max != null) {
    and.push({
      prices: {
        some: {
          currency: query.currency,
          amount: { ...(query.min != null ? { gte: query.min } : {}), ...(query.max != null ? { lte: query.max } : {}) },
        },
      },
    });
  }
  if (and.length) where.AND = and;

  const total = await db.product.count({ where });

  let items;
  if (query.sort === "price-asc" || query.sort === "price-desc") {
    // Price lives in a child table, so sort IDs via a small raw query on the chosen currency, then load cards.
    const dir = query.sort === "price-asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const ids = (await db.product.findMany({ where, select: { id: true } })).map((r) => r.id);
    const sorted = ids.length
      ? await db.$queryRaw<{ id: string }[]>`
          SELECT p.id FROM "Product" p
          LEFT JOIN "ProductPrice" pp ON pp."productId" = p.id AND pp.currency = ${query.currency}
          WHERE p.id IN (${Prisma.join(ids)})
          ORDER BY pp.amount ${dir} NULLS LAST, p.title ASC
          LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`
      : [];
    const rows = await db.product.findMany({ where: { id: { in: sorted.map((s) => s.id) } }, select: cardSelect });
    items = sorted.map((s) => rows.find((r) => r.id === s.id)!).filter(Boolean);
  } else {
    items = await db.product.findMany({
      where,
      select: cardSelect,
      orderBy: query.sort === "title" ? { title: "asc" } : { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  return { items: withCover(items), total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function productBySlug(slug: string, opts: { includeUnpublished?: boolean } = {}) {
  const p = await db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      prices: true,
      files: { select: { kind: true, fileName: true, sizeBytes: true, mimeType: true } },
      bundleItems: { include: { product: { select: cardSelect } } },
    },
  });
  if (!p) return null;
  if (!opts.includeUnpublished && p.status !== "PUBLISHED") return null;
  return { ...p, coverUrl: coverUrl(p.coverPath) };
}

export async function relatedProducts(productId: string, categoryId: string | null, limit = 4): Promise<CardProduct[]> {
  const rows = await db.product.findMany({
    where: { ...PUBLISHED, id: { not: productId }, ...(categoryId ? { categoryId } : {}) },
    select: cardSelect,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return withCover(rows);
}
