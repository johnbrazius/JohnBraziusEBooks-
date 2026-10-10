/**
 * Pure pricing logic. Every amount the customer is charged is computed here on the server from
 * database values — never from numbers sent by the browser.
 */

export type PriceRow = { currency: string; amount: number; saleAmount: number | null };

export type PricedProduct = {
  id: string;
  title: string;
  type?: "EBOOK" | "BUNDLE";
  prices: PriceRow[];
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
};

export type UnitPrice = { currency: string; amount: number; regularAmount: number; onSale: boolean };

/** Smallest chargeable total (in minor units) we allow for a paid order. Providers reject tiny amounts. */
export const MIN_CHARGE_MINOR = 100;

export function isSaleActive(p: Pick<PricedProduct, "saleStartsAt" | "saleEndsAt">, now: Date): boolean {
  if (p.saleStartsAt && now < p.saleStartsAt) return false;
  if (p.saleEndsAt && now > p.saleEndsAt) return false;
  // A sale with no window at all is "always on" only if the admin set a sale price; callers check that.
  return true;
}

export function unitPrice(p: PricedProduct, currency: string, now: Date): UnitPrice | null {
  const row = p.prices.find((r) => r.currency === currency);
  if (!row) return null;
  const onSale = row.saleAmount != null && row.saleAmount < row.amount && isSaleActive(p, now);
  return { currency, amount: onSale ? row.saleAmount! : row.amount, regularAmount: row.amount, onSale };
}

export type DisplayPrice =
  | { kind: "fixed"; price: UnitPrice }
  | { kind: "base"; price: UnitPrice; estimate: { currency: string; amount: number } | null };

/**
 * What to show a visitor who prefers `visitorCurrency`:
 *  - a fixed market price if the admin configured one, otherwise
 *  - the base-currency price, plus an optional clearly-labelled estimate using an admin-entered rate.
 */
export function displayPrice(
  p: PricedProduct,
  visitorCurrency: string,
  baseCurrency: string,
  indicativeRates: Record<string, number>,
  now: Date,
): DisplayPrice | null {
  const fixed = unitPrice(p, visitorCurrency, now);
  if (fixed) return { kind: "fixed", price: fixed };
  const base = unitPrice(p, baseCurrency, now);
  if (!base) return null;
  const rate = indicativeRates[visitorCurrency];
  const estimate =
    rate && visitorCurrency !== baseCurrency
      ? { currency: visitorCurrency, amount: convertMinor(base.amount, baseCurrency, visitorCurrency, rate) }
      : null;
  return { kind: "base", price: base, estimate };
}

function decimals(c: string) {
  return ["JPY", "KRW", "VND", "CLP", "ISK", "UGX", "XAF", "XOF"].includes(c) ? 0 : 2;
}

export function convertMinor(amount: number, from: string, to: string, rate: number): number {
  const major = amount / 10 ** decimals(from);
  return Math.round(major * rate * 10 ** decimals(to));
}

/**
 * Pick the single currency a cart will be charged in: the visitor's preferred currency when every item has a
 * fixed price in it and the payment account can charge it; otherwise the store's base currency.
 */
export function chooseChargeCurrency(
  products: PricedProduct[],
  preferred: string,
  baseCurrency: string,
  chargeable: string[],
): string | null {
  const allHave = (c: string) => products.every((p) => p.prices.some((r) => r.currency === c));
  if (chargeable.includes(preferred) && allHave(preferred)) return preferred;
  if (chargeable.includes(baseCurrency) && allHave(baseCurrency)) return baseCurrency;
  return null;
}

export type DiscountRule = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  minSubtotal: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  active: boolean;
  appliesToAll: boolean;
  productIds: string[];
};

export type QuoteLine = { productId: string; title: string; unitAmount: number; regularAmount: number; onSale: boolean };

export type Quote = {
  currency: string;
  lines: QuoteLine[];
  subtotal: number;
  discountAmount: number;
  total: number;
  discount: { id: string; code: string } | null;
  discountError: string | null;
};

export function evaluateDiscount(
  rule: DiscountRule,
  ctx: { currency: string; lines: QuoteLine[]; subtotal: number; now: Date },
): { ok: true; amount: number } | { ok: false; reason: string } {
  if (!rule.active) return { ok: false, reason: "This code is not active." };
  if (rule.startsAt && ctx.now < rule.startsAt) return { ok: false, reason: "This code is not valid yet." };
  if (rule.endsAt && ctx.now > rule.endsAt) return { ok: false, reason: "This code has expired." };
  if (rule.maxRedemptions != null && rule.redemptionCount >= rule.maxRedemptions)
    return { ok: false, reason: "This code has reached its usage limit." };
  if (rule.currency && rule.currency !== ctx.currency)
    return { ok: false, reason: `This code only applies to purchases charged in ${rule.currency}.` };
  if (rule.minSubtotal != null && ctx.subtotal < rule.minSubtotal)
    return { ok: false, reason: "Your order does not meet this code's minimum amount." };

  const eligible = rule.appliesToAll ? ctx.lines : ctx.lines.filter((l) => rule.productIds.includes(l.productId));
  const eligibleSubtotal = eligible.reduce((s, l) => s + l.unitAmount, 0);
  if (eligibleSubtotal <= 0) return { ok: false, reason: "This code does not apply to the items in your cart." };

  let amount = 0;
  if (rule.type === "PERCENT") {
    const pct = Math.min(Math.max(rule.percentOff ?? 0, 0), 100);
    amount = Math.floor((eligibleSubtotal * pct) / 100);
  } else {
    if (!rule.currency || rule.amountOff == null) return { ok: false, reason: "This code is misconfigured." };
    amount = Math.min(rule.amountOff, eligibleSubtotal);
  }
  if (amount <= 0) return { ok: false, reason: "This code does not reduce your total." };
  return { ok: true, amount };
}

export function buildQuote(
  products: PricedProduct[],
  currency: string,
  rule: DiscountRule | null,
  now: Date,
): Quote {
  const lines: QuoteLine[] = products.map((p) => {
    const u = unitPrice(p, currency, now);
    if (!u) throw new Error(`Product ${p.id} has no price in ${currency}`);
    return { productId: p.id, title: p.title, unitAmount: u.amount, regularAmount: u.regularAmount, onSale: u.onSale };
  });
  const subtotal = lines.reduce((s, l) => s + l.unitAmount, 0);
  let discountAmount = 0;
  let discount: Quote["discount"] = null;
  let discountError: string | null = null;
  if (rule) {
    const r = evaluateDiscount(rule, { currency, lines, subtotal, now });
    if (r.ok) {
      discountAmount = r.amount;
      discount = { id: rule.id, code: rule.code };
    } else {
      discountError = r.reason;
    }
  }
  return { currency, lines, subtotal, discountAmount, total: subtotal - discountAmount, discount, discountError };
}
