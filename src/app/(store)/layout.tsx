import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { visitorCurrency } from "@/lib/currency";
import { activeProvider } from "@/lib/payments";
import { SiteHeader } from "@/components/store/SiteHeader";
import { SiteFooter } from "@/components/store/SiteFooter";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, currency, pages, categories] = await Promise.all([
    getSettings(),
    visitorCurrency(),
    db.page.findMany({ where: { showInFooter: true }, select: { slug: true, title: true }, orderBy: { title: "asc" } }),
    db.category.findMany({ select: { slug: true, name: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const provider = activeProvider();
  const banner = settings.banner;

  return (
    <>
      {provider?.testMode && (
        <div role="note" className="bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
          TEST MODE — payments are simulated{provider.id === "razorpay" ? " (Razorpay test keys)" : ""}. No real money is charged.
        </div>
      )}
      {banner.enabled && banner.text && (
        <div className="bg-navy-900 px-4 py-2 text-center text-sm text-white">
          <span>{banner.text}</span>
          {banner.linkUrl && banner.linkLabel && (
            <Link href={banner.linkUrl} className="ml-2 font-semibold text-teal-300 underline-offset-2 hover:underline">
              {banner.linkLabel} →
            </Link>
          )}
        </div>
      )}
      <SiteHeader storeName={settings.storeName} currency={currency} currencies={settings.displayCurrencies} />
      <main id="main">{children}</main>
      <SiteFooter settings={settings} pages={pages} categories={categories} />
    </>
  );
}
