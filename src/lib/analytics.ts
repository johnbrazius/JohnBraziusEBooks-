import "server-only";
import { db } from "./db";

const SOLD = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

/**
 * Store metrics derived only from recorded orders. Amounts are grouped per currency and never summed across
 * currencies. "Gross" is what customers paid; it is NOT the bank payout, which is lower after provider fees,
 * taxes (e.g. GST on fees) and currency conversion — check your payment provider's settlement reports.
 */
export async function salesSummary(since?: Date) {
  const where = { status: { in: [...SOLD] }, ...(since ? { paidAt: { gte: since } } : {}) };
  const byCurrency = await db.order.groupBy({
    by: ["currency"],
    where,
    _sum: { totalAmount: true, refundedAmount: true },
    _count: { _all: true },
  });
  const refundedOrders = await db.order.count({ where: { ...where, status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } } });
  return {
    orders: byCurrency.reduce((s, r) => s + r._count._all, 0),
    refundedOrders,
    currencies: byCurrency.map((r) => ({
      currency: r.currency,
      orders: r._count._all,
      gross: r._sum.totalAmount ?? 0,
      refunds: r._sum.refundedAmount ?? 0,
      net: (r._sum.totalAmount ?? 0) - (r._sum.refundedAmount ?? 0),
    })),
  };
}

export async function topProducts(limit = 10, since?: Date) {
  const rows = await db.orderItem.groupBy({
    by: ["productId", "titleSnapshot"],
    where: { order: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, ...(since ? { paidAt: { gte: since } } : {}) } },
    _count: { _all: true },
    orderBy: { _count: { productId: "desc" } },
    take: limit,
  });
  return rows.map((r) => ({ productId: r.productId, title: r.titleSnapshot, units: r._count._all }));
}

export async function dailySales(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db.$queryRaw<{ day: Date; currency: string; orders: bigint; gross: bigint }[]>`
    SELECT date_trunc('day', "paidAt") AS day, currency, COUNT(*) AS orders, SUM("totalAmount") AS gross
    FROM "Order"
    WHERE status IN ('PAID','PARTIALLY_REFUNDED','REFUNDED') AND "paidAt" >= ${since}
    GROUP BY 1, 2 ORDER BY 1 ASC`;
  return rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), currency: r.currency, orders: Number(r.orders), gross: Number(r.gross) }));
}

export async function productViews(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db.productViewDaily.groupBy({ by: ["productId"], where: { day: { gte: since } }, _sum: { views: true }, orderBy: { _sum: { views: "desc" } }, take: 20 });
  const products = await db.product.findMany({ where: { id: { in: rows.map((r) => r.productId) } }, select: { id: true, title: true } });
  return rows.map((r) => ({ productId: r.productId, title: products.find((p) => p.id === r.productId)?.title ?? "(deleted)", views: r._sum.views ?? 0 }));
}
