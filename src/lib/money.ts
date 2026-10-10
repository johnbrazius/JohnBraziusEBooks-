/** Currencies whose minor unit is the major unit (no decimals). */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "UGX", "XAF", "XOF"]);

export const COMMON_CURRENCIES = ["USD", "INR", "EUR", "GBP", "AUD", "CAD", "SGD", "AED"] as const;

export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

/** "10.50" → 1050 (minor units). Returns null for invalid input. */
export function toMinor(input: string | number, currency: string): number | null {
  const s = String(input).trim().replace(/,/g, "");
  const decimals = currencyDecimals(currency);
  const re = decimals === 0 ? /^\d+$/ : /^\d+(\.\d{1,2})?$/;
  if (!re.test(s)) return null;
  const value = Math.round(Number(s) * 10 ** decimals);
  return Number.isSafeInteger(value) ? value : null;
}

/** 1050 → "10.50" for form inputs. */
export function fromMinor(amount: number, currency: string): string {
  const decimals = currencyDecimals(currency);
  return (amount / 10 ** decimals).toFixed(decimals);
}

export function formatMoney(amount: number, currency: string, locale?: string): string {
  const decimals = currencyDecimals(currency);
  const loc = locale ?? (currency === "INR" ? "en-IN" : "en-US");
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency,
      minimumFractionDigits: amount % 10 ** decimals === 0 ? 0 : decimals,
      maximumFractionDigits: decimals,
    }).format(amount / 10 ** decimals);
  } catch {
    return `${currency} ${fromMinor(amount, currency)}`;
  }
}
