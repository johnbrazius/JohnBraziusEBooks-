# Setup & deployment guide (beginner-friendly)

This guide takes you from an empty computer to a deployed store. Follow it in order. Each external service is
explained before you need it.

**What you will set up**

| Service | Why | Cost to start |
|---|---|---|
| **GitHub** | Stores your code (already done) | Free |
| **Supabase** | PostgreSQL database **and** private file storage for ebooks | Free tier |
| **Vercel** | Hosts the website | Free *Hobby* tier for testing — see the note on commercial use below |
| **Razorpay** | Takes payments and settles to your bank | No setup fee, per-transaction fees |
| **Resend** *(optional)* | Emails customers their download link | Free tier |

> ⚠️ **Limits change. Check each provider's pricing page before relying on these numbers.**
> - **Vercel Hobby** is free but its terms are for **personal, non-commercial** projects. A store that takes payments
>   is commercial, so plan to move to **Vercel Pro** (paid, per team member per month) **before taking real orders**.
>   You can build and test on Hobby.
> - **Supabase Free:** roughly 500 MB database, 1 GB file storage and limited monthly egress (bandwidth). Free projects
>   are **paused after a period of inactivity**. Large PDFs downloaded often will use egress quickly; the Pro plan
>   (paid monthly) raises limits and removes pausing.
> - **Resend Free:** a limited number of emails per day/month (on the order of 100/day).
> - **Razorpay:** a fee per successful payment (higher for international cards) plus GST on the fee. See `PAYMENTS.md`.
>
> In short: you can build and test for free, but running a real store costs money as it grows. Expect hosting
> and database plans plus payment fees.

---

## 1. Run it on your computer

1. Install **Node.js 20 or newer** (nodejs.org, "LTS") and **Git**.
2. Install **PostgreSQL** locally (postgresql.org), *or* skip it and use your Supabase database from step 2 right away.
3. In a terminal:
   ```bash
   git clone https://github.com/johnbrazius/JohnBraziusEBooks-.git
   cd JohnBraziusEBooks-
   npm install
   cp .env.example .env
   ```
4. Edit `.env`:
   - `DATABASE_URL` and `DIRECT_URL`: your local database, e.g. `postgresql://postgres:password@localhost:5432/wgl`
   - `AUTH_SECRET`: run `openssl rand -base64 48` and paste the result (or any random 48+ character string)
   - leave `STORAGE_DRIVER=local` and `PAYMENT_PROVIDER=mock` for now
