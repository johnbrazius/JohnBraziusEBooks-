import { dailySales, productViews, salesSummary, topProducts } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";
import { PageHeader, Stat, Table, Notice } from "@/components/admin/ui";

export const metadata = { title: "Analytics" };
type SP = Promise<{ days?: string }>;

export default async function AnalyticsPage({ searchParams }: { searchParams: SP }) {
  const { days: d } = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(d)) ? Number(d) : 30;
  const since = new Date(Date.now() - days * 86_400_000);
  const [summary, top, daily, views] = await Promise.all([salesSummary(since), topProducts(10, since), dailySales(days), productViews(days)]);
  const currencies = [...new Set(daily.map((r) => r.currency))];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="All figures are calculated from recorded orders only."
        actions={
          <form className="flex gap-2">
            <select name="days" defaultValue={String(days)} className="input">
              {[7, 30, 90, 365].map((n) => <option key={n} value={n}>Last {n} days</option>)}
            </select>
            <button className="btn-secondary">Apply</button>
          </form>
        }
      />
      <Notice>
        <strong>Gross sales</strong> = what customers paid. <strong>Net</strong> = gross minus refunds. Neither is your bank payout: payment-provider fees,
        GST on those fees, international-card charges and currency conversion are deducted by the provider. Use your provider’s settlement reports for payouts.
      </Notice>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Paid orders" value={String(summary.orders)} />
        <Stat label="Orders with refunds" value={String(summary.refundedOrders)} />
      </div>
      {summary.currencies.length === 0 ? (
        <div className="mt-6"><Notice>No sales in this period.</Notice></div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summary.currencies.map((c) => (
            <div key={c.currency} className="card p-5 text-sm">
              <p className="text-xs font-semibold uppercase text-navy-500">{c.currency} · {c.orders} orders</p>
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between"><dt>Gross</dt><dd className="font-semibold">{formatMoney(c.gross, c.currency)}</dd></div>
                <div className="flex justify-between"><dt>Refunds</dt><dd>−{formatMoney(c.refunds, c.currency)}</dd></div>
                <div className="flex justify-between border-t border-navy-100 pt-1"><dt>Net of refunds</dt><dd className="font-semibold">{formatMoney(c.net, c.currency)}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">Best-performing products</h2>
          {top.length === 0 ? <Notice>No sales yet.</Notice> : (
            <Table><thead><tr><th>Product</th><th>Units sold</th></tr></thead>
              <tbody>{top.map((t) => <tr key={`${t.productId}-${t.title}`}><td>{t.title}</td><td>{t.units}</td></tr>)}</tbody></Table>
          )}
        </div>
        <div>
          <h2 className="mb-3 font-semibold">Product page views</h2>
          {views.length === 0 ? <Notice>No views recorded yet.</Notice> : (
            <Table><thead><tr><th>Product</th><th>Views</th></tr></thead>
              <tbody>{views.map((v) => <tr key={v.productId}><td>{v.title}</td><td>{v.views}</td></tr>)}</tbody></Table>
          )}
          <p className="hint">Anonymous daily counts; known bots excluded. No cookies or IP addresses are stored.</p>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Sales by date</h2>
      {daily.length === 0 ? <Notice>No sales in this period.</Notice> : (
        <Table>
          <thead><tr><th>Date</th>{currencies.map((c) => <th key={c}>{c} orders</th>)}{currencies.map((c) => <th key={c + "g"}>{c} gross</th>)}</tr></thead>
          <tbody>
            {[...new Set(daily.map((r) => r.day))].reverse().map((day) => (
              <tr key={day}>
                <td>{day}</td>
                {currencies.map((c) => <td key={c}>{daily.find((r) => r.day === day && r.currency === c)?.orders ?? 0}</td>)}
                {currencies.map((c) => { const r = daily.find((x) => x.day === day && x.currency === c); return <td key={c + "g"}>{r ? formatMoney(r.gross, c) : "—"}</td>; })}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
