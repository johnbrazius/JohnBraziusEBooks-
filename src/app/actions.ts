"use server";

import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { CURRENCY_COOKIE } from "@/lib/currency";
import { emailSchema } from "@/lib/validation";
import { randomToken } from "@/lib/crypto";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { resendOrderLink } from "@/lib/orders";
import { emailConfigured } from "@/lib/email";
import { NEWSLETTER_CONSENT } from "@/lib/constants";

export async function setCurrency(currency: string) {
  const settings = await getSettings();
  const c = currency.toUpperCase();
  if (!settings.displayCurrencies.includes(c)) return;
  (await cookies()).set(CURRENCY_COOKIE, c, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export type FormState = { ok?: boolean; message?: string; error?: string };

export async function subscribeNewsletter(_prev: FormState, form: FormData): Promise<FormState> {
  const settings = await getSettings();
  if (!settings.newsletterEnabled) return { error: "The newsletter is not available right now." };
  if (form.get("website")) return { ok: true, message: "Thanks!" }; // honeypot field filled = bot
  if (form.get("consent") !== "on") return { error: "Please tick the consent box to subscribe." };
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!(await rateLimit(`newsletter:${clientIp(await headers())}`, 5, 3600))) {
    return { error: "Too many attempts. Please try again later." };
  }

  await db.newsletterSubscriber.upsert({
    where: { email: parsed.data },
    update: { status: "SUBSCRIBED", consentText: NEWSLETTER_CONSENT, consentAt: new Date() },
    create: {
      email: parsed.data,
      consentText: NEWSLETTER_CONSENT,
      consentAt: new Date(),
      unsubscribeToken: randomToken(24),
      source: String(form.get("source") ?? "site").slice(0, 40),
    },
  });
  // Same message whether or not the address already existed (no list enumeration).
  return { ok: true, message: "Thanks for subscribing! You can unsubscribe at any time." };
}

export async function lookupOrder(_prev: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get("email"));
  const reference = String(form.get("reference") ?? "").trim().toUpperCase();
  if (!email.success || !/^WGL-[A-Z0-9]{8}$/.test(reference)) return { error: "Enter your email and order reference (e.g. WGL-AB12CD34)." };
  if (!(await rateLimit(`lookup:${clientIp(await headers())}`, 5, 3600))) return { error: "Too many attempts. Please try again later." };
  if (!emailConfigured()) {
    return { error: "Automatic email is not set up yet. Please contact support with your order reference and we will help." };
  }
  await resendOrderLink(reference, email.data);
  return { ok: true, message: "If that order exists and is paid, we've emailed the download link to that address." };
}
