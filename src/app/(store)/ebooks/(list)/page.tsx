import type { Metadata } from "next";
import Link from "next/link";
import { categoriesWithCounts, searchCatalog } from "@/lib/catalog";
import { priceContext } from "@/lib/page-context";
import { toMinor } from "@/lib/money";
import { ProductGrid } from "@/components/store/ProductCard";
import { Pagination } from "@/components/store/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";

type SP = Promise<Record<string, string | string[] | undefined>>;

const SORTS = { newest: "Newest", "price-asc": "Price: low to high", "price-desc": "Price: high to low", title: "Title A–Z" } as const;

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Object.keys(sp).length > 0;
  return {
    title: "All ebooks",
    description: "Browse practical ebooks on websites, SEO, marketing, AI tools, freelancing and business growth.",
    alternates: { canonical: "/ebooks" },
    // Filtered/search result pages are thin duplicates of the catalogue — keep them out of the index.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function StorePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const ctx = await priceContext();
  const q = one(sp.q) ?? "";
  const category = one(sp.category) ?? "";
  const sortRaw = one(sp.sort) ?? "newest";
  const sort = (sortRaw in SORTS ? sortRaw : "newest") as keyof typeof SORTS;
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const minRaw = one(sp.min) ?? "";
  const maxRaw = one(sp.max) ?? "";
  const filterCurrency = ctx.baseCurrency;
  const min = minRaw ? toMinor(minRaw, filterCurrency) ?? undefined : undefined;
  const max = maxRaw ? toMinor(maxRaw, filterCurrency) ?? undefined : undefined;

  const [result, categories] = await Promise.all([
    searchCatalog({ q, category: category || undefined, min, max, currency: filterCurrency, sort, page }),
    categoriesWithCounts(),
  ]);

  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (minRaw) params.set("min", minRaw);
    if (maxRaw) params.set("max", maxRaw);
    if (sort !== "newest") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/ebooks${s ? `?${s}` : ""}`;
  };

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "All ebooks", href: "/ebooks" }]} />
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl">{q ? `Results for “${q}”` : "All ebooks"}</h1>
          <p className="mt-1 text-sm text-navy-600" aria-live="polite">
            {result.total} {result.total === 1 ? "ebook" : "ebooks"}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside>
          <form method="get" action="/ebooks" className="space-y-6 rounded-xl border border-navy-100 p-5 lg:sticky lg:top-24">
            <div>
              <label htmlFor="f-q" className="label">Search</label>
              <input id="f-q" name="q" type="search" defaultValue={q} className="input" placeholder="Title, topic, keyword" maxLength={100} />
            </div>
            <div>
              <label htmlFor="f-cat" className="label">Category</label>
              <select id="f-cat" name="category" defaultValue={category} className="input">
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name} ({c._count.products})</option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className="label">Price ({filterCurrency})</legend>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="f-min">Minimum price</label>
                <input id="f-min" name="min" inputMode="decimal" defaultValue={minRaw} placeholder="Min" className="input" />
                <span className="text-navy-400">–</span>
                <label className="sr-only" htmlFor="f-max">Maximum price</label>
                <input id="f-max" name="max" inputMode="decimal" defaultValue={maxRaw} placeholder="Max" className="input" />
              </div>
            </fieldset>
            <div>
              <label htmlFor="f-sort" className="label">Sort by</label>
              <select id="f-sort" name="sort" defaultValue={sort} className="input">
                {Object.entries(SORTS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button className="btn-navy flex-1">Apply</button>
              <Link href="/ebooks" className="btn-ghost">Reset</Link>
            </div>
          </form>
        </aside>

        <div>
          {result.items.length ? (
            <ProductGrid products={result.items} ctx={ctx} />
          ) : (
            <EmptyState title="No ebooks match your filters">
              Try a different search term or <Link href="/ebooks" className="font-semibold text-teal-700 underline">clear all filters</Link>.
            </EmptyState>
          )}
          <Pagination page={result.page} pageCount={result.pageCount} makeHref={makeHref} />
        </div>
      </div>
    </div>
  );
}
