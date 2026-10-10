# Testing

## Automated tests

| Suite | Command | Covers |
|---|---|---|
| Unit | `npm test` | Pricing (fixed vs. estimated prices, sale windows, charge-currency selection), discount rules, money parsing, price validation, publish checks, slugs, FAQ parsing, file signature checks, Razorpay webhook & checkout signature verification |
| Integration | `npm test` | Against a real Postgres DB (`TEST_DATABASE_URL`, default `postgresql://wgl:wgl@localhost:5432/wgl_test`, **reset on every run**): drafts hidden from the catalogue/product pages, publish/unpublish, price filter/sort, mock checkout → verified payment → grants only for the purchased product, duplicate notifications, failed payments unlock nothing, amount/currency mismatch refused, per-product prices and currency fallback, stale totals rejected, unpublished products refused, server-side discounts + redemption limits, bundle expansion, partial vs. full refunds (revocation), order access tokens |
| End-to-end | `npm run build && npm run test:e2e` | Real browser against a production build with **mock** payments: admin pages and APIs reject anonymous users; wrong password rejected; create a draft with cover + PDF uploads; draft returns 404 and isn't listed; invalid price rejected; publish; product appears in catalogue; edit price, description and **replace the PDF**; INR/USD currency switch; failed payment unlocks nothing; successful payment downloads exactly the new PDF; forged tokens get 404; unsigned webhooks rejected; unpublish removes product from listings and sitemap; robots/noindex; mobile layout without horizontal scroll |

E2E prerequisites: a migrated + seeded database in `DATABASE_URL`, and an admin created with
`ADMIN_PASSWORD='E2e-Test-Password-123' npm run admin:create -- --email admin@example.com` (or set `E2E_ADMIN_EMAIL` /
`E2E_ADMIN_PASSWORD`). The suite resets login rate-limit counters before running.

**Last local run:** 28 unit + 12 integration + 6 end-to-end tests passing; `tsc`, ESLint and `next build` clean.

## Testing real payments safely (Razorpay test mode)

**Never run a real charge just to test the website.**

1. Use **test keys** (`rzp_test_…`) and a **test-mode webhook** pointing at your deployed URL.
2. Use Razorpay's published test card numbers / test UPI IDs (Razorpay docs → Payments → Test card details).
3. Checklist:
   - [ ] Successful payment → order page shows downloads; Admin → Orders shows `PAID`, the right currency and amount
   - [ ] Close the payment window without paying → order stays pending; nothing unlocked
   - [ ] Failed/declined test payment → "Payment not completed"; no downloads
   - [ ] Razorpay Dashboard → Webhooks shows deliveries with HTTP 200
   - [ ] Refund from Admin → Orders → refund appears; full refund revokes download access
   - [ ] Two different ebooks bought separately → each order only downloads its own ebook
   - [ ] Indian visitor (or currency = INR) sees INR and is charged INR; with an item lacking an INR price the cart
         explains it will be charged in the base currency
   - [ ] Discount code reduces the total on the Razorpay checkout amount
   - [ ] Download limit: after `DOWNLOAD_MAX_COUNT` downloads, further attempts are refused
   - [ ] Signed-out browser cannot open `/admin/*`
4. Mobile: test the product page, cart and Razorpay checkout on a real phone.
