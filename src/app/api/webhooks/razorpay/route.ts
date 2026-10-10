import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { razorpay } from "@/lib/payments/razorpay";
import { applyRefund, markOrderFailed, markOrderPaid } from "@/lib/orders";

/**
 * Razorpay webhook endpoint. Configure in Razorpay Dashboard → Settings → Webhooks:
 *   URL:    https://<your-domain>/api/webhooks/razorpay
 *   Events: payment.captured, order.paid, payment.failed, refund.processed, refund.failed
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let event;
  try {
    event = razorpay.parseWebhook(raw, req.headers.get("x-razorpay-signature"), req.headers.get("x-razorpay-event-id"));
  } catch (err) {
    console.warn("[razorpay webhook] rejected:", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: record each event ID once. Razorpay retries deliveries, so duplicates are expected.
  let record;
  try {
    record = await db.paymentEvent.create({
      data: { provider: "razorpay", eventId: event.eventId, type: event.type === "ignored" ? event.rawType : event.type, payload: JSON.parse(raw) },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await db.paymentEvent.findUnique({ where: { provider_eventId: { provider: "razorpay", eventId: event.eventId } } });
      if (existing?.processedAt) return NextResponse.json({ ok: true, duplicate: true });
      record = existing!;
    } else throw err;
  }

  try {
    if (event.type === "payment.succeeded") {
      const result = await markOrderPaid({ provider: "razorpay", providerOrderId: event.providerOrderId, providerPaymentId: event.providerPaymentId, amount: event.amount, currency: event.currency });
      if (result === "mismatch") console.error("[razorpay webhook] amount mismatch for", event.providerOrderId);
    } else if (event.type === "payment.failed") {
      await markOrderFailed("razorpay", event.providerOrderId, event.reason);
    } else if (event.type === "refund") {
      await applyRefund({ provider: "razorpay", providerPaymentId: event.providerPaymentId, providerRefundId: event.providerRefundId, amount: event.amount, status: event.status });
    }
    const order =
      event.type === "payment.succeeded" || event.type === "payment.failed"
        ? await db.order.findUnique({ where: { providerOrderId: event.providerOrderId }, select: { id: true } })
        : null;
    await db.paymentEvent.update({ where: { id: record.id }, data: { processedAt: new Date(), orderId: order?.id ?? null, error: null } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    await db.paymentEvent.update({ where: { id: record.id }, data: { error: (err as Error).message.slice(0, 500) } });
    console.error("[razorpay webhook] processing failed", (err as Error).message);
    // Non-2xx makes Razorpay retry later.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
