/**
 * Central, server-only access to environment configuration.
 * Secrets are read lazily so that a missing optional integration never breaks unrelated pages.
 */

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export function required(name: string): string {
  const v = optional(name);
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const env = {
  siteUrl: () => (optional("NEXT_PUBLIC_SITE_URL") ?? (optional("VERCEL_URL") ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, ""),
  authSecret: () => {
    const s = required("AUTH_SECRET");
    if (s.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters long");
    return s;
  },
  storageDriver: (): "local" | "supabase" => (optional("STORAGE_DRIVER") === "supabase" ? "supabase" : "local"),
  supabaseUrl: () => optional("SUPABASE_URL"),
  supabaseServiceRoleKey: () => optional("SUPABASE_SERVICE_ROLE_KEY"),
  supabasePublicBucket: () => optional("SUPABASE_PUBLIC_BUCKET") ?? "covers",
  supabasePrivateBucket: () => optional("SUPABASE_PRIVATE_BUCKET") ?? "ebooks",
  paymentProvider: (): "razorpay" | "mock" | "none" => {
    const p = optional("PAYMENT_PROVIDER");
    if (p === "razorpay" || p === "mock") return p;
    return "none";
  },
  /** Mock payments unlock downloads without money changing hands, so they are opt-in and loudly flagged. */
  mockPaymentsAllowed: () =>
    optional("PAYMENT_PROVIDER") === "mock" &&
    (process.env.NODE_ENV !== "production" || optional("ALLOW_MOCK_PAYMENTS") === "true"),
  /** Currencies the configured payment account can actually charge. Prices in other currencies are display-only. */
  paymentCurrencies: () =>
    (optional("PAYMENT_CURRENCIES") ?? "INR")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{3}$/.test(c)),
  razorpayKeyId: () => optional("RAZORPAY_KEY_ID"),
  razorpayKeySecret: () => optional("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: () => optional("RAZORPAY_WEBHOOK_SECRET"),
  resendApiKey: () => optional("RESEND_API_KEY"),
  emailFrom: () => optional("EMAIL_FROM"),
  downloadMaxCount: () => Number(optional("DOWNLOAD_MAX_COUNT") ?? 10),
  downloadExpiryDays: () => Number(optional("DOWNLOAD_EXPIRY_DAYS") ?? 0), // 0 = no expiry
  isProduction: () => process.env.NODE_ENV === "production",
};
