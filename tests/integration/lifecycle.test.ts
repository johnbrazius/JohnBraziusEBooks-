import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { searchCatalog, productBySlug } from "@/lib/catalog";
import { applyRefund, markOrderFailed, markOrderPaid, orderAccessToken, quoteCart, startCheckout, verifyOrderAccess } from "@/lib/orders";

async function makeEbook(slug: string, prices: { currency: string; amount: number }[], status: "DRAFT" | "PUBLISHED" = "PUBLISHED") {
  const cat = await db.category.upsert({ where: { slug: "test-cat" }, update: {}, create: { slug: "test-cat", name: "Test" } });
  return db.product.create({
    data: {
      slug, title: `Book ${slug}`, status, categoryId: cat.id, shortDescription: "short", description: "long",
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      prices: { create: prices },
      files: { create: { kind: "MAIN", storagePath: `private/ebooks/test/${slug}.pdf`, fileName: `${slug}.pdf`, mimeType: "application/pdf", sizeBytes: 10 } },
    },
  });
}

async function checkout(productIds: string[], currency = "USD", code?: string) {
  const q = await quoteCart(productIds, currency, code);
  return startCheckout({ productIds, email: "Buyer@Example.com", preferredCurrency: currency, discountCode: code, expectedTotal: q.total, expectedCurrency: q.currency });
}

const orderFor = (reference: string) => db.order.findUniqueOrThrow({ where: { reference }, include: { grants: true } });

beforeAll(async () => {
  await db.setting.upsert({ where: { key: "store" }, update: {}, create: { key: "store", value: { baseCurrency: "USD" } } });
});
afterAll(async () => db.$disconnect());

