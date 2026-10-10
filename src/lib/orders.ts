import "server-only";
import { Prisma, type Order } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { hmacSha256Hex, orderReference, safeEqual } from "./crypto";
import { getSettings } from "./settings";
import { buildQuote, chooseChargeCurrency, MIN_CHARGE_MINOR, type DiscountRule, type PricedProduct, type Quote } from "./pricing";
import { activeProvider, createCheckout, providerRefund } from "./payments";
import type { CheckoutSession } from "./payments/types";
import { sendEmail, escapeHtml } from "./email";
import { formatMoney } from "./money";

export class CheckoutError extends Error {}

// ---------------------------------------------------------------------------
// Order access tokens
// ---------------------------------------------------------------------------

/**
 * The secret part of a customer's order link. Derived from AUTH_SECRET so it never has to be stored, can be
 * re-sent by email at any time, and cannot be guessed from the order reference.
 */
export function orderAccessToken(orderId: string): string {
  return Buffer.from(hmacSha256Hex(env.authSecret(), `order-access:${orderId}`), "hex").toString("base64url");
}

export function verifyOrderAccess(orderId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  return safeEqual(orderAccessToken(orderId), token);
}

export function orderUrl(order: Pick<Order, "id" | "reference">): string {
  return `/orders/${order.reference}?t=${orderAccessToken(order.id)}`;
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

const pricedSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  saleStartsAt: true,
  saleEndsAt: true,
  prices: { select: { currency: true, amount: true, saleAmount: true } },
} satisfies Prisma.ProductSelect;

async function loadDiscount(code: string | null | undefined): Promise<DiscountRule | null | "not-found"> {
  const c = code?.trim().toUpperCase();
  if (!c) return null;
  const d = await db.discountCode.findUnique({ where: { code: c }, include: { products: { select: { id: true } } } });
  if (!d) return "not-found";
  return { ...d, productIds: d.products.map((p) => p.id) };
}

export type QuoteResult = Quote & {
  chargeable: boolean;
  preferredCurrency: string;
  /** True when the visitor asked for a currency we could not charge for this cart. */
  currencyFallback: boolean;
  unavailable: string[];
};

