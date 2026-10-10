import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import { razorpay } from "@/lib/payments/razorpay";

const sign = (body: string, secret = "whsec_test") => createHmac("sha256", secret).update(body).digest("hex");

const captured = JSON.stringify({
  event: "payment.captured",
  created_at: 1,
  payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 49900, currency: "INR", status: "captured" } } },
});

describe("Razorpay webhook verification", () => {
  it("accepts a correctly signed event and normalises it", () => {
    expect(razorpay.parseWebhook(captured, sign(captured), "evt_1")).toEqual({
      type: "payment.succeeded", eventId: "evt_1", providerOrderId: "order_1", providerPaymentId: "pay_1", amount: 49900, currency: "INR",
    });
  });
  it("rejects missing, wrong or tampered signatures", () => {
    expect(() => razorpay.parseWebhook(captured, null, "evt_1")).toThrow();
    expect(() => razorpay.parseWebhook(captured, sign(captured, "other"), "evt_1")).toThrow();
    const tampered = captured.replace("49900", "100");
    expect(() => razorpay.parseWebhook(tampered, sign(captured), "evt_1")).toThrow();
  });
  it("normalises failures and refunds", () => {
    const failed = JSON.stringify({ event: "payment.failed", payload: { payment: { entity: { id: "pay_2", order_id: "order_2", error_description: "Card declined" } } } });
    expect(razorpay.parseWebhook(failed, sign(failed), "e2")).toMatchObject({ type: "payment.failed", providerOrderId: "order_2", reason: "Card declined" });
    const refund = JSON.stringify({ event: "refund.processed", payload: { refund: { entity: { id: "rfnd_1", payment_id: "pay_1", amount: 49900, status: "processed" } } } });
    expect(razorpay.parseWebhook(refund, sign(refund), "e3")).toMatchObject({ type: "refund", providerRefundId: "rfnd_1", amount: 49900 });
  });
  it("verifies checkout signatures", () => {
    const sig = createHmac("sha256", "rzp_test_secret").update("order_1|pay_1").digest("hex");
    expect(razorpay.verifyCheckoutSignature("order_1", "pay_1", sig)).toBe(true);
    expect(razorpay.verifyCheckoutSignature("order_1", "pay_2", sig)).toBe(false);
  });
});
