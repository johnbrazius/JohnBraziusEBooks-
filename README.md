# Website Growth Lab

**Practical Knowledge. Digital Growth.** A multi-ebook digital bookstore with an admin dashboard, multi-currency
pricing, server-verified payments (Razorpay) and secure, expiring ebook downloads. Built with Next.js, TypeScript,
Tailwind CSS and PostgreSQL (Prisma), ready to deploy on Vercel with Supabase.

> **Current status (honest):** the code is complete and tested locally with simulated payments.
> **Nothing has been deployed, no payment account or bank account is connected, and no live payments are enabled.**
> Those steps need your accounts. See [docs/SETUP.md](docs/SETUP.md) and [docs/PAYMENTS.md](docs/PAYMENTS.md).
> Seeded products are **demo data** (labelled as such on the site) and legal pages are **starter templates
> marked for review**.

## Features
- **Storefront:** homepage (hero, search, featured, new releases, real-sales bestsellers, categories, promo banner,
  newsletter), searchable/filterable/sortable catalogue with pagination, product pages with SEO URLs
  (`/ebooks/<slug>`), category pages, cart with multiple ebooks, discount codes, order/download page, order lookup,
  editable About/Contact/Support/FAQ/Privacy/Terms/Refund/Licence pages.
- **Admin dashboard** (`/admin`): products (draft → preview → publish, unpublish, archive, delete), cover / ebook /
  sample uploads, per-currency prices and scheduled sales, bundles, categories (create/edit/reorder/delete with
  reassignment), discount codes, orders (refunds, revoke/restore downloads, resend emails, CSV export), analytics (per
  currency, gross vs net, best sellers, sales by date, anonymous views), pages, newsletter export, settings.
- **Payments:** Razorpay Orders + Checkout with signature-verified webhooks; mock provider for local testing.
- **Secure delivery:** private storage, per-order access tokens, download limits/expiry, 60-second signed URLs,
  refund revocation.
- **SEO:** per-page metadata, canonical URLs, sitemap, robots.txt, Open Graph, Product + Breadcrumb JSON-LD.

## Quick start (local)
```bash
npm install
cp .env.example .env              # set DATABASE_URL, DIRECT_URL, AUTH_SECRET
npx prisma migrate deploy
npm run db:seed                   # demo categories, ebooks, bundle, pages
npm run admin:create -- --email you@example.com
npm run dev                       # http://localhost:3000  ·  admin: /admin
```

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Develop / build / serve |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | Unit + integration tests (needs a Postgres DB named in `TEST_DATABASE_URL`, default `wgl_test`, which is **reset**) |
| `npm run test:e2e` | Playwright end-to-end test against a production build with mock payments |
| `npm run db:migrate` / `db:deploy` / `db:seed` | Prisma migrations (dev / prod) and demo seed |
| `npm run admin:create -- --email …` | Create or reset an admin (password prompted, stored as a bcrypt hash) |
| `npm run backup:export` | JSON backup of catalogue, orders and subscribers to `./backups` (git-ignored) |

## Documentation
- [docs/SETUP.md](docs/SETUP.md): step-by-step setup, Supabase, Vercel, domain, adding ebooks, backups, monitoring
- [docs/PAYMENTS.md](docs/PAYMENTS.md): provider options for an India-based seller, Razorpay setup, currencies, settlement
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): stack, data model, security design, SEO, known limitations
- [docs/TESTING.md](docs/TESTING.md): what's tested and how to test payments safely
- [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md): everything to do before taking real orders

## Build stages
| Stage | Status |
|---|---|
| 1. Storefront & catalogue | ✅ Done |
| 2. Database, admin auth, dashboard | ✅ Done |
| 3. Secure storage & delivery | ✅ Done (local driver tested; Supabase driver implemented, needs your project to test) |
| 4. Payment provider | ✅ Razorpay integrated + mock tested. ⏳ Needs your Razorpay account, keys and test payments |
| 5. SEO & analytics | ✅ Done |
| 6. Test & deploy | ✅ Automated tests pass locally. ⏳ Vercel deployment needs your accounts |