/** Server-side quote for a cart. Product IDs that are not published are reported and dropped. */
export async function quoteCart(productIds: string[], preferredCurrency: string, discountCode?: string | null): Promise<QuoteResult> {
  const ids = [...new Set(productIds)].slice(0, 50);
  const settings = await getSettings();
  const rows = await db.product.findMany({ where: { id: { in: ids } }, select: pricedSelect });
  const published = rows.filter((r) => r.status === "PUBLISHED");
  const unavailable = ids.filter((id) => !published.some((p) => p.id === id));
  // Keep the customer's cart order.
  const products: PricedProduct[] = ids.map((id) => published.find((p) => p.id === id)).filter(Boolean) as PricedProduct[];

  const chargeableCurrencies = env.paymentCurrencies();
  const currency = chooseChargeCurrency(products, preferredCurrency, settings.baseCurrency, chargeableCurrencies);
  const empty: QuoteResult = {
    currency: currency ?? settings.baseCurrency,
    lines: [],
    subtotal: 0,
    discountAmount: 0,
    total: 0,
    discount: null,
    discountError: null,
    chargeable: false,
    preferredCurrency,
    currencyFallback: false,
    unavailable,
  };
  if (products.length === 0) return empty;
  if (!currency) {
    return { ...empty, discountError: null, chargeable: false };
  }

  const rule = await loadDiscount(discountCode);
  const quote = buildQuote(products, currency, rule === "not-found" ? null : rule, new Date());
  if (rule === "not-found") quote.discountError = "That discount code was not found.";
  return {
    ...quote,
    chargeable: true,
    preferredCurrency,
    currencyFallback: currency !== preferredCurrency,
    unavailable,
  };
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export type CheckoutResult = { reference: string; orderUrl: string; session: CheckoutSession | null };

export async function startCheckout(input: {
  productIds: string[];
  email: string;
  preferredCurrency: string;
  discountCode?: string | null;
  /** The amount the customer saw. If the server's figure differs (price changed), we refuse and re-quote. */
  expectedTotal: number;
  expectedCurrency: string;
}): Promise<CheckoutResult> {
  const quote = await quoteCart(input.productIds, input.preferredCurrency, input.discountCode);
  if (quote.unavailable.length) throw new CheckoutError("Some items in your cart are no longer available. Please review your cart.");
  if (!quote.chargeable || quote.lines.length === 0) throw new CheckoutError("These items cannot be purchased right now.");
  if (input.discountCode?.trim() && quote.discountError) throw new CheckoutError(quote.discountError);
  if (quote.total !== input.expectedTotal || quote.currency !== input.expectedCurrency) {
    throw new CheckoutError("Prices have changed since you loaded this page. Please review the updated total.");
  }
  const isFree = quote.total === 0;
  if (!isFree && quote.total < MIN_CHARGE_MINOR) throw new CheckoutError("The order total is below the minimum amount we can process.");

  const provider = activeProvider();
  if (!isFree && (!provider || !provider.ready)) throw new CheckoutError("Checkout is not available yet. Please try again later.");

  const order = await db.order.create({
    data: {
      reference: orderReference(),
      email: input.email.trim().toLowerCase(),
      currency: quote.currency,
      subtotalAmount: quote.subtotal,
      discountAmount: quote.discountAmount,
      totalAmount: quote.total,
      discountCodeId: quote.discount?.id ?? null,
      discountCodeText: quote.discount?.code ?? null,
      provider: isFree ? "free" : provider!.id,
      items: {
        create: await Promise.all(
          quote.lines.map(async (l) => {
            const p = await db.product.findUnique({ where: { id: l.productId }, select: { type: true } });
            return { productId: l.productId, titleSnapshot: l.title, unitAmount: l.unitAmount, productType: p?.type ?? "EBOOK" };
          }),
        ),
      },
    },
  });

  if (isFree) {
    await db.order.update({ where: { id: order.id }, data: { providerOrderId: `free_${order.id}` } });
    await markOrderPaid({ provider: "free", providerOrderId: `free_${order.id}`, providerPaymentId: `free_${order.id}`, amount: 0, currency: order.currency });
    return { reference: order.reference, orderUrl: orderUrl(order), session: null };
  }

  try {
    const { session, providerOrderId } = await createCheckout({
      orderId: order.id,
      reference: order.reference,
      amount: order.totalAmount,
      currency: order.currency,
    });
    await db.order.update({ where: { id: order.id }, data: { providerOrderId } });
    return { reference: order.reference, orderUrl: orderUrl(order), session };
  } catch (err) {
    await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED", failureReason: "Could not start payment" } });
    console.error("[checkout] provider error", (err as Error).message);
    throw new CheckoutError("We could not start the payment. Please try again in a moment.");
  }
}

// ---------------------------------------------------------------------------
// Fulfilment — only ever called after the provider has confirmed payment server-side.
// ---------------------------------------------------------------------------

/** Products a paid order unlocks: ebooks directly, bundles expanded into their ebooks. */
async function entitlementsFor(orderId: string, tx: Prisma.TransactionClient): Promise<string[]> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, product: { select: { type: true, bundleItems: { select: { productId: true } } } } },
  });
  const ids = new Set<string>();
  for (const it of items) {
    if (!it.productId || !it.product) continue;
    if (it.product.type === "BUNDLE") it.product.bundleItems.forEach((b) => ids.add(b.productId));
    else ids.add(it.productId);
  }
  return [...ids];
}

export type FulfilResult = "fulfilled" | "already-paid" | "mismatch" | "not-found";

export async function markOrderPaid(input: {
  provider: string;
  providerOrderId: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
}): Promise<FulfilResult> {
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { providerOrderId: input.providerOrderId } });
    if (!order || order.provider !== input.provider) return { r: "not-found" as const };
    if (order.status === "PAID" || order.status === "REFUNDED" || order.status === "PARTIALLY_REFUNDED") return { r: "already-paid" as const };

    if (order.totalAmount !== input.amount || order.currency !== input.currency.toUpperCase()) {
      await tx.order.update({
        where: { id: order.id },
        data: { failureReason: `Amount mismatch: expected ${order.totalAmount} ${order.currency}, got ${input.amount} ${input.currency}` },
      });
      return { r: "mismatch" as const };
    }

    // Conditional update = idempotency guard against concurrent webhook + browser verification.
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: { in: ["PENDING", "FAILED", "CANCELLED"] } },
      data: { status: "PAID", paidAt: new Date(), providerPaymentId: input.providerPaymentId, failureReason: null },
    });
    if (updated.count === 0) return { r: "already-paid" as const };

    const productIds = await entitlementsFor(order.id, tx);
    const days = env.downloadExpiryDays();
    await tx.downloadGrant.createMany({
      data: productIds.map((productId) => ({
        orderId: order.id,
        productId,
        maxDownloads: env.downloadMaxCount(),
        expiresAt: days > 0 ? new Date(Date.now() + days * 86_400_000) : null,
      })),
      skipDuplicates: true,
    });
    if (order.discountCodeId) {
      await tx.discountCode.update({ where: { id: order.discountCodeId }, data: { redemptionCount: { increment: 1 } } });
    }
    return { r: "fulfilled" as const, orderId: order.id };
  });

  if (result.r === "fulfilled") await sendOrderEmail(result.orderId);
  return result.r;
}