describe("catalogue visibility", () => {
  it("lists only published products and hides unpublished ones", async () => {
    const draft = await makeEbook("draft-book", [{ currency: "USD", amount: 1000 }], "DRAFT");
    let result = await searchCatalog({ currency: "USD", q: "draft-book" });
    expect(result.items.find((p) => p.id === draft.id)).toBeUndefined();
    expect(await productBySlug("draft-book")).toBeNull();
    expect(await productBySlug("draft-book", { includeUnpublished: true })).not.toBeNull();

    await db.product.update({ where: { id: draft.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    result = await searchCatalog({ currency: "USD", q: "draft" });
    expect(result.items.map((p) => p.id)).toContain(draft.id);

    await db.product.update({ where: { id: draft.id }, data: { status: "DRAFT" } });
    result = await searchCatalog({ currency: "USD" });
    expect(result.items.map((p) => p.id)).not.toContain(draft.id);
  });

  it("filters and sorts by price", async () => {
    await makeEbook("cheap-book", [{ currency: "USD", amount: 300 }]);
    await makeEbook("pricey-book", [{ currency: "USD", amount: 5000 }]);
    const r = await searchCatalog({ currency: "USD", min: 4000 });
    expect(r.items.map((p) => p.slug)).toEqual(["pricey-book"]);
    const sorted = await searchCatalog({ currency: "USD", sort: "price-asc" });
    expect(sorted.items[0].slug).toBe("cheap-book");
  });
});

describe("checkout and delivery", () => {
  it("unlocks downloads only after verified payment, and only for purchased products", async () => {
    const a = await makeEbook("buy-a", [{ currency: "USD", amount: 1000 }, { currency: "INR", amount: 49900 }]);
    const b = await makeEbook("buy-b", [{ currency: "USD", amount: 700 }]);
    const res = await checkout([a.id], "INR");
    expect(res.session).toEqual({ kind: "redirect", url: `/checkout/mock/${res.reference}` });

    let order = await orderFor(res.reference);
    expect(order).toMatchObject({ status: "PENDING", currency: "INR", totalAmount: 49900, email: "buyer@example.com" });
    expect(order.grants).toHaveLength(0);

    const r = await markOrderPaid({ provider: "mock", providerOrderId: order.providerOrderId!, providerPaymentId: "pay_x", amount: 49900, currency: "INR" });
    expect(r).toBe("fulfilled");
    order = await orderFor(res.reference);
    expect(order.status).toBe("PAID");
    expect(order.grants.map((g) => g.productId)).toEqual([a.id]);
    expect(order.grants.some((g) => g.productId === b.id)).toBe(false);

    // Duplicate notifications are harmless.
    expect(await markOrderPaid({ provider: "mock", providerOrderId: order.providerOrderId!, providerPaymentId: "pay_x", amount: 49900, currency: "INR" })).toBe("already-paid");
    expect((await orderFor(res.reference)).grants).toHaveLength(1);
  });

  it("never unlocks failed payments", async () => {
    const a = await makeEbook("fail-a", [{ currency: "USD", amount: 1000 }]);
    const res = await checkout([a.id]);
    const order = await orderFor(res.reference);
    await markOrderFailed("mock", order.providerOrderId!, "declined");
    const after = await orderFor(res.reference);
    expect(after.status).toBe("FAILED");
    expect(after.grants).toHaveLength(0);
  });

  it("refuses to fulfil when the paid amount or currency does not match", async () => {
    const a = await makeEbook("mismatch-a", [{ currency: "USD", amount: 1000 }]);
    const res = await checkout([a.id]);
    const order = await orderFor(res.reference);
    expect(await markOrderPaid({ provider: "mock", providerOrderId: order.providerOrderId!, providerPaymentId: "p", amount: 1, currency: "USD" })).toBe("mismatch");
    expect(await markOrderPaid({ provider: "mock", providerOrderId: order.providerOrderId!, providerPaymentId: "p", amount: 1000, currency: "INR" })).toBe("mismatch");
    expect(await markOrderPaid({ provider: "razorpay", providerOrderId: order.providerOrderId!, providerPaymentId: "p", amount: 1000, currency: "USD" })).toBe("not-found");
    expect((await orderFor(res.reference)).grants).toHaveLength(0);
  });

  it("charges each product its own price and falls back to the base currency", async () => {
    const a = await makeEbook("mix-a", [{ currency: "USD", amount: 1000 }, { currency: "INR", amount: 49900 }]);
    const b = await makeEbook("mix-b", [{ currency: "USD", amount: 700 }]);
    const q = await quoteCart([a.id, b.id], "INR");
    expect(q).toMatchObject({ currency: "USD", currencyFallback: true, subtotal: 1700, total: 1700 });
  });

  it("rejects checkout when the browser's expected total is stale", async () => {
    const a = await makeEbook("stale-a", [{ currency: "USD", amount: 1000 }]);
    await expect(startCheckout({ productIds: [a.id], email: "x@example.com", preferredCurrency: "USD", expectedTotal: 1, expectedCurrency: "USD" })).rejects.toThrow(/changed/);
  });

  it("refuses unpublished products at checkout", async () => {
    const a = await makeEbook("unpub-a", [{ currency: "USD", amount: 1000 }], "DRAFT");
    await expect(startCheckout({ productIds: [a.id], email: "x@example.com", preferredCurrency: "USD", expectedTotal: 0, expectedCurrency: "USD" })).rejects.toThrow();
  });

  it("applies server-side discounts and counts redemptions", async () => {
    const a = await makeEbook("disc-a", [{ currency: "USD", amount: 1000 }]);
    await db.discountCode.create({ data: { code: "TEST25", type: "PERCENT", percentOff: 25, maxRedemptions: 1 } });
    const res = await checkout([a.id], "USD", "test25");
    const order = await orderFor(res.reference);
    expect(order).toMatchObject({ subtotalAmount: 1000, discountAmount: 250, totalAmount: 750 });
    await markOrderPaid({ provider: "mock", providerOrderId: order.providerOrderId!, providerPaymentId: "p", amount: 750, currency: "USD" });
    expect((await db.discountCode.findUniqueOrThrow({ where: { code: "TEST25" } })).redemptionCount).toBe(1);
    const q = await quoteCart([a.id], "USD", "TEST25");
    expect(q.discountError).toMatch(/limit/);
  });

  it("expands bundles into their ebooks", async () => {
    const a = await makeEbook("bund-a", [{ currency: "USD", amount: 1000 }]);
    const b = await makeEbook("bund-b", [{ currency: "USD", amount: 1000 }]);
    const bundle = await db.product.create({
      data: { type: "BUNDLE", slug: "bund", title: "Bundle", status: "PUBLISHED", prices: { create: { currency: "USD", amount: 1500 } }, bundleItems: { create: [{ productId: a.id }, { productId: b.id }] } },
    });
    const res = await checkout([bundle.id]);
    const order = await orderFor(res.reference);
    await markOrderPaid({ provider: "mock", providerOrderId: order.providerOrderId!, providerPaymentId: "p", amount: 1500, currency: "USD" });
    expect((await orderFor(res.reference)).grants.map((g) => g.productId).sort()).toEqual([a.id, b.id].sort());
  });

  it("revokes access on full refund but not partial", async () => {
    const a = await makeEbook("refund-a", [{ currency: "USD", amount: 1000 }]);
    const res = await checkout([a.id]);
    const order = await orderFor(res.reference);
    await markOrderPaid({ provider: "mock", providerOrderId: order.providerOrderId!, providerPaymentId: "pay_r", amount: 1000, currency: "USD" });
    await applyRefund({ provider: "mock", providerPaymentId: "pay_r", providerRefundId: "r1", amount: 400, status: "processed" });
    let after = await orderFor(res.reference);
    expect(after).toMatchObject({ status: "PARTIALLY_REFUNDED", refundedAmount: 400 });
    expect(after.grants[0].revokedAt).toBeNull();
    // Same refund delivered twice is not double counted.
    await applyRefund({ provider: "mock", providerPaymentId: "pay_r", providerRefundId: "r1", amount: 400, status: "processed" });
    await applyRefund({ provider: "mock", providerPaymentId: "pay_r", providerRefundId: "r2", amount: 600, status: "processed" });
    after = await orderFor(res.reference);
    expect(after).toMatchObject({ status: "REFUNDED", refundedAmount: 1000 });
    expect(after.grants[0].revokedAt).not.toBeNull();
  });

  it("issues order access tokens that cannot be guessed from the reference", async () => {
    const a = await makeEbook("token-a", [{ currency: "USD", amount: 1000 }]);
    const res = await checkout([a.id]);
    const order = await orderFor(res.reference);
    expect(verifyOrderAccess(order.id, orderAccessToken(order.id))).toBe(true);
    expect(verifyOrderAccess(order.id, "guess")).toBe(false);
    expect(verifyOrderAccess(order.id, null)).toBe(false);
    expect(res.orderUrl).toContain(orderAccessToken(order.id));
  });
});
