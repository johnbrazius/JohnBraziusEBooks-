export type CheckoutSession =
  /** Open Razorpay Checkout in the browser with these parameters. */
  | { kind: "razorpay"; keyId: string; providerOrderId: string; amount: number; currency: string }
  /** Send the browser to a URL (used by the local mock provider). */
  | { kind: "redirect"; url: string };

export type PaymentEvent =
  | { type: "payment.succeeded"; eventId: string; providerOrderId: string; providerPaymentId: string; amount: number; currency: string }
  | { type: "payment.failed"; eventId: string; providerOrderId: string; providerPaymentId?: string; reason?: string }
  | { type: "refund"; eventId: string; providerPaymentId: string; providerRefundId: string; amount: number; status: string }
  | { type: "ignored"; eventId: string; rawType: string };

export class PaymentConfigError extends Error {}
