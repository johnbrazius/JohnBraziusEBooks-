import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { CartLink } from "./CartLink";
import { CurrencySelect } from "./CurrencySelect";
import { SearchBox } from "./SearchBox";

const NAV = [
  { href: "/ebooks", label: "All ebooks" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
];

export function SiteHeader({ storeName, currency, currencies }: { storeName: string; currency: string; currencies: string[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center gap-4">
        <Logo name={storeName} />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 hover:text-navy-900">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden w-72 md:block">
          <SearchBox />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <CurrencySelect current={currency} options={currencies} />
          <CartLink />
          <details className="relative lg:hidden">
            <summary className="list-none rounded-lg p-2 text-navy-800 hover:bg-navy-50 [&::-webkit-details-marker]:hidden" aria-label="Menu">
              <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
            </summary>
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-navy-100 bg-white p-3 shadow-lg">
              <div className="mb-2 md:hidden"><SearchBox /></div>
              <nav aria-label="Mobile" className="flex flex-col">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-navy-800 hover:bg-navy-50">{n.label}</Link>
                ))}
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
