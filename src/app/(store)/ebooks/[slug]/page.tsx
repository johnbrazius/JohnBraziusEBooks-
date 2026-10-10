import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { productBySlug, relatedProducts } from "@/lib/catalog";
import { priceContext } from "@/lib/page-context";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { unitPrice } from "@/lib/pricing";
import { fromMinor } from "@/lib/money";
import { ProductDetail } from "@/components/store/ProductDetail";
import { ViewBeacon } from "@/components/store/ViewBeacon";
import { JsonLd } from "@/components/store/JsonLd";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await productBySlug(slug);
  if (!p) return { title: "Ebook not found", robots: { index: false } };
  const title = p.seoTitle || p.title;
  const description = p.seoDescription || p.shortDescription;
  return {
    title,
    description,
    alternates: { canonical: `/ebooks/${p.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/ebooks/${p.slug}`,
      images: p.coverUrl ? [{ url: p.coverUrl, alt: p.coverAlt || `Cover of ${p.title}` }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await productBySlug(slug);
  if (!product) notFound();
  const [ctx, settings, related] = await Promise.all([priceContext(), getSettings(), relatedProducts(product.id, product.categoryId)]);
  const base = unitPrice(product, settings.baseCurrency, new Date());
  const url = `${env.siteUrl()}/ebooks/${product.slug}`;

  return (
    <>
      <ProductDetail product={product} ctx={ctx} related={related} settings={settings} chargeableCurrencies={env.paymentCurrencies()} />
      <ViewBeacon productId={product.id} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: product.seoDescription || product.shortDescription,
          url,
          sku: product.id,
          category: product.category?.name,
          brand: { "@type": "Brand", name: settings.storeName },
          ...(product.coverUrl ? { image: product.coverUrl.startsWith("http") ? product.coverUrl : `${env.siteUrl()}${product.coverUrl}` } : {}),
          ...(base
            ? {
                offers: {
                  "@type": "Offer",
                  price: fromMinor(base.amount, base.currency),
                  priceCurrency: base.currency,
                  availability: "https://schema.org/InStock",
                  url,
                },
              }
            : {}),
        }}
      />
    </>
  );
}
