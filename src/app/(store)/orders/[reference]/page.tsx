import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { verifyOrderAccess } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { AutoRefresh } from "./AutoRefresh";
import { ClearCart } from "./ClearCart";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Params = Promise<{ reference: string }>;
type SP = Promise<{ t?: string }>;

export default async function OrderPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { reference } = await params;
  const { t } = await searchParams;
  const order = await db.order.findUnique({
    where: { reference },
    include: {
      items: true,
      grants: { include: { product: { select: { title: true, slug: true, files: { where: { kind: "MAIN" }, select: { fileName: true, sizeBytes: true } } } } } },
    },
  });
  // Same 404 for "no such order" and "wrong token" so references cannot be probed.
  if (!order || !verifyOrderAccess(order.id, t)) notFound();
  const settings = await getSettings();
  const token = t!;
  const paid = order.status === "PAID" || order.status === "PARTIALLY_REFUNDED";

  return (
    <div className="container-page max-w-3xl py-12">
      <p className="eyebrow">Order {order.reference}</p>

      {order.status === "PENDING" && (
        <>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy-900">Confirming your payment…</h1>
          <p className="mt-3 text-navy-700">
            We’re waiting for the payment provider to confirm your payment. This usually takes a few seconds. This page refreshes automatically.
          </p>
          <p className="mt-2 text-sm text-navy-500">Downloads unlock only after the payment is verified. If you closed the payment window without paying, no money was taken.</p>
          <AutoRefresh seconds={5} />
        </>
      )}

      {paid && (
        <>
          <ClearCart />
          <h1 className="mt-2 font-display text-3xl font-bold text-navy-900">Thank you — your ebooks are ready</h1>
          <p className="mt-3 text-navy-700">
            Bookmark this page: it is your personal download page.
            {order.emailStatus === "SENT" && <> We’ve also emailed the link to <strong>{order.email}</strong>.</>}
          </p>
          <ul className="mt-8 space-y-4">
            {order.grants.map((g) => {
              const file = g.product.files[0];
              const remaining = g.maxDownloads - g.downloadCount;
              const expired = g.expiresAt && g.expiresAt < new Date();
              const blocked = g.revokedAt || expired || remaining <= 0 || !file;
              return (
                <li key={g.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display font-semibold text-navy-900">{g.product.title}</p>
                    <p className="text-xs text-navy-500">
                      {file ? file.fileName : "File being prepared — please contact support"} ·{" "}
                      {g.revokedAt ? "Access revoked" : expired ? "Link expired" : `${Math.max(remaining, 0)} downloads remaining`}
                    </p>
                  </div>
                  {blocked ? (
                    <span className="text-sm text-navy-500">Contact support for help</span>
                  ) : (
                    <a href={`/api/download/${g.id}?t=${encodeURIComponent(token)}`} className="btn-primary" rel="nofollow">Download</a>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {(order.status === "FAILED" || order.status === "CANCELLED") && (
        <>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy-900">Payment not completed</h1>
          <p className="mt-3 text-navy-700">Your payment did not go through, so nothing has been charged and no downloads were unlocked.</p>
          <Link href="/cart" className="btn-primary mt-6">Return to cart</Link>
        </>
      )}

      {order.status === "REFUNDED" && (
        <>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy-900">This order was refunded</h1>
          <p className="mt-3 text-navy-700">Download access for this order has ended following the refund.</p>
        </>
      )}

      <section className="mt-10 rounded-xl border border-navy-100 p-5" aria-labelledby="summary-h">
        <h2 id="summary-h" className="font-semibold text-navy-900">Order summary</h2>
        <dl className="mt-3 space-y-1 text-sm">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between"><dt className="text-navy-700">{i.titleSnapshot}</dt><dd>{formatMoney(i.unitAmount, order.currency)}</dd></div>
          ))}
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-teal-800"><dt>Discount ({order.discountCodeText})</dt><dd>−{formatMoney(order.discountAmount, order.currency)}</dd></div>
          )}
          <div className="flex justify-between border-t border-navy-100 pt-2 font-semibold"><dt>Total ({order.currency})</dt><dd>{formatMoney(order.totalAmount, order.currency)}</dd></div>
          {order.refundedAmount > 0 && (
            <div className="flex justify-between text-navy-600"><dt>Refunded</dt><dd>−{formatMoney(order.refundedAmount, order.currency)}</dd></div>
          )}
        </dl>
        <p className="mt-4 text-xs text-navy-500">
          Need help? See <Link href="/support" className="underline">Support</Link>
          {settings.supportEmail && <> or email {settings.supportEmail}</>} and quote your order reference.
        </p>
      </section>
    </div>
  );
}
