import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney, fromMinor } from "@/lib/money";
import { orderUrl } from "@/lib/orders";
import { PageHeader, BackLink, StatusBadge, Table } from "@/components/admin/ui";
import { grantAction, resendEmail } from "../actions";
import { RefundForm } from "./RefundForm";

export const metadata = { title: "Order" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, grants: { include: { product: { select: { title: true } } } }, events: { orderBy: { receivedAt: "desc" } }, refunds: true },
  });
  if (!order) notFound();
  const refundable = (order.status === "PAID" || order.status === "PARTIALLY_REFUNDED") && order.provider !== "free";

  return (
    <>
      <BackLink href="/admin/orders">Orders</BackLink>
      <PageHeader title={`Order ${order.reference}`} actions={<StatusBadge status={order.status} />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5 text-sm">
          <h2 className="mb-3 font-semibold">Details</h2>
          <dl className="grid grid-cols-[140px_1fr] gap-y-1.5">
            <dt className="text-navy-500">Customer email</dt><dd>{order.email}</dd>
            <dt className="text-navy-500">Created</dt><dd>{order.createdAt.toLocaleString("en-GB")}</dd>
            <dt className="text-navy-500">Paid</dt><dd>{order.paidAt?.toLocaleString("en-GB") ?? "—"}</dd>
            <dt className="text-navy-500">Provider</dt><dd>{order.provider}</dd>
            <dt className="text-navy-500">Provider order</dt><dd className="break-all font-mono text-xs">{order.providerOrderId ?? "—"}</dd>
            <dt className="text-navy-500">Payment ID</dt><dd className="break-all font-mono text-xs">{order.providerPaymentId ?? "—"}</dd>
            <dt className="text-navy-500">Email delivery</dt><dd><StatusBadge status={order.emailStatus} /></dd>
            {order.failureReason && (<><dt className="text-navy-500">Note</dt><dd className="text-red-700">{order.failureReason}</dd></>)}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {(order.status === "PAID" || order.status === "PARTIALLY_REFUNDED") && (
              <>
                <form action={resendEmail}><input type="hidden" name="id" value={order.id} /><button className="btn-secondary text-xs">Resend download email</button></form>
                <Link href={orderUrl(order)} target="_blank" className="btn-secondary text-xs">Open customer download page ↗</Link>
              </>
            )}
          </div>
        </div>
        <div className="card p-5 text-sm">
          <h2 className="mb-3 font-semibold">Items</h2>
          <ul className="space-y-1">
            {order.items.map((i) => <li key={i.id} className="flex justify-between"><span>{i.titleSnapshot}{i.productType === "BUNDLE" && " (bundle)"}</span><span>{formatMoney(i.unitAmount, order.currency)}</span></li>)}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-navy-100 pt-3">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotalAmount, order.currency)}</dd></div>
            {order.discountAmount > 0 && <div className="flex justify-between"><dt>Discount ({order.discountCodeText})</dt><dd>−{formatMoney(order.discountAmount, order.currency)}</dd></div>}
            <div className="flex justify-between font-semibold"><dt>Total charged</dt><dd>{formatMoney(order.totalAmount, order.currency)}</dd></div>
            {order.refundedAmount > 0 && <div className="flex justify-between text-purple-800"><dt>Refunded</dt><dd>−{formatMoney(order.refundedAmount, order.currency)}</dd></div>}
          </dl>
          {refundable && <RefundForm id={order.id} currency={order.currency} max={fromMinor(order.totalAmount - order.refundedAmount, order.currency)} />}
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Download access</h2>
      {order.grants.length === 0 ? <p className="text-sm text-navy-600">No downloads granted (order not paid).</p> : (
        <Table>
          <thead><tr><th>Product</th><th>Downloads</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {order.grants.map((g) => (
              <tr key={g.id}>
                <td>{g.product.title}</td>
                <td>{g.downloadCount} / {g.maxDownloads}</td>
                <td>{g.expiresAt?.toLocaleDateString("en-GB") ?? "never"}</td>
                <td>{g.revokedAt ? <span className="badge bg-red-100 text-red-800">revoked</span> : <span className="badge bg-teal-100 text-teal-800">active</span>}</td>
                <td className="flex gap-2">
                  <form action={grantAction}><input type="hidden" name="grantId" value={g.id} /><input type="hidden" name="op" value={g.revokedAt ? "restore" : "revoke"} /><button className="text-xs text-teal-700 underline">{g.revokedAt ? "Restore" : "Revoke"}</button></form>
                  <form action={grantAction}><input type="hidden" name="grantId" value={g.id} /><input type="hidden" name="op" value="reset" /><button className="text-xs text-teal-700 underline">Reset count</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {order.refunds.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-semibold">Refunds</h2>
          <Table>
            <thead><tr><th>Refund ID</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{order.refunds.map((r) => <tr key={r.id}><td className="font-mono text-xs">{r.providerRefundId}</td><td>{formatMoney(r.amount, order.currency)}</td><td>{r.status}</td><td>{r.createdAt.toLocaleString("en-GB")}</td></tr>)}</tbody>
          </Table>
        </>
      )}

      <h2 className="mb-3 mt-8 font-semibold">Payment events</h2>
      {order.events.length === 0 ? <p className="text-sm text-navy-600">No webhook events linked to this order.</p> : (
        <Table>
          <thead><tr><th>Event</th><th>Received</th><th>Processed</th></tr></thead>
          <tbody>{order.events.map((e) => <tr key={e.id}><td>{e.type}</td><td>{e.receivedAt.toLocaleString("en-GB")}</td><td>{e.processedAt ? "✓" : e.error ?? "pending"}</td></tr>)}</tbody>
        </Table>
      )}
    </>
  );
}
