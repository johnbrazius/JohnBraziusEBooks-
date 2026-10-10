# Payments, currencies and bank settlement

> **Status:** the code integrates **Razorpay** (real checkout) and a **mock** provider (local testing only).
> **No payment account has been connected and no live payments have been taken.** Payments become live only after
> *you* complete Razorpay's verification, enter your keys, configure the webhook and run test payments.

## 1. The decision you need to make

You're based in India and want to sell to customers in India and abroad. There are two broad approaches:

| | **A. Direct gateway (built in): Razorpay** | **B. Hosted storefront: Payhip (or similar)** |
|---|---|---|
| Who runs checkout | Razorpay, inside this website | Payhip's own checkout pages |
| Who delivers files | This website (private storage + signed links) | Payhip |
| Your admin dashboard | Fully used (orders, refunds, analytics) | Mostly bypassed — products and orders live in Payhip |
| Multi-item cart | ✅ Supported (one Razorpay order for the cart total) | Handled by Payhip |
| INR for Indian buyers | ✅ Native | Depends on processor |
| USD / other currencies | Only after Razorpay **International Payments** is approved for your account | Depends on processor (Payhip lists Razorpay, PayPal, Stripe among its processors) |
| Platform fee | Gateway fee only | Payhip plan fee + processor fee |
| Effort | Configure keys + webhook (this guide) | Manage products in two places, or link out to Payhip |

**Recommendation:** use **Razorpay**. It is what this codebase integrates end to end, it settles to your Indian bank
account in INR, and it keeps orders, refunds and downloads under your control. If Razorpay doesn't approve
international payments for your account, the store still works for INR, and you can add an international option later.

**Not recommended right now:**
- **Stripe India** is reported to be invite-only for new Indian accounts. Check before planning around it.
- **Lemon Squeezy / Gumroad** (merchants of record) handle global tax for you, but third-party reports describe
  restrictions for Indian sellers and payouts in USD with conversion fees. Verify with them directly if you're interested.

## 2. Razorpay — what to expect (verify on Razorpay's official pricing page)

- **Domestic payments (INR):** a percentage per transaction plus 18% GST on the fee. See razorpay.com/pricing.
- **International cards:** third-party sources (Sept 2026) report **up to 3% + 18% GST** on the fee (≈3.54%), with
  currency conversion on top. **Check Razorpay's own rate card for your account. Its pricing beats any blog.**
- **Settlement:** Razorpay pays out to the **bank account you register and verify in the Razorpay Dashboard**, normally
  in INR, on its settlement schedule (commonly T+2 working days for domestic payments; international can differ).
- **International payments are not automatic.** You apply in the Dashboard (Account & Settings → International
  payments). Razorpay may ask for a website with clear policies (this site includes starter policy pages), your business
  details and the products you sell. Approval isn't guaranteed.
- **Currencies:** Razorpay supports charging in many currencies once international payments are enabled, but you must
  list only those **your** account can actually charge in the `PAYMENT_CURRENCIES` environment variable.

### What the website never does
- It never sees or stores card numbers, CVVs, UPI PINs or bank passwords. Razorpay's own checkout collects them.
- It never stores or displays your bank account details. You give those to Razorpay privately in its Dashboard.
- It never hardcodes API secrets. They live only in environment variables.

## 3. How multi-currency pricing works in this store

1. **Base currency** (Settings → Currencies, default `USD`): every product **must** have a price in it. It is the
   fallback charge currency. *If your Razorpay account is INR-only, set the base currency to `INR`.*
2. **Fixed market prices:** in each product you can add more currencies, e.g. `USD 10.00` and `INR 499.00`.
3. **Visitor currency:** chosen from the header dropdown, or defaulted by country (e.g. `IN → INR`) using Vercel's
   `x-vercel-ip-country` header.
4. **What's charged:** the cart is charged in the visitor's currency **only if** every item has a fixed price in it
   **and** it is in `PAYMENT_CURRENCIES`. Otherwise it's charged in the base currency, and the cart says so explicitly.
5. **Estimates:** if a product has no fixed price in the visitor's currency, the page shows the base price plus an
   optional "≈ ₹X (estimate — charged in USD)" using a rate **you** enter in Settings. Estimates never affect the
   amount charged.
6. **The server computes every amount** from the database. The browser's numbers are only used to detect a stale page.
   If the price changed, checkout stops and shows the updated total.
7. **Exchange-rate changes:** fixed prices don't move with exchange rates. Review them periodically in the admin.
   Your buyer's bank may apply its own conversion if they pay in a currency other than their card's.

## 4. Setting up Razorpay (step by step)

1. Create an account at razorpay.com and complete **KYC / activation** (PAN, business details, bank account).
2. In **Test Mode**, go to *Account & Settings → API Keys → Generate Test Key*. Copy the **Key ID** (`rzp_test_…`) and
   **Key Secret**.
3. Create a webhook: *Account & Settings → Webhooks → Add New Webhook*
   - **URL:** `https://YOUR-SITE.vercel.app/api/webhooks/razorpay`
   - **Secret:** a long random string you choose (save it as `RAZORPAY_WEBHOOK_SECRET`)
   - **Events:** `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`, `refund.failed`
4. *Account & Settings → Payment capture* → enable **automatic capture** so payments are captured immediately.
5. In Vercel → Environment Variables set:
   ```
   PAYMENT_PROVIDER=razorpay
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=...
   PAYMENT_CURRENCIES=INR            # add USD etc. only after international payments are approved
   ALLOW_MOCK_PAYMENTS=false
   ```
   Redeploy. The site shows a **TEST MODE** banner while test keys are used.
6. **Test** with Razorpay's documented test cards/UPI IDs (see Razorpay docs → "Test card details"). Check:
   - a successful payment unlocks the download page;
   - a failed payment shows "Payment not completed" and unlocks nothing;
   - the order appears in **Admin → Orders** with the right amount and currency;
   - a refund from **Admin → Orders → Refund** arrives back via the webhook and revokes access on a full refund.
7. **Go live:** when Razorpay activates your account, repeat steps 2–3 in **Live Mode** (live keys start with
   `rzp_live_`, and live mode needs its own webhook), update the environment variables, redeploy, and make one small
   real purchase of your own if you want to check settlement end to end. **Never use real cards in test mode.**

## 5. How payment confirmation works (security)

```
Browser ──(cart: product IDs only)──▶ /api/checkout ──▶ server prices cart from DB ──▶ Razorpay Orders API
   │                                                                                       │
   └──── Razorpay Checkout (card/UPI entered on Razorpay) ◀────────── order_id ─────────────┘
          │
          ├─▶ /api/checkout/razorpay/verify  (fast path: HMAC signature + fetch payment from Razorpay API, must be "captured")
          └─▶ Razorpay ──signed webhook──▶ /api/webhooks/razorpay (authoritative; signature verified; deduplicated by event ID)
                                                │
                                                ▼
                      markOrderPaid(): amount + currency must match the order → status PAID → download grants created
```
- A browser redirect alone never unlocks anything.
- Duplicate webhooks and the fast path running in parallel are safe: a conditional database update makes sure an order is
  fulfilled only once.
- Amount or currency mismatches are recorded on the order and never unlock downloads.

## 6. Tax

Selling digital products may create GST obligations in India and VAT/GST obligations in other countries. Razorpay is a
payment gateway, **not** a merchant of record. It does not file taxes for you. Talk to a chartered accountant before
launch, especially about export of services, LUT filing and FIRA/e-FIRC documentation for international receipts.
