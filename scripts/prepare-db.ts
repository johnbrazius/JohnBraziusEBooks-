/**
 * Runs during `npm run build` (e.g. on Vercel) so a beginner never has to run database commands by hand:
 *   1. applies database migrations (creates/updates tables),
 *   2. loads starter settings, categories and pages (never overwrites your edits),
 *   3. adds DEMO ebooks only if the store has no products yet AND Supabase Storage is configured,
 *   4. creates the first admin from ADMIN_EMAIL + ADMIN_PASSWORD if that admin doesn't exist yet.
 *
 * It never fails the build: problems are printed clearly and also shown at /api/health on the live site.
 * Set SKIP_DB_SETUP=true to turn it off.
 */
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedDatabase } from "../prisma/seed";

const line = "=".repeat(72);
const warn = (msg: string) => console.warn(`\n${line}\n⚠️  DATABASE SETUP: ${msg}\n${line}\n`);

async function main() {
  if (process.env.SKIP_DB_SETUP === "true") return console.log("[prepare-db] SKIP_DB_SETUP=true — skipping.");
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return warn("DATABASE_URL is not set, so the store has no database and pages will show an error.\nAdd DATABASE_URL and DIRECT_URL in Vercel → Settings → Environment Variables, then redeploy.");
  }
  if (databaseUrl.includes("[YOUR-PASSWORD]")) {
    return warn("DATABASE_URL still contains [YOUR-PASSWORD]. Replace it with your Supabase database password, then redeploy.");
  }
  // Migrations need a session connection; fall back to DATABASE_URL if DIRECT_URL wasn't provided.
  const directUrl = process.env.DIRECT_URL?.trim() || databaseUrl;

  console.log("[prepare-db] Applying database migrations…");
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DIRECT_URL: directUrl } });
  } catch {
    return warn(
      "Could not create/update the database tables.\nCheck DATABASE_URL / DIRECT_URL (use Supabase's *pooler* connection strings, not db.<project>.supabase.co),\nthe password, and that the Supabase project isn't paused. Then redeploy. /api/health shows details.",
    );
  }

  const db = new PrismaClient({ datasources: { db: { url: directUrl } } });
  try {
    const storageReady =
      process.env.STORAGE_DRIVER === "supabase" && Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    const wantDemo = process.env.SEED_DEMO_PRODUCTS !== "false" && storageReady && (await db.product.count()) === 0;
    console.log(`[prepare-db] Loading starter content${wantDemo ? " + demo ebooks" : ""}…`);
    await seedDatabase(db, { demoProducts: wantDemo });
    if (!storageReady && (await db.product.count()) === 0) {
      console.log("[prepare-db] Demo ebooks skipped: set STORAGE_DRIVER=supabase + Supabase keys to include them (their files need real storage).");
    }

    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? "";
    if (email && password) {
      const exists = await db.adminUser.findUnique({ where: { email } });
      if (exists) {
        console.log(`[prepare-db] Admin ${email} already exists — left unchanged. You can now delete ADMIN_PASSWORD from Vercel.`);
      } else if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        warn("ADMIN_PASSWORD is too weak (needs 12+ characters with upper-case, lower-case and a number). Admin not created.");
      } else {
        await db.adminUser.create({ data: { email, passwordHash: await bcrypt.hash(password, 12) } });
        console.log(`[prepare-db] Created admin ${email}. Sign in at /admin/login, then delete ADMIN_PASSWORD from Vercel.`);
      }
    } else if ((await db.adminUser.count()) === 0) {
      console.log("[prepare-db] No admin yet. Set ADMIN_EMAIL and ADMIN_PASSWORD in Vercel and redeploy to create one.");
    }
    console.log("[prepare-db] Database ready.");
  } catch (err) {
    warn(`Starter content could not be loaded: ${(err as Error).message.split("\n").slice(-1)[0]}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => warn(`Unexpected error: ${(err as Error).message}`));
