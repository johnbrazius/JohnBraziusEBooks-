import "server-only";
import { db } from "./db";
import { env } from "./env";
import { activeProvider } from "./payments";

export type Check = { name: string; ok: boolean; detail: string; fix?: string };

const set = (name: string) => Boolean(process.env[name]?.trim());

/** Explains configuration problems in plain language. Never includes secret values. */
export async function runHealthChecks(): Promise<{ ok: boolean; checks: Check[] }> {
  const checks: Check[] = [];

  checks.push({
    name: "DATABASE_URL",
    ok: set("DATABASE_URL"),
    detail: set("DATABASE_URL") ? "Set" : "Missing",
    fix: "Add DATABASE_URL (Supabase → Connect → Transaction pooler, port 6543, ending in ?pgbouncer=true&connection_limit=1) in Vercel → Settings → Environment Variables, then redeploy.",
  });
  checks.push({
    name: "DIRECT_URL",
    ok: set("DIRECT_URL"),
    detail: set("DIRECT_URL") ? "Set" : "Missing",
    fix: "Add DIRECT_URL (Supabase → Connect → Session pooler or Direct connection, port 5432) in Vercel, then redeploy.",
  });
  const secretOk = (process.env.AUTH_SECRET?.trim().length ?? 0) >= 32;
  checks.push({
    name: "AUTH_SECRET",
    ok: secretOk,
    detail: secretOk ? "Set" : set("AUTH_SECRET") ? "Too short (needs 32+ characters)" : "Missing",
    fix: "Add AUTH_SECRET: a random string of at least 32 characters (e.g. from `openssl rand -base64 48`), then redeploy.",
  });
  checks.push({
    name: "NEXT_PUBLIC_SITE_URL",
    ok: set("NEXT_PUBLIC_SITE_URL"),
    detail: set("NEXT_PUBLIC_SITE_URL") ? env.siteUrl() : `Not set (using ${env.siteUrl()})`,
    fix: "Set NEXT_PUBLIC_SITE_URL to your site address, e.g. https://your-project.vercel.app, then redeploy.",
  });

  // Common Supabase misconfigurations that make pages hang or fail on Vercel.
  for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const raw = process.env[name];
    if (!raw) continue;
    let url: URL | null = null;
    try {
      url = new URL(raw);
    } catch {
      checks.push({ name: `${name} format`, ok: false, detail: "Not a valid connection string", fix: "Paste the full postgresql://… string from Supabase → Connect. If your password contains special characters like @ # / ?, reset it to letters and numbers only." });
      continue;
    }
    if (/^db\..+\.supabase\.co$/.test(url.hostname)) {
      checks.push({
        name: `${name} host`,
        ok: false,
        detail: "Uses Supabase's Direct connection host (IPv6-only); Vercel can't reach it",
        fix: name === "DATABASE_URL"
          ? "Use the Transaction pooler string (port 6543, host *.pooler.supabase.com) with ?pgbouncer=true&connection_limit=1, then redeploy."
          : "Use the Session pooler string (port 5432, host *.pooler.supabase.com), then redeploy.",
      });
    }
    if (raw.includes("[YOUR-PASSWORD]")) {
      checks.push({ name: `${name} password`, ok: false, detail: "Still contains the [YOUR-PASSWORD] placeholder", fix: "Replace [YOUR-PASSWORD] with your actual Supabase database password, then redeploy." });
    }
    if (name === "DATABASE_URL" && url.port === "6543" && url.searchParams.get("pgbouncer") !== "true") {
      checks.push({ name: "DATABASE_URL pooler flag", ok: false, detail: "Transaction pooler used without ?pgbouncer=true", fix: "Add ?pgbouncer=true&connection_limit=1 to the end of DATABASE_URL, then redeploy." });
    }
  }

  let dbOk = false;
  if (set("DATABASE_URL")) {
    try {
      // Fail fast instead of hanging until the serverless function times out.
      await Promise.race([
        db.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timed out after 8s")), 8000)),
      ]);
      dbOk = true;
      checks.push({ name: "Database connection", ok: true, detail: "Connected" });
    } catch (err) {
      const msg = (err as Error).message;
      const reason = /authentication failed|password/i.test(msg)
        ? "Wrong username or password in DATABASE_URL"
        : /can't reach|ENOTFOUND|ECONNREFUSED|timed out/i.test(msg)
          ? "Database server unreachable (wrong host/port, or Supabase project paused)"
          : /prepared statement/i.test(msg)
            ? "Pooler needs ?pgbouncer=true added to DATABASE_URL"
            : "Could not connect";
      checks.push({
        name: "Database connection",
        ok: false,
        detail: reason,
        fix: "Copy the connection string again from Supabase → Connect, check the password, and make sure the project isn't paused. Then redeploy.",
      });
    }
  }

  if (dbOk) {
    try {
      const [products, published, categories, admins, pages] = await Promise.all([
        db.product.count(),
        db.product.count({ where: { status: "PUBLISHED" } }),
        db.category.count(),
        db.adminUser.count(),
        db.page.count(),
      ]);
      checks.push({ name: "Database tables", ok: true, detail: "Created" });
      checks.push({
        name: "Catalogue",
        ok: published > 0,
        detail: `${published} published of ${products} products, ${categories} categories, ${pages} pages`,
        fix: "Load demo data (npm run db:seed with DATABASE_URL pointing at Supabase) or add products in /admin.",
      });
      checks.push({
        name: "Admin account",
        ok: admins > 0,
        detail: admins > 0 ? `${admins} admin(s)` : "None yet",
        fix: "Run on your computer: DATABASE_URL=\"<supabase direct url>\" npm run admin:create -- --email you@example.com",
      });
    } catch (err) {
      const missing = /does not exist/i.test((err as Error).message);
      checks.push({
        name: "Database tables",
        ok: false,
        detail: missing ? "Not created yet" : "Could not read tables",
        fix: "Create the tables from your computer: DATABASE_URL=\"<supabase direct url>\" DIRECT_URL=\"<supabase direct url>\" npx prisma migrate deploy",
      });
    }
  }

  const storageOk = env.storageDriver() === "supabase" ? set("SUPABASE_URL") && set("SUPABASE_SERVICE_ROLE_KEY") : !process.env.VERCEL;
  checks.push({
    name: "File storage",
    ok: storageOk,
    detail: env.storageDriver() === "supabase" ? (storageOk ? "Supabase configured" : "Supabase selected but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing") : "Local disk (only works on your computer, not on Vercel)",
    fix: "Set STORAGE_DRIVER=supabase plus SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and create the 'covers' (public) and 'ebooks' (private) buckets.",
  });

  const provider = activeProvider();
  checks.push({
    name: "Payments",
    ok: Boolean(provider?.ready),
    detail: provider ? `${provider.id}${provider.testMode ? " (test mode)" : ""}${provider.ready ? "" : `: ${provider.problem}`}` : "Not configured (checkout disabled; store can still be browsed)",
    fix: "Optional for now. See docs/PAYMENTS.md to set up Razorpay.",
  });

  const critical = ["DATABASE_URL", "AUTH_SECRET", "Database connection", "Database tables", "DATABASE_URL host", "DATABASE_URL password", "DATABASE_URL format", "DATABASE_URL pooler flag"];
  const ok = checks.filter((c) => critical.includes(c.name)).every((c) => c.ok) && checks.some((c) => c.name === "Database tables");
  return { ok, checks: checks.map((c) => (c.ok ? { name: c.name, ok: c.ok, detail: c.detail } : c)) };
}
