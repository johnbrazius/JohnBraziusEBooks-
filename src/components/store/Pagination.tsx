import Link from "next/link";

export function Pagination({ page, pageCount, makeHref }: { page: number; pageCount: number; makeHref: (p: number) => string }) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 2);
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1">
      {page > 1 && <Link className="btn-ghost" href={makeHref(page - 1)} rel="prev">← Previous</Link>}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-navy-400">…</span>}
          <Link
            href={makeHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={`grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-medium ${p === page ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-navy-50"}`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount && <Link className="btn-ghost" href={makeHref(page + 1)} rel="next">Next →</Link>}
    </nav>
  );
}
