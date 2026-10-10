import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { PageHeader, StatusBadge, Table, Notice } from "@/components/admin/ui";
import { Pagination } from "@/components/store/Pagination";

export const metadata = { title: "Orders" };
type SP = Promise<{ q?: string; status?: string; page?: string }>;
const STATUSES = ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"];

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {};
  if (sp.status && STATUSES.includes(sp.status)) where.status = sp.status as "PAID";
  if (sp.q) {
    const q = sp.q.trim().slice(0, 100);
    where.OR = [{ reference: { contains: q.toUpperCase() } }, { email: { contains: q.toLowerCase() } }];
  }
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 25, take: 25, include: { items: { select: { titleSnapshot: true } }, grants: { select: { downloadCount: true } } } }),
    db.order.count({ where }),
  ]);
  const qs = (p: number) => `/admin/orders?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Orders" description={`${total} order(s)`} actions={<a download href="/api/admin/export?type=orders" className="btn-secondary">Export CSV</a>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Reference or email" className="input max-w-xs" />
        <select name="status" defaultValue={sp.status ?? ""} className="input max-w-[200px]">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}
        </select>
        <button className="btn-secondary">Filter</button>
      </form>
      {orders.length === 0 ? <Notice>No orders found.</Notice> : (
        <Table>
          <thead><tr><th>Reference</th><th>Products</th><th>Email</th><th>Payment</th><th>Amount</th><th>Refunded</th><th>Delivery</th><th>Date</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link className="font-mono text-teal-700 hover:underline" href={`/admin/orders/${o.id}`}>{o.reference}</Link></td>
                <td className="max-w-[240px] truncate">{o.items.map((i) => i.titleSnapshot).join(", ")}</td>
                <td>{o.email}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{formatMoney(o.totalAmount, o.currency)}</td>
                <td>{o.refundedAmount ? formatMoney(o.refundedAmount, o.currency) : "—"}</td>
                <td className="text-xs">{o.grants.length ? `${o.grants.reduce((s, g) => s + g.downloadCount, 0)} download(s)` : "—"} · email {o.emailStatus.toLowerCase().replace("_", " ")}</td>
                <td className="text-xs">{o.createdAt.toLocaleString("en-GB")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / 25))} makeHref={qs} />
    </>
  );
}
