import "server-only";
import { cookies, headers } from "next/headers";
import { getSettings } from "./settings";

export const CURRENCY_COOKIE = "wgl_currency";

/**
 * The currency a visitor sees prices in: their explicit choice (cookie), else a country-based default
 * (Vercel's x-vercel-ip-country header), else the store's base currency.
 */
export async function visitorCurrency(): Promise<string> {
  const settings = await getSettings();
  const chosen = (await cookies()).get(CURRENCY_COOKIE)?.value?.toUpperCase();
  if (chosen && settings.displayCurrencies.includes(chosen)) return chosen;
  const country = (await headers()).get("x-vercel-ip-country")?.toUpperCase();
  const byCountry = country ? settings.countryCurrency[country] : undefined;
  if (byCountry && settings.displayCurrencies.includes(byCountry)) return byCountry;
  return settings.baseCurrency;
}
