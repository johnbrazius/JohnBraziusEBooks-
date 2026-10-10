"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useCart } from "@/lib/cart-client";
import { formatMoney } from "@/lib/money";

type Line = { productId: string; title: string; slug: string; unitAmount: number; regularAmount: number; onSale: boolean; type: string };
type QuoteResponse = {
  currency: string;
  preferredCurrency: string;
  currencyFallback: boolean;
  chargeable: boolean;
  lines: Line[];
  subtotal: number;
  discountAmount: number;
  total: number;
  discount: { code: string } | null;
  discountError: string | null;
  unavailable: string[];
};

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

export function CartView({ storeName, checkoutReady }: { storeName: string; checkoutReady: boolean }) {
  const cart = useCart();
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const itemsKey = cart.items.join(",");
  const reqId = useRef(0);

  useEffect(() => setHydrated(true), []);

  const refresh = useCallback(async () => {
    if (!hydrated) return;
    const ids = itemsKey ? itemsKey.split(",") : [];
    if (!ids.length) {
      setQuote(null);
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids, discountCode: appliedCode || null }),
      });
      if (!res.ok) throw new Error();
      const q: QuoteResponse = await res.json();
      if (id !== reqId.current) return;
      setQuote(q);
      // Silently drop items that are no longer for sale.
      if (q.unavailable.length) cart.set(ids.filter((x) => !q.unavailable.includes(x)));
    } catch {
      if (id === reqId.current) setError("Could not load your cart. Please refresh the page.");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, appliedCode, hydrated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    if (!quote) return;
    setError(null);
    setPaying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: cart.items,
          email,
          discountCode: appliedCode || null,
          expectedTotal: quote.total,
          expectedCurrency: quote.currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout failed. Please try again.");
        if (res.status === 409) refresh();
        setPaying(false);
        return;
      }
      const { orderUrl, session } = data as { orderUrl: string; session: null | { kind: "redirect"; url: string } | { kind: "razorpay"; keyId: string; providerOrderId: string; amount: number; currency: string } };
      if (!session) {
        cart.clear();
        window.location.href = orderUrl;
        return;
      }
      if (session.kind === "redirect") {
        window.location.href = session.url;
        return;
      }
      if (!window.Razorpay) {
        setError("The payment window could not load. Check your connection or disable content blockers, then try again.");
        setPaying(false);
        return;
      }
      const rzp = new window.Razorpay({
        key: session.keyId,
        order_id: session.providerOrderId,
        amount: session.amount,
        currency: session.currency,
        name: storeName,
        description: quote.lines.map((l) => l.title).join(", ").slice(0, 250),
        prefill: { email },
        theme: { color: "#14244a" },
        handler: async (r: RazorpayResponse) => {
          // The server re-verifies the signature and the payment status with Razorpay before unlocking anything.
          await fetch("/api/checkout/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(r),
          }).catch(() => {});
          cart.clear();
          window.location.href = orderUrl;
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.on("payment.failed", (r) => {
        setError(r.error?.description ? `Payment failed: ${r.error.description}` : "Payment failed. You have not been charged.");
        setPaying(false);
      });
      rzp.open();
    } catch {
      setError("Something went wrong starting checkout. Please try again.");
      setPaying(false);
    }
  }

  if (!hydrated || (loading && !quote)) {
    return <p className="mt-8 text-navy-600" aria-busy="true">Loading your cart…</p>;
  }

  if (!cart.items.length || !quote || quote.lines.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-navy-200 p-10 text-center">
        <p className="font-display text-lg font-semibold text-navy-900">Your cart is empty</p>
        <Link href="/ebooks" className="btn-primary mt-4">Browse ebooks</Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <section aria-labelledby="items-h">
        <h2 id="items-h" className="sr-only">Items</h2>
        <ul className="divide-y divide-navy-100 rounded-xl border border-navy-100">
          {quote.lines.map((l) => (
            <li key={l.productId} className="flex items-center justify-between gap-4 p-5">
              <div>
                <Link href={`/ebooks/${l.slug}`} className="font-display font-semibold text-navy-900 hover:text-teal-700">{l.title}</Link>
                <p className="text-xs text-navy-500">{l.type === "BUNDLE" ? "Ebook bundle" : "Ebook"} · Digital download</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold text-navy-900">{formatMoney(l.unitAmount, quote.currency)}</p>
                  {l.onSale && <p className="text-xs text-navy-400 line-through">{formatMoney(l.regularAmount, quote.currency)}</p>}
                </div>
                <button type="button" onClick={() => cart.remove(l.productId)} className="text-sm text-navy-500 underline hover:text-red-700" aria-label={`Remove ${l.title}`}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        {quote.currencyFallback && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Not every item in your cart has a {quote.preferredCurrency} price, so this order will be charged in{" "}
            <strong>{quote.currency}</strong>. Your bank or card provider may apply its own conversion rate and fees.
          </p>
        )}
      </section>

      <aside className="h-fit rounded-xl border border-navy-100 bg-navy-50/40 p-6">
        <h2 className="font-display text-lg font-bold text-navy-900">Order summary</h2>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedCode(code.trim().toUpperCase());
          }}
        >
          <label htmlFor="code" className="sr-only">Discount code</label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Discount code" className="input" maxLength={40} />
          <button className="btn-secondary" type="submit">Apply</button>
        </form>
        {quote.discountError && appliedCode && <p role="alert" className="mt-2 text-sm text-red-700">{quote.discountError}</p>}

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-navy-600">Subtotal</dt><dd>{formatMoney(quote.subtotal, quote.currency)}</dd></div>
          {quote.discountAmount > 0 && (
            <div className="flex justify-between text-teal-800">
              <dt>Discount ({quote.discount?.code})</dt>
              <dd>−{formatMoney(quote.discountAmount, quote.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-navy-200 pt-3 text-base font-bold text-navy-900">
            <dt>Total</dt>
            <dd>{formatMoney(quote.total, quote.currency)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-navy-600">
          You will be charged exactly <strong>{formatMoney(quote.total, quote.currency)}</strong> ({quote.currency}). Applicable taxes, if any, are shown by the payment provider before you confirm.
        </p>

        <form onSubmit={checkout} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="label">Email for delivery</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
            <p className="hint">Your download link is sent here. We don’t create an account for you.</p>
          </div>
          <label className="flex items-start gap-2 text-xs text-navy-700">
            <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 rounded border-navy-300 text-teal-600" />
            <span>
              I agree to the <Link href="/terms" className="underline" target="_blank">Terms</Link>, <Link href="/licence" className="underline" target="_blank">Licence</Link> and{" "}
              <Link href="/refund-policy" className="underline" target="_blank">Refund Policy</Link>, and understand this is a digital product delivered immediately after payment.
            </span>
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {!checkoutReady && quote.total > 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Checkout is not enabled yet. Please check back soon.</p>
          )}
          <button className="btn-primary w-full py-3 text-base" disabled={paying || loading || !quote.chargeable || (!checkoutReady && quote.total > 0)}>
            {paying ? "Processing…" : quote.total === 0 ? "Get my ebooks" : `Pay ${formatMoney(quote.total, quote.currency)}`}
          </button>
          <p className="text-center text-xs text-navy-500">🔒 Payments are processed securely by our payment provider. We never see or store your card details.</p>
        </form>
      </aside>
    </div>
  );
}
