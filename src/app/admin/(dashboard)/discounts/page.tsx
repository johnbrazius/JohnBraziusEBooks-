import { db } from "@/lib/db";
import { formatMoney, fromMinor } from "@/lib/money";
import { PageHeader, Table } from "@/components/admin/ui";
import { DiscountForm } from "./DiscountForm";
import { toggleDiscount } from "./actions";

export const metadata = { title: "Discounts" };

function local(d: Date | null) {
  return d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
}

export default async function DiscountsPage() {
  const [codes, products] = await Promise.all([
    db.discountCode.findMany({ orderBy: { createdAt: "desc" }, include: { products: { select: { id: true, title: true } } } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  const now = new Date();
  return (
    <>
      <PageHeader title="Discounts & promotions" description="Codes are validated on the server at checkout. Sale prices are set per product; bundles are created as products of type “Bundle”." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {codes.length === 0 ? <p className="text-sm text-navy-600">No discount codes yet.</p> : (
            <Table>
              <thead><tr><th>Code</th><th>Discount</th><th>Window</th><th>Used</th><th>Status</th><th /></tr></thead>
              <tbody>
                {codes.map((c) => {
                  const live = c.active && (!c.startsAt || c.startsAt <= now) && (!c.endsAt || c.endsAt >= now) && (c.maxRedemptions == null || c.redemptionCount < c.maxRedemptions);
                  return (
                    <tr key={c.id}>
                      <td className="font-mono font-semibold">{c.code}<div className="font-sans text-xs font-normal text-navy-500">{c.appliesToAll ? "All products" : c.products.map((p) => p.title).join(", ")}</div></td>
                      <td>{c.type === "PERCENT" ? `${c.percentOff}% off` : formatMoney(c.amountOff!, c.currency!) + " off"}{c.currency && c.type === "PERCENT" ? ` (${c.currency} only)` : ""}</td>
                      <td className="text-xs">{c.startsAt?.toLocaleDateString("en-GB") ?? "now"} → {c.endsAt?.toLocaleDateString("en-GB") ?? "no end"}</td>
                      <td>{c.redemptionCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</td>
                      <td><span className={`badge ${live ? "bg-teal-100 text-teal-800" : "bg-gray-200 text-gray-700"}`}>{live ? "live" : c.active ? "scheduled/expired" : "disabled"}</span></td>
                      <td><form action={toggleDiscount}><input type="hidden" name="id" value={c.id} /><button className="text-xs text-teal-700 underline">{c.active ? "Disable" : "Enable"}</button></form></td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {codes.map((c) => (
            <details key={c.id} className="card p-4">
              <summary className="cursor-pointer text-sm font-medium">Edit {c.code}</summary>
              <div className="mt-3">
                <DiscountForm products={products} initial={{
                  id: c.id, code: c.code, description: c.description ?? "", type: c.type,
                  percentOff: c.percentOff ? String(c.percentOff) : "",
                  amountOff: c.amountOff && c.currency ? fromMinor(c.amountOff, c.currency) : "",
                  currency: c.currency ?? "", minSubtotal: c.minSubtotal && c.currency ? fromMinor(c.minSubtotal, c.currency) : "",
                  startsAt: local(c.startsAt), endsAt: local(c.endsAt), maxRedemptions: c.maxRedemptions ? String(c.maxRedemptions) : "",
                  active: c.active, productIds: c.products.map((p) => p.id),
                }} />
              </div>
            </details>
          ))}
        </div>
        <div className="card h-fit p-5">
          <h2 className="mb-3 font-semibold text-navy-900">New discount code</h2>
          <DiscountForm products={products} />
        </div>
      </div>
    </>
  );
}
