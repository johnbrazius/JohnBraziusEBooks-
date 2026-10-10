# Launch checklist

Work through this before accepting real money.

## Accounts & configuration
- [ ] Supabase project created; migrations applied; `covers` (public) and `ebooks` (private) buckets created
- [ ] Vercel project deployed with all environment variables; plan is suitable for commercial use (Vercel Pro)
- [ ] `AUTH_SECRET` is a fresh, long random value (not the development one)
- [ ] `STORAGE_DRIVER=supabase`; uploading and downloading a file works on the deployed site
- [ ] `ALLOW_MOCK_PAYMENTS` is **not** `true` and `PAYMENT_PROVIDER` is **not** `mock`
- [ ] Admin account created with a strong, unique password; no other admins exist that you don't recognise

## Payments
- [ ] Razorpay account activated (KYC complete, bank account verified **in Razorpay**)
- [ ] International payments applied for/approved if you will charge non-INR currencies
- [ ] `PAYMENT_CURRENCIES` lists only currencies your account can actually charge
- [ ] Store **base currency** (Settings) is one of those currencies
- [ ] Full test-mode checklist in `TESTING.md` passed
- [ ] Live keys + live-mode webhook configured; TEST MODE banner gone
- [ ] Automatic capture enabled in Razorpay

## Catalogue & content
- [ ] Demo products replaced or archived (Admin → Products → "Demo only")
- [ ] Real ebook files, covers (with alt text), prices (base + INR) and descriptions in place
- [ ] Support email set in Settings; Contact page shows it
- [ ] Legal pages (Privacy, Terms, Refund, Licence) reviewed by a professional; "Needs review" unticked
- [ ] Accurate About page; no invented addresses, registrations or guarantees
- [ ] Tax position confirmed with a chartered accountant (GST, export of services, FIRA/e-FIRC)

## Delivery & email
- [ ] Resend configured with a verified domain (recommended) and a test order email received
- [ ] Download limit / expiry policy chosen (`DOWNLOAD_MAX_COUNT`, `DOWNLOAD_EXPIRY_DAYS`)

## SEO & monitoring
- [ ] `NEXT_PUBLIC_SITE_URL` matches the live domain
- [ ] `/sitemap.xml` submitted to Google Search Console
- [ ] Backups scheduled (`npm run backup:export` and/or `pg_dump`), originals of ebook files kept offline
- [ ] Know where to look: Vercel Logs, Supabase Usage, Razorpay webhook logs
