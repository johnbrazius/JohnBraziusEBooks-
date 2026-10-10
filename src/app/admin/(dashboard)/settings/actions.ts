"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings, storeSettingsSchema } from "@/lib/settings";

export type SettingsState = { ok?: boolean; error?: string; message?: string };

function parseMap(text: string, valueRe: RegExp, keyRe: RegExp): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const [k, v] = line.split("=").map((s) => s?.trim().toUpperCase());
    if (!k || !v || !keyRe.test(k) || !valueRe.test(v)) return null;
    out[k] = v;
  }
  return out;
}

export async function saveSettingsAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const current = await getSettings();
  const s = (k: string) => String(form.get(k) ?? "").trim();

  const countryCurrency = parseMap(s("countryCurrency"), /^[A-Z]{3}$/, /^[A-Z]{2}$/);
  if (!countryCurrency) return { error: "Country currencies: use one line per country, e.g. IN=INR" };
  const ratesRaw = parseMap(s("indicativeRates"), /^\d+(\.\d+)?$/, /^[A-Z]{3}$/);
  if (!ratesRaw) return { error: "Indicative rates: use one line per currency, e.g. INR=83.25" };
  const indicativeRates = Object.fromEntries(Object.entries(ratesRaw).map(([k, v]) => [k, Number(v)]));
  const ratesChanged = JSON.stringify(indicativeRates) !== JSON.stringify(current.indicativeRates);

  const displayCurrencies = [...new Set(s("displayCurrencies").toUpperCase().split(/[\s,]+/).filter(Boolean))];
  const baseCurrency = s("baseCurrency").toUpperCase();
  if (!displayCurrencies.includes(baseCurrency)) displayCurrencies.unshift(baseCurrency);

  const parsed = storeSettingsSchema.safeParse({
    storeName: s("storeName"),
    tagline: s("tagline"),
    supportEmail: s("supportEmail"),
    baseCurrency,
    displayCurrencies,
    countryCurrency,
    indicativeRates,
    indicativeRatesUpdatedAt: ratesChanged ? new Date().toISOString() : current.indicativeRatesUpdatedAt,
    banner: { enabled: form.get("bannerEnabled") === "on", text: s("bannerText"), linkUrl: s("bannerLinkUrl"), linkLabel: s("bannerLinkLabel") },
    social: { twitter: s("twitter"), linkedin: s("linkedin"), youtube: s("youtube"), instagram: s("instagram"), facebook: s("facebook") },
    newsletterEnabled: form.get("newsletterEnabled") === "on",
    bestsellerMinOrders: Number(s("bestsellerMinOrders") || 5),
  });
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { error: `${i.path.join(".")}: ${i.message}` };
  }
  for (const url of [parsed.data.banner.linkUrl, ...Object.values(parsed.data.social)]) {
    if (url && !/^(https:\/\/|\/)/.test(url)) return { error: `Links must start with https:// or / (got “${url}”).` };
  }
  await saveSettings(parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}
