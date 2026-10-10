import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { markOrderFailed, markOrderPaid, orderUrl } from "@/lib/orders";

export const metadata: Metadata = { title: "Test payment", robots: { index: false, follow: false } };

type Params = Promise<{ reference: string }>;

async function loadMockOrder(reference: string) {
  if (!env.mockPaymentsAllowed()) return null;
  const order = await db.order.findUnique({ where: { reference }, include: { items: true } });
  if (!order || order.provider !== "mock") return null;
  return order;
}

export default async function MockCheckoutPage({ params }: { params: Params }) {
  const { reference } = await params;
  const order = await loadMockOrder(reference);
  if (!order) notFound();
  if (order.status !== "PENDING") redirect(orderUrl(order));

  async function succeed() {
    "use server";
    const o = await loadMockOrder(reference);
    if (!o || !o.providerOrderId) return;
    await markOrderPaid({ provider: "mock", providerOrderId: o.providerOrderId, providerPaymentId: `mock_pay_${o.id}`, amount: o.totalAmount, currency: o.currency });
    redirect(orderUrl(o));
  }
  async function fail() {
    "use server";
    const o = await loadMockOrder(reference);
    if (!o || !o.providerOrderId) return;
    await markOrderFailed("mock", o.providerOrderId, "Simulated failure (test mode)");
    redirect(orderUrl(o));
  }

  return (
    <div className="container-page max-w-lg py-16">
      <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-8">
        <p className="badge bg-amber-400 text-amber-950">TEST MODE — no real payment</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Simulated checkout</h1>
        <p className="mt-2 text-sm text-navy-700">
          This page stands in for the real payment provider during development. It is only available when
          <code className="mx-1 rounded bg-white px-1">PAYMENT_PROVIDER=mock</code>is configured.
        </p>
        <dl className="mt-6 space-y-1 text-sm">
          <div className="flex justify-between"><dt>Order</dt><dd className="font-mono">{order.reference}</dd></div>
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between text-navy-700"><dt>{i.titleSnapshot}</dt><dd>{formatMoney(i.unitAmount, order.currency)}</dd></div>
          ))}
          <div className="flex justify-between border-t border-amber-300 pt-2 font-bold"><dt>Total</dt><dd>{formatMoney(order.totalAmount, order.currency)}</dd></div>
        </dl>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <form action={succeed} className="flex-1"><button className="btn-primary w-full">Simulate successful payment</button></form>
          <form action={fail} className="flex-1"><button className="btn-secondary w-full">Simulate failed payment</button></form>
        </div>
      </div>
    </div>
  );
}
