import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { bestsellers, categoriesWithCounts, featuredProducts, newReleases } from "@/lib/catalog";
import { priceContext } from "@/lib/page-context";
import { ProductGrid } from "@/components/store/ProductCard";
import { SearchBox } from "@/components/store/SearchBox";
import { NewsletterForm } from "@/components/store/NewsletterForm";
import { BookCover } from "@/components/store/BookCover";
import { EmptyState } from "@/components/ui/EmptyState";
import { NEWSLETTER_CONSENT } from "@/lib/constants";

export const dynamic = "force-dynamic";

function Section({ title, eyebrow, href, children }: { title: string; eyebrow?: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="container-page py-14">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h2>
        </div>
        {href && <Link href={href} className="shrink-0 text-sm font-semibold text-teal-700 hover:underline">View all →</Link>}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const settings = await getSettings();
  const [ctx, featured, latest, best, categories] = await Promise.all([
    priceContext(),
    featuredProducts(4),
    newReleases(4),
    bestsellers(settings.bestsellerMinOrders, 4),
    categoriesWithCounts(),
  ]);
  const heroBooks = (featured.length ? featured : latest).slice(0, 3);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 text-white">
        <div aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="eyebrow text-teal-300">Ebooks & practical guides</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">{settings.tagline}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-navy-200">
              Discover actionable guides on building websites, SEO, digital marketing, AI tools and growing your business —
              written to be applied, not just read.
            </p>
            <div className="mt-8 max-w-xl">
              <SearchBox large />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/ebooks" className="btn-primary px-5 py-3">Browse all ebooks</Link>
              <Link href="/categories" className="btn border border-white/25 px-5 py-3 text-white hover:bg-white/10">Explore categories</Link>
            </div>
          </div>
          {heroBooks.length > 0 && (
            <div className="relative mx-auto hidden h-[420px] w-full max-w-md sm:block" aria-hidden>
              {heroBooks.map((b, i) => (
                <div
                  key={b.id}
                  className="absolute w-52"
                  style={{
                    left: `${[30, 0, 55][i]}%`,
                    top: `${[0, 18, 22][i]}%`,
                    transform: `rotate(${[-2, -9, 7][i]}deg)`,
                    zIndex: [3, 1, 2][i],
                  }}
                >
                  <BookCover title={b.title} subtitle={b.subtitle} label={b.category?.name} coverUrl={b.coverUrl} alt="" priority={i === 0} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {featured.length > 0 && (
        <Section title="Featured ebooks" eyebrow="Hand-picked" href="/ebooks">
          <ProductGrid products={featured} ctx={ctx} />
        </Section>
      )}

      <Section title="New releases" eyebrow="Just published" href="/ebooks?sort=newest">
        {latest.length ? <ProductGrid products={latest} ctx={ctx} /> : <EmptyState title="New ebooks are on the way">Check back soon.</EmptyState>}
      </Section>

      {/* Only rendered when real paid orders meet the configured threshold */}
      {best.length > 0 && (
        <Section title="Bestsellers" eyebrow="Based on actual sales">
          <ProductGrid products={best} ctx={ctx} badge="Bestseller" />
        </Section>
      )}

      {categories.length > 0 && (
        <section className="bg-navy-50/60 py-14">
          <div className="container-page">
            <p className="eyebrow">Topics</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">Browse by category</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/categories/${c.slug}`} className="card flex h-full flex-col p-5 transition hover:border-teal-300 hover:shadow-md">
                    <span className="font-display text-lg font-semibold text-navy-900">{c.name}</span>
                    <span className="mt-1 line-clamp-2 text-sm text-navy-600">{c.description}</span>
                    <span className="mt-auto pt-3 text-xs font-medium text-teal-700">
                      {c._count.products} {c._count.products === 1 ? "ebook" : "ebooks"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {settings.newsletterEnabled && (
        <section className="container-page py-16">
          <div className="grid items-center gap-8 rounded-2xl bg-gradient-to-r from-teal-700 to-navy-800 p-8 text-white sm:p-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Be first to know about new guides</h2>
              <p className="mt-2 text-teal-50">Occasional emails about new releases and offers. Unsubscribe any time.</p>
            </div>
            <NewsletterForm consentText={NEWSLETTER_CONSENT} dark />
          </div>
        </section>
      )}
    </>
  );
}