export async function markOrderFailed(provider: string, providerOrderId: string, reason?: string) {
  await db.order.updateMany({
    where: { providerOrderId, provider, status: "PENDING" },
    data: { status: "FAILED", failureReason: reason?.slice(0, 300) ?? "Payment failed" },
  });
}

/** Records a refund (from a webhook or an admin action) and revokes downloads on a full refund. */
export async function applyRefund(input: { orderId?: string; provider: string; providerPaymentId?: string; providerRefundId: string; amount: number; status: string }) {
  const order = input.orderId
    ? await db.order.findUnique({ where: { id: input.orderId } })
    : await db.order.findFirst({ where: { provider: input.provider, providerPaymentId: input.providerPaymentId } });
  if (!order) return "not-found" as const;

  await db.$transaction(async (tx) => {
    await tx.refund.upsert({
      where: { providerRefundId: input.providerRefundId },
      update: { status: input.status, amount: input.amount },
      create: { orderId: order.id, providerRefundId: input.providerRefundId, amount: input.amount, status: input.status },
    });
    const refunds = await tx.refund.findMany({ where: { orderId: order.id, status: { in: ["processed", "created", "pending"] } } });
    const refunded = Math.min(refunds.reduce((s, r) => s + r.amount, 0), order.totalAmount);
    const full = refunded >= order.totalAmount;
    await tx.order.update({
      where: { id: order.id },
      data: {
        refundedAmount: refunded,
        status:
          refunded === 0
            ? order.status === "REFUNDED" || order.status === "PARTIALLY_REFUNDED" ? "PAID" : order.status
            : full ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });
    if (full) {
      await tx.downloadGrant.updateMany({ where: { orderId: order.id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
  });
  return "ok" as const;
}

export async function adminRefund(orderId: string, amount: number) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.status !== "PAID" && order.status !== "PARTIALLY_REFUNDED") throw new Error("Only paid orders can be refunded.");
  if (!order.providerPaymentId) throw new Error("This order has no payment reference.");
  const remaining = order.totalAmount - order.refundedAmount;
  if (!Number.isInteger(amount) || amount <= 0 || amount > remaining) throw new Error("Invalid refund amount.");
  if (order.provider === "free") {
    throw new Error("Free orders cannot be refunded — revoke access instead.");
  }
  const r = await providerRefund(order.provider, order.providerPaymentId, amount);
  await applyRefund({ orderId: order.id, provider: order.provider, providerRefundId: r.providerRefundId, amount: r.amount, status: r.status });
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export async function sendOrderEmail(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  const settings = await getSettings();
  const link = `${env.siteUrl()}${orderUrl(order)}`;
  const itemsText = order.items.map((i) => `- ${i.titleSnapshot}`).join("\n");
  const total = formatMoney(order.totalAmount, order.currency);
  const status = await sendEmail(
    order.email,
    `Your ${settings.storeName} order ${order.reference}`,
    `<p>Thank you for your purchase!</p>
     <p><strong>Order:</strong> ${order.reference}<br/><strong>Total:</strong> ${escapeHtml(total)}</p>
     <ul>${order.items.map((i) => `<li>${escapeHtml(i.titleSnapshot)}</li>`).join("")}</ul>
     <p><a href="${link}">Download your ebooks</a></p>
     <p>Keep this email — the link above is your personal access to your downloads.</p>
     ${settings.supportEmail ? `<p>Need help? Reply to ${escapeHtml(settings.supportEmail)}.</p>` : ""}`,
    `Thank you for your purchase!\n\nOrder: ${order.reference}\nTotal: ${total}\n\n${itemsText}\n\nDownload your ebooks: ${link}\n`,
  );
  await db.order.update({ where: { id: order.id }, data: { emailStatus: status } });
}

export async function resendOrderLink(reference: string, email: string): Promise<boolean> {
  const order = await db.order.findUnique({ where: { reference: reference.trim().toUpperCase() } });
  if (!order || order.email !== email.trim().toLowerCase()) return false;
  if (!["PAID", "PARTIALLY_REFUNDED"].includes(order.status)) return false;
  await sendOrderEmail(order.id);
  return true;
}