5. Create the tables, then load the demo catalogue:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
6. Create your admin account (you'll be asked for a password, typing stays hidden):
   ```bash
   npm run admin:create -- --email you@example.com
   ```
7. Start the site: `npm run dev` → open http://localhost:3000. Admin: http://localhost:3000/admin.

With `PAYMENT_PROVIDER=mock` you can "buy" ebooks through a **simulated** checkout page. No money is involved.

---

## 2. Supabase: database + private storage

1. Create an account at supabase.com → **New project**. Choose a region close to your customers (e.g. Mumbai) and save
   the database password somewhere safe.
2. **Database connection strings:** Project → **Connect** (top bar):
   - **Transaction pooler** (port **6543**) → use as `DATABASE_URL`, appending `?pgbouncer=true&connection_limit=1`
   - **Session pooler** or **Direct connection** (port **5432**) → use as `DIRECT_URL` (used only for migrations)
3. **Create the tables** from your computer, pointing at Supabase:
   ```bash
   DATABASE_URL="<direct url>" DIRECT_URL="<direct url>" npx prisma migrate deploy
   DATABASE_URL="<direct url>" npm run db:seed          # optional demo data
   DATABASE_URL="<direct url>" npm run admin:create -- --email you@example.com
   ```
   (On Windows PowerShell, set variables with `$env:DATABASE_URL="..."` on a separate line first.)
4. **Storage buckets:** Storage → **New bucket**:
   - `covers`: tick **Public bucket** (cover images must be viewable by everyone)
   - `ebooks`: leave **Public** **unticked** (private, holds the paid files)
   You don't need to add any storage policies: the server uses the service-role key, and customers only ever receive
   short-lived signed links.
5. **API keys:** Project Settings → **API**: copy the **Project URL** (`SUPABASE_URL`) and the **service_role** secret
   (`SUPABASE_SERVICE_ROLE_KEY`). 🔒 The service-role key bypasses all security. Put it **only** in server
   environment variables, never in code, never in a variable starting with `NEXT_PUBLIC_`.
6. Set `STORAGE_DRIVER=supabase`.

> If you ran the seed with `STORAGE_DRIVER=local`, the demo PDFs live on your computer, not in Supabase. Run the seed
> with `STORAGE_DRIVER=supabase` and the Supabase variables set (or re-upload files in the admin) so downloads work in production.

---

## 3. Deploy to Vercel

1. Sign in to vercel.com with GitHub → **Add New → Project** → import `JohnBraziusEBooks-`.
2. Framework preset: **Next.js** (auto-detected). Build command stays `npm run build`.
3. **Environment Variables:** add every variable from `.env.example` with your real values:
   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-project>.vercel.app` (update after first deploy if needed) |
   | `DATABASE_URL`, `DIRECT_URL` | from Supabase (step 2) |
   | `AUTH_SECRET` | a **new** random string (don't reuse your local one) |
   | `STORAGE_DRIVER` | `supabase` |
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | from Supabase |
   | `SUPABASE_PUBLIC_BUCKET`, `SUPABASE_PRIVATE_BUCKET` | `covers`, `ebooks` |
   | `PAYMENT_PROVIDER` | leave **empty** until Razorpay is ready (checkout shows "not enabled yet"), or `razorpay` |
   | `PAYMENT_CURRENCIES` | e.g. `INR` (add `USD` only if Razorpay approved international payments) |
   | `RAZORPAY_*` | see `PAYMENTS.md` |
   | `RESEND_API_KEY`, `EMAIL_FROM` | optional, see step 5 |
4. Click **Deploy**. Your store is live at the free `*.vercel.app` address.
5. Sign in at `/admin/login` with the account you created in step 2.3.

**Do not** set `PAYMENT_PROVIDER=mock` + `ALLOW_MOCK_PAYMENTS=true` on a public deployment. Anyone could then
"buy" your ebooks for free.

### Database migrations on later updates
When a future code change adds a migration (a new folder in `prisma/migrations`), apply it before or right after
deploying:
```bash
DATABASE_URL="<supabase direct url>" npx prisma migrate deploy
```

---

## 4. Payments

Follow **[PAYMENTS.md](PAYMENTS.md)**: create a Razorpay account, add test keys, create the webhook at
`https://<your-site>/api/webhooks/razorpay`, test, then switch to live keys once Razorpay activates your account.

---

## 5. Email delivery (optional but recommended)

Without email, customers get their download link on the page right after paying (and can bookmark it), but you'll
have to resend links by hand if they lose it.

1. Create an account at resend.com → **Domains** → add a domain you own and add the DNS records it shows.
   (Resend needs a verified domain to send to customers, so this step waits until you have a custom domain.)
2. **API Keys** → create a key → set `RESEND_API_KEY`.
3. Set `EMAIL_FROM`, e.g. `Website Growth Lab <orders@yourdomain.com>`. Redeploy.

---

## 6. Custom domain (later)

1. Buy a domain from any registrar.
2. Vercel → Project → **Settings → Domains** → add it and follow the DNS instructions (HTTPS is automatic).
3. Update `NEXT_PUBLIC_SITE_URL` to `https://yourdomain.com` and redeploy.
4. Update the **Razorpay webhook URL** (test and live) to the new domain.
5. Submit `https://yourdomain.com/sitemap.xml` in Google Search Console.

---

## 7. Adding a new ebook (day-to-day)

1. **Admin → Products → + New ebook**.
2. Fill in title (the URL slug is generated for you), short and full description, category, and a price in your base
   currency, plus optional market prices such as INR.
3. Upload the **cover** (JPG/PNG/WebP, 3:4) and the **ebook file** (PDF/EPUB/ZIP). Optionally upload a free sample.
4. Add "who it's for", learning outcomes, table of contents, FAQ, tags and SEO fields.
5. **Save draft** → **Preview ↗** to see the product page exactly as customers will.
6. **Save & publish.** If anything required is missing (file, base price, category, descriptions), the product stays a
   draft and you see exactly what to fix.

Bundles: choose **Product type → Bundle**, tick the included ebooks, set a bundle price. Buyers get every included ebook.

Before launch: replace or archive the **demo products** (Admin → Products → "Demo only"), set your support email in
**Settings**, and have the legal pages reviewed (Admin → Pages; untick "Needs review" afterwards).

---

## 8. Backups

- **Supabase** backs up the database daily on paid plans. On the free plan, take your own backups:
  ```bash
  DATABASE_URL="<supabase direct url>" npm run backup:export      # JSON export into ./backups (git-ignored)
  pg_dump "<supabase direct url>" > backups/db-$(date +%F).sql     # full SQL dump (needs PostgreSQL tools)
  ```
- **Ebook files:** keep your original files on your computer or cloud drive. You can also download the `ebooks`
  bucket from the Supabase dashboard.
- Backup files contain customer emails. Store them securely and **never commit them to GitHub**.
- Order and subscriber CSVs are also available from **Admin → Orders → Export CSV** and **Admin → Newsletter**.

## 9. Monitoring usage

- **Vercel:** Project → **Usage** (bandwidth, function invocations) and **Logs** (errors, webhook failures).
- **Supabase:** Project → **Reports / Usage** (database size, storage, egress).
- **Razorpay:** Dashboard → Transactions, Settlements, and Webhooks → delivery logs (failed webhooks are retried).
- **Admin → Orders:** any order stuck in "pending" with a captured payment usually means a webhook problem. Check
  the webhook URL and secret.

---

## 10. Troubleshooting

**The site shows "The store can't load right now"** → open `https://<your-site>/api/health`. It lists each setting
with ✓/✗ and a plain-language fix (it never shows secret values). The most common causes on a first deploy:

| `/api/health` says | Fix |
|---|---|
| `DATABASE_URL` / `AUTH_SECRET` missing | Add it in Vercel → Settings → Environment Variables, then **Redeploy** (variables only apply to new deployments) |
| Database connection: wrong username or password / unreachable | Copy the string again from Supabase → Connect; replace `[YOUR-PASSWORD]` with your real database password; un-pause the project |
| Database tables: not created yet | Run `npx prisma migrate deploy` from your computer with `DATABASE_URL` and `DIRECT_URL` set to the Supabase **direct** connection (section 2.3) |
| Catalogue: 0 published | Run `npm run db:seed` against Supabase, or add products in `/admin` |
| Admin account: none yet | Run `npm run admin:create -- --email you@example.com` against Supabase |

For the exact error, open Vercel → Project → **Logs**, then filter by the error reference shown on the error page.
