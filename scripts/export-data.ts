/**
 * Exports catalogue, settings, pages, discounts, orders and subscribers to a timestamped JSON file in ./backups
 * (git-ignored). This complements — it does not replace — your database provider's own backups.
 *
 *   npm run backup:export
 *
 * The file contains customer emails: store it securely and never commit it.
 */
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

async function main() {
  const db = new PrismaClient();
  const data = {
    exportedAt: new Date().toISOString(),
    settings: await db.setting.findMany(),
    categories: await db.category.findMany(),
    products: await db.product.findMany({ include: { prices: true, files: true, bundleItems: true } }),
    pages: await db.page.findMany(),
    discountCodes: await db.discountCode.findMany({ include: { products: { select: { id: true } } } }),
    orders: await db.order.findMany({ include: { items: true, grants: true, refunds: true } }),
    newsletterSubscribers: await db.newsletterSubscriber.findMany(),
  };
  const dir = path.join(process.cwd(), "backups");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `backup-${data.exportedAt.replace(/[:.]/g, "-")}.json`);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
  console.log(`Backup written to ${file}`);
  console.log("Note: ebook files live in storage — back up your storage bucket separately (see docs/SETUP.md).");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
