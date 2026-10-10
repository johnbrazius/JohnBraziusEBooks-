/**
 * Create or reset an administrator account. Run locally against your production DATABASE_URL:
 *
 *   npm run admin:create -- --email you@example.com
 *
 * You will be prompted for the password (input is hidden). Passwords are stored only as bcrypt hashes.
 * For non-interactive use you may set ADMIN_PASSWORD in the environment for a single run.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "readline";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    let muted = false;
    out._writeToOutput = (s: string) => {
      if (!muted || s.includes(question)) out.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

function strength(p: string): string | null {
  if (p.length < 12) return "Password must be at least 12 characters.";
  if (!/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/\d/.test(p)) return "Password must include upper-case, lower-case letters and a number.";
  return null;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Usage: npm run admin:create -- --email you@example.com [--name \"Your Name\"]");
    process.exit(1);
  }
  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    password = await promptHidden("Password (min 12 chars, upper/lower/number): ");
    const again = await promptHidden("Repeat password: ");
    if (password !== again) {
      console.error("Passwords do not match.");
      process.exit(1);
    }
  }
  const problem = strength(password);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  const db = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.adminUser.upsert({
    where: { email },
    update: { passwordHash, failedLoginCount: 0, lockedUntil: null, sessionVersion: { increment: 1 } },
    create: { email, passwordHash, name: arg("name") ?? null },
  });
  console.log(`Admin account ready: ${user.email}. Sign in at /admin/login`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
