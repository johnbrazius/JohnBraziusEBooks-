import "server-only";
import { env } from "../env";
import { razorpay } from "./razorpay";
import { PaymentConfigError, type CheckoutSession } from "./types";

export type ProviderId = "razorpay" | "mock";

/** Which payment provider is active, and whether it is usable. */
export function activeProvider(): { id: ProviderId; ready: boolean; testMode: boolean; problem?: string } | null {
  const p = env.paymentProvider();
  if (p === "mock") {
    return env.mockPaymentsAllowed()
      ? { id: "mock", ready: true, testMode: true }
      : { id: "mock", ready: false, testMode: true, problem: "Mock payments are disabled in production (set ALLOW_MOCK_PAYMENTS=true only for test deployments)." };
  }
  if (p === "razorpay") {
    const ready = Boolean(env.razorpayKeyId() && env.razorpayKeySecret() && env.razorpayWebhookSecret());
    return {
      id: "razorpay",
      ready,
      testMode: (env.razorpayKeyId() ?? "").startsWith("rzp_test_"),
      problem: ready ? undefined : "Razorpay keys or webhook secret are missing.",
    };
  }
  return null;
}

export async function createCheckout(input: { orderId: string; reference: string; amount: number; currency: string }): Promise<{ session: CheckoutSession; providerOrderId: string }> {
  const provider = activeProvider();
  if (!provider || !provider.ready) throw new PaymentConfigError(provider?.problem ?? "No payment provider is configured.");

  if (provider.id === "mock") {
    const providerOrderId = `mock_order_${input.orderId}`;
    return { providerOrderId, session: { kind: "redirect", url: `/checkout/mock/${input.reference}` } };
  }

  const order = await razorpay.createOrder({ reference: input.reference, amount: input.amount, currency: input.currency });
  return {
    providerOrderId: order.id,
    session: { kind: "razorpay", keyId: razorpay.keyId(), providerOrderId: order.id, amount: order.amount, currency: order.currency },
  };
}

export async function providerRefund(provider: string, paymentId: string, amount: number): Promise<{ providerRefundId: string; amount: number; status: string }> {
  if (provider === "mock") {
    if (!env.mockPaymentsAllowed()) throw new PaymentConfigError("Mock payments are disabled.");
    return { providerRefundId: `mock_rfnd_${Date.now()}`, amount, status: "processed" };
  }
  if (provider === "razorpay") {
    const r = await razorpay.refund(paymentId, amount);
    return { providerRefundId: r.id, amount: r.amount, status: r.status };
  }
  throw new PaymentConfigError(`Refunds are not supported for provider "${provider}".`);
}
