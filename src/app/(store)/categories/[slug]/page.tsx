import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { searchCatalog } from "@/lib/catalog";
import { priceContext } from "@/lib/page-context";
import { ProductGrid } from "@/components/store/ProductCard";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { Pagination } from "@/components/store/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Markdown } from "@/components/ui/Markdown";

type Params = Promise<{ slug: string }>;
type SP = Promise<{ page?: string }>;

async function load(slug: string) {
  return db.category.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const c = await load(slug);
  if (!c) return { title: "Category not found", robots: { index: false } };
  const count = await db.product.count({ where: { categoryId: c.id, status: "PUBLISHED" } });
  return {
    title: c.seoTitle || `${c.name} ebooks`,
    description: c.seoDescription || c.description.slice(0, 160) || `Ebooks about ${c.name}.`,
    alternates: { canonical: `/categories/${c.slug}` },
    // Empty categories are thin content — don't ask search engines to index them.
    robots: count === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { slug } = await params;
  const { page: pageRaw } = await searchParams;
  const category = await load(slug);
  if (!category) notFound();
  const ctx = await priceContext();
  const page = Math.max(1, Number(pageRaw) || 1);
  const result = await searchCatalog({ category: slug, currency: ctx.baseCurrency, sort: "newest", page });

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Categories", href: "/categories" }, { name: category.name, href: `/categories/${category.slug}` }]} />
      <header className="mt-4 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl">{category.name}</h1>
        {category.description && <Markdown className="mt-3 text-navy-700">{category.description}</Markdown>}
      </header>
      <div className="mt-10">
        {result.items.length ? (
          <ProductGrid products={result.items} ctx={ctx} />
        ) : (
          <EmptyState title="No ebooks in this category yet">New titles are being prepared — check back soon.</EmptyState>
        )}
        <Pagination page={result.page} pageCount={result.pageCount} makeHref={(p) => `/categories/${category.slug}${p > 1 ? `?page=${p}` : ""}`} />
      </div>
    </div>
  );
}
