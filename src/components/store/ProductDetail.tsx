import Link from "next/link";
import type { productBySlug, CardProduct } from "@/lib/catalog";
import type { StoreSettings } from "@/lib/settings";
import { BookCover } from "./BookCover";
import { Price, type PriceContext } from "./Price";
import { BuyButtons } from "./BuyButtons";
import { ProductGrid } from "./ProductCard";
import { Markdown } from "@/components/ui/Markdown";
import { Breadcrumbs } from "./Breadcrumbs";
import { chooseChargeCurrency } from "@/lib/pricing";

type Product = NonNullable<Awaited<ReturnType<typeof productBySlug>>>;

function formatBytes(n: number) {
  if (n > 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

export function ProductDetail({
  product,
  ctx,
  related,
  settings,
  chargeableCurrencies,
  preview = false,
}: {
  product: Product;
  ctx: PriceContext;
  related: CardProduct[];
  settings: StoreSettings;
  chargeableCurrencies: string[];
  preview?: boolean;
}) {
  const main = product.files.find((f) => f.kind === "MAIN");
  const sample = product.files.find((f) => f.kind === "SAMPLE");
  const faq = Array.isArray(product.faq) ? (product.faq as { question: string; answer: string }[]) : [];
  const chargeCurrency = chooseChargeCurrency([{ ...product }], ctx.currency, ctx.baseCurrency, chargeableCurrencies);
  const toc = product.tableOfContents.trim();
  const tocIsList = toc && !/^[#*\-\d]/m.test(toc);

  const details: [string, string][] = [
    ["Format", product.type === "BUNDLE" ? `${product.bundleItems.length} ebooks` : product.fileFormat],
    ...(product.pageCount ? ([["Length", `${product.pageCount} pages`]] as [string, string][]) : []),
    ["Language", product.language],
    ...(product.author ? ([["Author", product.author]] as [string, string][]) : []),
    ...(main ? ([["File size", formatBytes(main.sizeBytes)]] as [string, string][]) : []),
    ["Delivery", "Instant download after payment is confirmed"],
  ];

  return (
    <div className="container-page py-10">
      {!preview && (
        <Breadcrumbs
          items={[
            { name: "Ebooks", href: "/ebooks" },
            ...(product.category ? [{ name: product.category.name, href: `/categories/${product.category.slug}` }] : []),
            { name: product.title, href: `/ebooks/${product.slug}` },
          ]}
        />
      )}

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-16">
        <div className="mx-auto w-full max-w-sm lg:max-w-none">
          <div className="lg:sticky lg:top-24">
            <BookCover
              title={product.title}
              subtitle={product.subtitle}
              label={product.type === "BUNDLE" ? "Bundle" : product.category?.name}
              coverUrl={product.coverUrl}
              alt={product.coverAlt}
              size="lg"
              priority
            />
            {sample && (
              <a href={`/api/sample/${product.id}`} className="btn-secondary mt-6 w-full" rel="nofollow">
                Download free sample ({sample.fileName.split(".").pop()?.toUpperCase()})
              </a>
            )}
          </div>
        </div>

        <div>
          {product.isDemo && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              This is a <strong>demo product</strong> with sample content, created to show how the store works.
            </p>
          )}
          {product.category && (
            <Link href={`/categories/${product.category.slug}`} className="eyebrow hover:underline">{product.category.name}</Link>
          )}
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-navy-900 sm:text-4xl">{product.title}</h1>
          {product.subtitle && <p className="mt-3 text-lg text-navy-600">{product.subtitle}</p>}

          <div className="mt-6 rounded-xl border border-navy-100 bg-navy-50/50 p-5">
            <Price product={product} ctx={ctx} size="lg" />
            <p className="mt-2 text-xs text-navy-600">
              {chargeCurrency
                ? `Checkout amount is charged in ${chargeCurrency}. The exact total is shown before you pay.`
                : "This ebook is not available for purchase at the moment."}
            </p>
            <div className="mt-5">
              <BuyButtons productId={product.id} disabled={preview || !chargeCurrency} />
            </div>
            <ul className="mt-5 grid gap-2 text-sm text-navy-700 sm:grid-cols-2">
              <li>✓ Secure payment</li>
              <li>✓ Instant download link</li>
              <li>✓ Read on any device</li>
              <li>✓ <Link href="/refund-policy" className="underline">Refund policy</Link></li>
            </ul>
          </div>

          <section className="mt-10" aria-labelledby="about-h">
            <h2 id="about-h" className="font-display text-xl font-bold text-navy-900">About this {product.type === "BUNDLE" ? "bundle" : "ebook"}</h2>
            <Markdown className="mt-3">{product.description || product.shortDescription}</Markdown>
          </section>

          {product.type === "BUNDLE" && product.bundleItems.length > 0 && (
            <section className="mt-10" aria-labelledby="bundle-h">
              <h2 id="bundle-h" className="font-display text-xl font-bold text-navy-900">Included in this bundle</h2>
              <ul className="mt-3 divide-y divide-navy-100 rounded-xl border border-navy-100">
                {product.bundleItems.map(({ product: p }) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 p-4">
                    <Link href={`/ebooks/${p.slug}`} className="font-medium text-navy-900 hover:text-teal-700">{p.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {product.audience && (
            <section className="mt-10" aria-labelledby="aud-h">
              <h2 id="aud-h" className="font-display text-xl font-bold text-navy-900">Who this is for</h2>
              <Markdown className="mt-3">{product.audience}</Markdown>
            </section>
          )}

          {product.learningOutcomes.length > 0 && (
            <section className="mt-10" aria-labelledby="learn-h">
              <h2 id="learn-h" className="font-display text-xl font-bold text-navy-900">What you will learn</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {product.learningOutcomes.map((o) => (
                  <li key={o} className="flex gap-3 text-navy-700">
                    <span aria-hidden className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">✓</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {toc && (
            <section className="mt-10" aria-labelledby="toc-h">
              <h2 id="toc-h" className="font-display text-xl font-bold text-navy-900">Table of contents</h2>
              {tocIsList ? (
                <ol className="mt-4 list-decimal space-y-1.5 pl-6 text-navy-700">
                  {toc.split("\n").filter((l) => l.trim()).map((l, i) => <li key={i}>{l.trim()}</li>)}
                </ol>
              ) : (
                <Markdown className="mt-3">{toc}</Markdown>
              )}
            </section>
          )}

          <section className="mt-10" aria-labelledby="details-h">
            <h2 id="details-h" className="font-display text-xl font-bold text-navy-900">Product details</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 rounded-xl border border-navy-100 p-5 text-sm sm:grid-cols-2">
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-navy-500">{k}</dt>
                  <dd className="font-medium text-navy-900">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {faq.length > 0 && (
            <section className="mt-10" aria-labelledby="faq-h">
              <h2 id="faq-h" className="font-display text-xl font-bold text-navy-900">Frequently asked questions</h2>
              <div className="mt-4 divide-y divide-navy-100 rounded-xl border border-navy-100">
                {faq.map((f, i) => (
                  <details key={i} className="group p-4">
                    <summary className="cursor-pointer list-none font-medium text-navy-900 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-4">
                        {f.question}
                        <span aria-hidden className="text-teal-700 transition group-open:rotate-45">+</span>
                      </span>
                    </summary>
                    <p className="mt-2 whitespace-pre-line text-sm text-navy-700">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          <section className="mt-10 rounded-xl bg-navy-50 p-5 text-sm text-navy-700" aria-labelledby="support-h">
            <h2 id="support-h" className="font-semibold text-navy-900">Support & refunds</h2>
            <p className="mt-1">
              Questions before or after buying? Visit our <Link href="/support" className="font-medium text-teal-700 underline">support page</Link>
              {settings.supportEmail && <> or email <a className="font-medium text-teal-700 underline" href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a></>}.
              Read the <Link href="/refund-policy" className="font-medium text-teal-700 underline">refund policy</Link> and{" "}
              <Link href="/licence" className="font-medium text-teal-700 underline">licence terms</Link>.
            </p>
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-h">
          <h2 id="related-h" className="mb-8 font-display text-2xl font-bold text-navy-900">You may also like</h2>
          <ProductGrid products={related} ctx={ctx} />
        </section>
      )}
    </div>
  );
}
