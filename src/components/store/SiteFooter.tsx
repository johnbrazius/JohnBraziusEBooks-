import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import type { StoreSettings } from "@/lib/settings";
import { NewsletterForm } from "./NewsletterForm";
import { NEWSLETTER_CONSENT } from "@/lib/constants";

export function SiteFooter({ settings, pages, categories }: { settings: StoreSettings; pages: { slug: string; title: string }[]; categories: { slug: string; name: string }[] }) {
  const social = Object.entries(settings.social).filter(([, url]) => url);
  return (
    <footer className="mt-24 bg-navy-950 text-navy-200">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo name={settings.storeName} light />
          <p className="text-sm leading-relaxed text-navy-300">{settings.tagline}</p>
          {settings.supportEmail && (
            <p className="text-sm">
              Contact: <a className="text-teal-300 hover:underline" href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a>
            </p>
          )}
          {social.length > 0 && (
            <ul className="flex flex-wrap gap-3 text-sm">
              {social.map(([name, url]) => (
                <li key={name}><a href={url} rel="noopener noreferrer" target="_blank" className="capitalize hover:text-white">{name}</a></li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Browse</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/ebooks" className="hover:text-white">All ebooks</Link></li>
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}><Link href={`/categories/${c.slug}`} className="hover:text-white">{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Information</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {pages.map((p) => (
              <li key={p.slug}><Link href={`/${p.slug}`} className="hover:text-white">{p.title}</Link></li>
            ))}
            <li><Link href="/orders/lookup" className="hover:text-white">Find my order</Link></li>
          </ul>
        </div>
        {settings.newsletterEnabled && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">New releases by email</h2>
            <p className="mb-4 mt-4 text-sm text-navy-300">Hear about new guides and offers. No spam.</p>
            <NewsletterForm consentText={NEWSLETTER_CONSENT} dark />
          </div>
        )}
      </div>
      <div className="border-t border-navy-800">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-navy-400 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
          <p>Secure checkout · Instant digital delivery</p>
        </div>
      </div>
    </footer>
  );
}
