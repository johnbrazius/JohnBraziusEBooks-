import { describe, expect, it } from "vitest";
import { buildQuote, chooseChargeCurrency, displayPrice, evaluateDiscount, unitPrice, type DiscountRule, type PricedProduct } from "@/lib/pricing";

const now = new Date("2026-06-01T12:00:00Z");
const book = (id: string, prices: PricedProduct["prices"], sale: Partial<PricedProduct> = {}): PricedProduct => ({
  id, title: id, prices, saleStartsAt: null, saleEndsAt: null, ...sale,
});
const playbook = book("a", [{ currency: "USD", amount: 1000, saleAmount: null }, { currency: "INR", amount: 49900, saleAmount: null }]);
const usdOnly = book("b", [{ currency: "USD", amount: 900, saleAmount: 700 }]);

const rule = (r: Partial<DiscountRule>): DiscountRule => ({
  id: "d", code: "CODE", type: "PERCENT", percentOff: 20, amountOff: null, currency: null, minSubtotal: null,
  startsAt: null, endsAt: null, maxRedemptions: null, redemptionCount: 0, active: true, appliesToAll: true, productIds: [], ...r,
});

describe("unitPrice", () => {
  it("returns the fixed price for a currency", () => {
    expect(unitPrice(playbook, "INR", now)).toEqual({ currency: "INR", amount: 49900, regularAmount: 49900, onSale: false });
  });
  it("returns null when no price exists for the currency", () => {
    expect(unitPrice(usdOnly, "INR", now)).toBeNull();
  });
  it("applies a sale price only inside the sale window", () => {
    const scheduled = { ...usdOnly, saleStartsAt: new Date("2026-07-01"), saleEndsAt: null };
    expect(unitPrice(scheduled, "USD", now)!.amount).toBe(900);
    const active = { ...usdOnly, saleStartsAt: new Date("2026-05-01"), saleEndsAt: new Date("2026-06-30") };
    expect(unitPrice(active, "USD", now)).toMatchObject({ amount: 700, onSale: true, regularAmount: 900 });
    const ended = { ...usdOnly, saleEndsAt: new Date("2026-05-31") };
    expect(unitPrice(ended, "USD", now)!.onSale).toBe(false);
  });
});

describe("displayPrice", () => {
  it("prefers a fixed market price", () => {
    expect(displayPrice(playbook, "INR", "USD", { INR: 83 }, now)).toMatchObject({ kind: "fixed", price: { currency: "INR", amount: 49900 } });
  });
  it("falls back to base currency with a labelled estimate", () => {
    const dp = displayPrice(usdOnly, "INR", "USD", { INR: 83 }, now);
    expect(dp).toMatchObject({ kind: "base", price: { currency: "USD", amount: 700 }, estimate: { currency: "INR", amount: 58100 } });
  });
  it("shows no estimate without a configured rate", () => {
    expect(displayPrice(usdOnly, "INR", "USD", {}, now)).toMatchObject({ kind: "base", estimate: null });
  });
});

describe("chooseChargeCurrency", () => {
  it("uses the visitor currency when every item has a fixed price and it is chargeable", () => {
    expect(chooseChargeCurrency([playbook], "INR", "USD", ["USD", "INR"])).toBe("INR");
  });
  it("falls back to base when an item lacks a price in the preferred currency", () => {
    expect(chooseChargeCurrency([playbook, usdOnly], "INR", "USD", ["USD", "INR"])).toBe("USD");
  });
  it("never picks a currency the payment account cannot charge", () => {
    expect(chooseChargeCurrency([playbook], "INR", "USD", ["USD"])).toBe("USD");
    expect(chooseChargeCurrency([playbook], "USD", "USD", ["INR"])).toBeNull();
  });
});

describe("discounts", () => {
  const lines = [{ productId: "a", title: "a", unitAmount: 1000, regularAmount: 1000, onSale: false }, { productId: "b", title: "b", unitAmount: 900, regularAmount: 900, onSale: false }];
  const ctx = { currency: "USD", lines, subtotal: 1900, now };

  it("computes percentage discounts on eligible items", () => {
    expect(evaluateDiscount(rule({}), ctx)).toEqual({ ok: true, amount: 380 });
    expect(evaluateDiscount(rule({ appliesToAll: false, productIds: ["b"] }), ctx)).toEqual({ ok: true, amount: 180 });
  });
  it("caps fixed discounts at the eligible subtotal and requires matching currency", () => {
    expect(evaluateDiscount(rule({ type: "FIXED", amountOff: 5000, currency: "USD" }), ctx)).toEqual({ ok: true, amount: 1900 });
    expect(evaluateDiscount(rule({ type: "FIXED", amountOff: 200, currency: "INR" }), ctx).ok).toBe(false);
  });
  it("rejects inactive, expired, not-yet-valid, exhausted and below-minimum codes", () => {
    expect(evaluateDiscount(rule({ active: false }), ctx).ok).toBe(false);
    expect(evaluateDiscount(rule({ endsAt: new Date("2026-01-01") }), ctx).ok).toBe(false);
    expect(evaluateDiscount(rule({ startsAt: new Date("2027-01-01") }), ctx).ok).toBe(false);
    expect(evaluateDiscount(rule({ maxRedemptions: 3, redemptionCount: 3 }), ctx).ok).toBe(false);
    expect(evaluateDiscount(rule({ currency: "USD", minSubtotal: 5000 }), ctx).ok).toBe(false);
  });
  it("buildQuote totals correctly and reports discount errors without applying them", () => {
    const q = buildQuote([playbook, usdOnly], "USD", rule({ percentOff: 10 }), now);
    expect(q).toMatchObject({ subtotal: 1700, discountAmount: 170, total: 1530 });
    const bad = buildQuote([playbook], "USD", rule({ active: false }), now);
    expect(bad).toMatchObject({ total: 1000, discountAmount: 0, discount: null });
    expect(bad.discountError).toBeTruthy();
  });
});
