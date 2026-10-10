/**
 * Seeds starter data: store settings, categories, starter pages and (optionally) DEMO ebooks + a bundle,
 * all flagged isDemo. Safe to re-run: existing records (matched by slug/key) are left untouched.
 *
 *   npm run db:seed
 *
 * Also used automatically during Vercel builds by scripts/prepare-db.ts.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { storage } from "../src/lib/storage/core";
import { DEFAULT_SETTINGS } from "../src/lib/settings-defaults";
import { makePlaceholderPdf } from "../scripts/lib/pdf";
import { BUNDLE, CATEGORIES, PAGES, PRODUCTS } from "./seed-content";

export async function seedDatabase(db: PrismaClient, opts: { demoProducts: boolean }) {
  await db.setting.upsert({ where: { key: "store" }, update: {}, create: { key: "store", value: DEFAULT_SETTINGS } });

  for (const [i, c] of CATEGORIES.entries()) {
    await db.category.upsert({ where: { slug: c.slug }, update: {}, create: { ...c, sortOrder: i } });
  }
  const cats = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c.id]));

  if (opts.demoProducts) await seedDemoProducts(db, cats);

  for (const page of PAGES) {
    await db.page.upsert({ where: { slug: page.slug }, update: {}, create: page });
  }
}

async function seedDemoProducts(db: PrismaClient, cats: Record<string, string>) {
  for (const p of PRODUCTS) {
    if (await db.product.findUnique({ where: { slug: p.slug } })) continue;
    const publishedAt = new Date(Date.now() - p.daysAgo * 86_400_000);
    const product = await db.product.create({
      data: {
        slug: p.slug,
        title: p.title,
        subtitle: p.subtitle,
        status: "PUBLISHED",
        isDemo: true,
        isFeatured: p.featured ?? false,
        shortDescription: p.short,
        description: p.description,
        audience: p.audience,
        learningOutcomes: p.outcomes,
        tableOfContents: p.toc.join("\n"),
        faq: p.faq ?? [],
        tags: p.tags,
        pageCount: p.pages,
        categoryId: cats[p.category],
        publishedAt,
        createdAt: publishedAt,
        prices: {
          create: [
            { currency: "USD", amount: p.usd, saleAmount: p.saleUsd ?? null },
            ...(p.inr ? [{ currency: "INR", amount: p.inr }] : []),
          ],
        },
      },
    });
    const pdf = makePlaceholderPdf([p.title, "DEMO PLACEHOLDER FILE", "Replace this file with the real ebook from the admin dashboard.", "Website Growth Lab"]);
    const path = `private/ebooks/${product.id}/${randomBytes(8).toString("hex")}.pdf`;
    await storage.put(path, pdf, "application/pdf");
    await db.productFile.create({
      data: { productId: product.id, kind: "MAIN", storagePath: path, fileName: `${p.slug}-DEMO.pdf`, mimeType: "application/pdf", sizeBytes: pdf.length },
    });
    console.log(`  + demo ebook: ${p.title}`);
  }

  if (!(await db.product.findUnique({ where: { slug: BUNDLE.slug } }))) {
    const children = await db.product.findMany({ where: { slug: { in: BUNDLE.includes } }, select: { id: true } });
    await db.product.create({
      data: {
        type: "BUNDLE",
        status: "PUBLISHED",
        isDemo: true,
        slug: BUNDLE.slug,
        title: BUNDLE.title,
        subtitle: BUNDLE.subtitle,
        shortDescription: BUNDLE.short,
        description: BUNDLE.description,
        fileFormat: "PDF",
        categoryId: cats[BUNDLE.category],
        publishedAt: new Date(Date.now() - 86_400_000),
        prices: { create: [{ currency: "USD", amount: BUNDLE.usd }, { currency: "INR", amount: BUNDLE.inr }] },
        bundleItems: { create: children.map((c) => ({ productId: c.id })) },
      },
    });
    console.log(`  + demo bundle: ${BUNDLE.title}`);
  }
}

// Run directly: `npm run db:seed`
if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed.ts")) {
  const db = new PrismaClient();
  seedDatabase(db, { demoProducts: true })
    .then(() => console.log("Seed complete. All seeded products are marked as DEMO — replace or archive them before launch."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
