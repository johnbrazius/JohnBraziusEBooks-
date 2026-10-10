import "server-only";
import { getSettings } from "./settings";
import { visitorCurrency } from "./currency";
import type { PriceContext } from "@/components/store/Price";

export async function priceContext(): Promise<PriceContext> {
  const [s, currency] = await Promise.all([getSettings(), visitorCurrency()]);
  return { currency, baseCurrency: s.baseCurrency, rates: s.indicativeRates };
}
