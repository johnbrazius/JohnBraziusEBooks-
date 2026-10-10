import { NextResponse } from "next/server";
import { z } from "zod";
import { razorpay } from "@/lib/payments/razorpay";
import { markOrderPaid } from "@/lib/orders";
import { env } from "@/lib/env";

const body = z.object({
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(128),
});

/**
 * Called by the browser after Razorpay Checkout succeeds. This is a fast path only — the browser's word is NOT
 * trusted: we verify the HMAC signature AND fetch the payment from Razorpay's API to confirm it is captured
 * for the right order and amount. The webhook remains the authoritative path if this request never arrives.
 */
export async function POST(req: Request) {
  if (env.paymentProvider() !== "razorpay") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: sig } = parsed.data;

  if (!razorpay.verifyCheckoutSignature(orderId, paymentId, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    const payment = await razorpay.fetchPayment(paymentId);
    if (payment.order_id !== orderId || payment.status !== "captured") {
      // Authorised-but-not-captured payments are finalised by the webhook once captured.
      return NextResponse.json({ status: "pending" });
    }
    const result = await markOrderPaid({ provider: "razorpay", providerOrderId: orderId, providerPaymentId: paymentId, amount: payment.amount, currency: payment.currency });
    return NextResponse.json({ status: result });
  } catch (err) {
    console.error("[razorpay verify]", (err as Error).message);
    return NextResponse.json({ status: "pending" });
  }
}
