# Architecture

## Stack
- **Next.js 15 (App Router) + TypeScript**, server components by default, server actions for admin forms.
- **Tailwind CSS** with a navy / teal design system (`tailwind.config.ts`, `src/app/globals.css`).
- **PostgreSQL via Prisma** (`prisma/schema.prisma`, migrations in `prisma/migrations`).
- **Storage abstraction** (`src/lib/storage`): local disk in development, Supabase Storage in production
  (public `covers` bucket, private `ebooks` bucket, signed URLs).
- **Payments abstraction** (`src/lib/payments`): Razorpay (REST API + Checkout.js) and a mock provider for development.
- **Email** (`src/lib/email.ts`): optional Resend REST API.

## Directory map
```
prisma/                 schema, migrations, demo seed (seed-content.ts = editable starter copy)
scripts/                create-admin, export-data (backup), placeholder PDF generator
src/app/(store)/        public storefront: home, /ebooks, /ebooks/[slug], /categories, cart, orders, CMS pages
src/app/admin/          login + protected dashboard (products, categories, discounts, orders, analytics, pages, newsletter, settings)
src/app/api/            checkout, quote, Razorpay verify + webhook, downloads, samples, views, admin uploads/export
src/lib/                domain logic: pricing (pure), orders (checkout/fulfilment/refunds), catalog queries, auth, storage, settings
src/components/         store and admin UI
tests/                  unit (pure logic), integration (real Postgres), e2e (Playwright against a production build)
```

## Data model (summary)
| Model | Purpose |
|---|---|
| `Product` | Ebook or bundle; status `DRAFT/PUBLISHED/ARCHIVED`; unique `slug`; SEO fields; `isDemo`, `isFeatured`; sale window |
| `ProductPrice` | One row per product per currency (`amount`, optional `saleAmount`), in minor units |
| `ProductFile` | `MAIN` (paid, private) and `SAMPLE` (free) files; storage path, name, type, size |
| `BundleItem` | Bundle → included ebooks |
| `Category` | Editable name/slug/description/SEO, `sortOrder` |
| `DiscountCode` | Percent or fixed, currency restriction, min subtotal, window, usage limit, optional product list |
| `Order` / `OrderItem` | Snapshot of what was bought and charged; provider IDs; refund totals; email delivery status |
| `PaymentEvent` | Every webhook received (unique per provider + event ID) for idempotency and audit |
| `Refund` | Provider refund records |
| `DownloadGrant` | One per (order, product): download count/limit, optional expiry, revocation |
| `AdminUser` | bcrypt hash, lockout counters, `sessionVersion` for "sign out everywhere" |
| `NewsletterSubscriber` | Email, consent text + timestamp, unsubscribe token |
| `ProductViewDaily` | Anonymous daily view counters |
| `Page`, `Setting`, `RateLimit` | CMS pages, store settings JSON, shared rate-limit counters |

## Security design
- **Admin auth:** email + password (bcrypt, cost 12), DB-backed lockout after 5 failures, IP rate limit, HS256 session
  JWT in an `httpOnly`, `SameSite=Lax`, `Secure` (production) cookie, 8-hour expiry. `middleware.ts` rejects requests
  without a valid token, and **every** admin page, action and API route re-checks the database via `requireAdmin()`.
  Server actions get Next.js's built-in origin check; admin API routes check `Origin` too.
- **No public admin:** there's no sign-up. Admins are created only with `npm run admin:create`.
- **Digital delivery:** ebooks live in a private bucket. Downloads go through `/api/download/[grantId]?t=…`, which
  checks the order access token (HMAC of the order ID with `AUTH_SECRET`), order status, revocation, expiry and the
  download limit (atomically), plus a rate limit. Only then does it issue a 60-second signed URL.
- **Payments:** amounts are computed on the server; webhooks are verified with HMAC-SHA256 in constant time and
  deduplicated; fulfilment requires matching amount and currency and is idempotent; failed or unverified payments never
  create download grants; full refunds revoke grants.
- **Uploads:** type allow-list, size limits, signed single-use upload tickets bound to a random storage path, and
  magic-byte verification of the stored file before it's attached to a product. SVG and HTML are never accepted.
- **Content:** Markdown is rendered without raw HTML; JSON-LD is escaped; CSV exports neutralise formula injection.
- **Headers:** CSP (allowing only Razorpay as a third party), HSTS, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`; `noindex` + `no-store` on admin, orders, checkout and API.
- **Privacy:** customers need only an email, with no account and no tracking cookies. View analytics store no IP or ID.
- **Secrets** are only read from environment variables (`src/lib/env.ts`). `.env*` files are git-ignored, as are
  `storage/` (local uploads) and `backups/`.

## SEO
- `generateMetadata` per page (unique titles/descriptions, canonical URLs, Open Graph).
- `sitemap.xml`: home, catalogue, published products, **non-empty** categories, CMS pages.
- `robots.txt`: disallows admin, API, cart, checkout, orders.
- JSON-LD: `Product` with a real `Offer` (no fabricated ratings) and `BreadcrumbList`.
- Filtered/search catalogue pages and empty categories are `noindex, follow` to avoid thin/duplicate content.

## Known limitations / next steps
- One payment provider is active at a time (`PAYMENT_PROVIDER`).
- Pending orders that are never paid stay `PENDING` (harmless). A cleanup job could cancel them after 24 h.
- Bestseller labels need real paid orders, at least `bestsellerMinOrders` (default 5).
- Optional customer accounts / purchase history weren't built. Customers keep access via their emailed/bookmarked
  order link and the "Find my order" page (which needs email configured).
- Taxes (GST/VAT) aren't calculated by the store. Get professional advice.
