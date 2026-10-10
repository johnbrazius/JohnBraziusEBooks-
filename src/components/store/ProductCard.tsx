import Link from "next/link";
import type { CardProduct } from "@/lib/catalog";
import { BookCover } from "./BookCover";
import { Price, type PriceContext } from "./Price";

export function ProductCard({ product, ctx, badge }: { product: CardProduct; ctx: PriceContext; badge?: string }) {
  return (
    <article className="group relative flex flex-col">
      <div className="relative px-3 pt-3 transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transform-none">
        <BookCover
          title={product.title}
          subtitle={product.subtitle}
          label={product.type === "BUNDLE" ? "Bundle" : product.category?.name}
          coverUrl={product.coverUrl}
          alt={product.coverAlt}
        />
        <div className="absolute left-1 top-1 flex flex-col gap-1">
          {badge && <span className="badge bg-teal-600 text-white shadow">{badge}</span>}
          {product.isDemo && <span className="badge bg-amber-100 text-amber-900 shadow">Demo product</span>}
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        {product.category && <p className="text-xs font-medium text-teal-700">{product.category.name}</p>}
        <h3 className="mt-1 font-display text-base font-semibold leading-snug text-navy-900">
          <Link href={`/ebooks/${product.slug}`} className="after:absolute after:inset-0 focus-visible:underline">
            {product.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-navy-600">{product.shortDescription}</p>
        <div className="mt-auto pt-3">
          <Price product={product} ctx={ctx} />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, ctx, badge }: { products: CardProduct[]; ctx: PriceContext; badge?: string }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} ctx={ctx} badge={badge} />
      ))}
    </div>
  );
}
