import "server-only";
import { env } from "../env";
import { hmacSha256Hex, safeEqual } from "../crypto";
import { PaymentConfigError, type PaymentEvent } from "./types";

/**
 * Razorpay integration using its documented REST API (https://razorpay.com/docs/api/).
 * Secrets are read from environment variables only and never sent to the browser — only the public Key ID is.
 */

const API = "https://api.razorpay.com/v1";

function creds() {
  const keyId = env.razorpayKeyId();
  const secret = env.razorpayKeySecret();
  if (!keyId || !secret) throw new PaymentConfigError("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
  return { keyId, secret };
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const { keyId, secret } = creds();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = (json.error as { description?: string } | undefined)?.description ?? res.statusText;
    // Never log the Authorization header or secrets — only the provider's error text.
    throw new Error(`Razorpay ${method} ${path} failed: ${err}`);
  }
  return json as T;
}

export const razorpay = {
  keyId: () => creds().keyId,

  async createOrder(input: { reference: string; amount: number; currency: string }) {
    const order = await call<{ id: string; amount: number; currency: string; status: string }>("POST", "/orders", {
      amount: input.amount,
      currency: input.currency,
      receipt: input.reference,
      notes: { reference: input.reference },
    });
    return order;
  },

  /** Signature Razorpay Checkout returns to the browser: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
  verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
    const expected = hmacSha256Hex(creds().secret, `${orderId}|${paymentId}`);
    return safeEqual(expected, signature);
  },

  async fetchPayment(paymentId: string) {
    return call<{ id: string; order_id: string; status: string; amount: number; currency: string; captured: boolean }>(
      "GET",
      `/payments/${encodeURIComponent(paymentId)}`,
    );
  },

  async refund(paymentId: string, amount: number) {
    return call<{ id: string; amount: number; status: string; payment_id: string }>(
      "POST",
      `/payments/${encodeURIComponent(paymentId)}/refund`,
      { amount },
    );
  },

  /** Verifies X-Razorpay-Signature (HMAC_SHA256 of the raw body with the webhook secret) and normalises the event. */
  parseWebhook(rawBody: string, signature: string | null, eventIdHeader: string | null): PaymentEvent {
    const secret = env.razorpayWebhookSecret();
    if (!secret) throw new PaymentConfigError("RAZORPAY_WEBHOOK_SECRET is not set.");
    if (!signature || !safeEqual(hmacSha256Hex(secret, rawBody), signature)) {
      throw new Error("Invalid webhook signature");
    }
    return normaliseRazorpayEvent(JSON.parse(rawBody), eventIdHeader);
  },
};

type RzpEntity = Record<string, unknown>;

export function normaliseRazorpayEvent(body: { event?: string; payload?: Record<string, { entity?: RzpEntity }>; created_at?: number }, eventIdHeader: string | null): PaymentEvent {
  const type = String(body.event ?? "");
  const payment = body.payload?.payment?.entity;
  const refund = body.payload?.refund?.entity;
  const fallbackId = `${type}:${String(payment?.id ?? refund?.id ?? "")}:${body.created_at ?? ""}`;
  const eventId = eventIdHeader || fallbackId;

  if ((type === "payment.captured" || type === "order.paid") && payment) {
    return {
      type: "payment.succeeded",
      eventId,
      providerOrderId: String(payment.order_id),
      providerPaymentId: String(payment.id),
      amount: Number(payment.amount),
      currency: String(payment.currency),
    };
  }
  if (type === "payment.failed" && payment) {
    return {
      type: "payment.failed",
      eventId,
      providerOrderId: String(payment.order_id),
      providerPaymentId: String(payment.id),
      reason: String((payment.error_description as string | undefined) ?? "Payment failed"),
    };
  }
  if ((type === "refund.processed" || type === "refund.created" || type === "refund.failed") && refund) {
    return {
      type: "refund",
      eventId,
      providerPaymentId: String(refund.payment_id),
      providerRefundId: String(refund.id),
      amount: Number(refund.amount),
      status: String(refund.status),
    };
  }
  return { type: "ignored", eventId, rawType: type };
}
