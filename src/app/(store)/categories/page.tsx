import type { Metadata } from "next";
import Link from "next/link";
import { categoriesWithCounts } from "@/lib/catalog";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse ebooks by topic: websites, SEO, digital marketing, AI tools, freelancing and more.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await categoriesWithCounts();
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Categories", href: "/categories" }]} />
      <h1 className="mt-4 font-display text-3xl font-bold text-navy-900 sm:text-4xl">Categories</h1>
      {categories.length === 0 ? (
        <div className="mt-8"><EmptyState title="No categories yet" /></div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/categories/${c.slug}`} className="card flex h-full flex-col p-6 transition hover:border-teal-300 hover:shadow-md">
                <h2 className="font-display text-xl font-semibold text-navy-900">{c.name}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-navy-600">{c.description}</p>
                <span className="mt-auto pt-4 text-sm font-medium text-teal-700">
                  {c._count.products} {c._count.products === 1 ? "ebook" : "ebooks"} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
