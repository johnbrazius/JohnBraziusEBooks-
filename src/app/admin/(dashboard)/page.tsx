import Link from "next/link";
import { db } from "@/lib/db";
import { salesSummary } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";
import { PageHeader, Stat, StatusBadge, Table, Notice } from "@/components/admin/ui";

export default async function AdminHome() {
  const [summary, counts, recent, demoCount, reviewPages] = await Promise.all([
    salesSummary(),
    db.product.groupBy({ by: ["status"], _count: { _all: true } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, reference: true, email: true, status: true, totalAmount: true, currency: true, createdAt: true } }),
    db.product.count({ where: { isDemo: true, status: "PUBLISHED" } }),
    db.page.count({ where: { needsReview: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader title="Overview" actions={<Link href="/admin/products/new" className="btn-primary">+ New ebook</Link>} />
      <div className="mb-6 space-y-2">
        {demoCount > 0 && <Notice kind="warn">{demoCount} published product(s) are <strong>demo data</strong>. Replace or archive them before launch. <Link className="underline" href="/admin/products?demo=1">Review</Link></Notice>}
        {reviewPages > 0 && <Notice kind="warn">{reviewPages} legal page(s) are marked <strong>needs review</strong>. <Link className="underline" href="/admin/pages">Review pages</Link></Notice>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Paid orders" value={String(summary.orders)} hint="All time" />
        <Stat label="Published" value={String(count("PUBLISHED"))} hint={`${count("DRAFT")} drafts · ${count("ARCHIVED")} archived`} />
        {summary.currencies.length === 0 ? (
          <Stat label="Gross sales" value="—" hint="No sales recorded yet" />
        ) : (
          summary.currencies.map((c) => <Stat key={c.currency} label={`Gross sales (${c.currency})`} value={formatMoney(c.gross, c.currency)} hint={`Net of refunds: ${formatMoney(c.net, c.currency)}`} />)
        )}
      </div>
      <p className="mt-2 text-xs text-navy-500">Gross = amounts paid by customers. Your bank payout will be lower after payment-provider fees, taxes on fees and any currency conversion.</p>

      <h2 className="mb-3 mt-10 font-semibold text-navy-900">Recent orders</h2>
      {recent.length === 0 ? (
        <Notice>No orders yet.</Notice>
      ) : (
        <Table>
          <thead><tr><th>Reference</th><th>Email</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
          <tbody>
            {recent.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="font-mono text-teal-700 hover:underline">{o.reference}</Link></td>
                <td>{o.email}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{formatMoney(o.totalAmount, o.currency)}</td>
                <td>{o.createdAt.toLocaleString("en-GB")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
