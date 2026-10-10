import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { productBySlug, relatedProducts } from "@/lib/catalog";
import { priceContext } from "@/lib/page-context";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { ProductDetail } from "@/components/store/ProductDetail";

export const metadata = { title: "Preview", robots: { index: false, follow: false } };

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const row = await db.product.findUnique({ where: { id }, select: { slug: true, status: true } });
  if (!row) notFound();
  const product = await productBySlug(row.slug, { includeUnpublished: true });
  if (!product) notFound();
  const [ctx, settings, related] = await Promise.all([priceContext(), getSettings(), relatedProducts(product.id, product.categoryId)]);
  return (
    <div className="-mx-4 -my-8 bg-white sm:-mx-6">
      <div className="bg-navy-900 px-4 py-2 text-center text-xs font-semibold text-white">
        PREVIEW ({row.status}) — this is how the product page will look. Buttons are disabled.
      </div>
      <ProductDetail product={product} ctx={ctx} related={related} settings={settings} chargeableCurrencies={env.paymentCurrencies()} preview />
    </div>
  );
}
