import { execSync } from "child_process";

/** Integration tests run against a dedicated database which is reset before every run. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://wgl:wgl@localhost:5432/wgl_test";
  if (!/test/.test(url)) throw new Error("Refusing to reset a database whose URL does not contain 'test'");
  execSync("npx prisma migrate reset --force --skip-seed --skip-generate", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes" },
  });
}
