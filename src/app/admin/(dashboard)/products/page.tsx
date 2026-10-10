import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { PageHeader, StatusBadge, Table, Notice } from "@/components/admin/ui";

type SP = Promise<{ q?: string; status?: string; demo?: string; deleted?: string }>;

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const where: Prisma.ProductWhereInput = {};
  if (sp.q) where.title = { contains: sp.q.slice(0, 100), mode: "insensitive" };
  if (sp.status && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(sp.status)) where.status = sp.status as "DRAFT";
  if (sp.demo) where.isDemo = true;
  const products = await db.product.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { category: { select: { name: true } }, prices: true, _count: { select: { orderItems: true } } },
    take: 200,
  });

  return (
    <>
      <PageHeader title="Products" description="Ebooks and bundles in your catalogue." actions={<Link href="/admin/products/new" className="btn-primary">+ New ebook</Link>} />
      {sp.deleted && <div className="mb-4"><Notice kind="success">Product deleted.</Notice></div>}
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search titles" className="input max-w-xs" />
        <select name="status" defaultValue={sp.status ?? ""} className="input max-w-[180px]">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="demo" value="1" defaultChecked={!!sp.demo} /> Demo only</label>
        <button className="btn-secondary">Filter</button>
      </form>
      {products.length === 0 ? (
        <Notice>No products found. <Link href="/admin/products/new" className="underline">Create your first ebook</Link>.</Notice>
      ) : (
        <Table>
          <thead><tr><th>Title</th><th>Status</th><th>Category</th><th>Price ({settings.baseCurrency})</th><th>Other prices</th><th>Orders</th><th>Updated</th></tr></thead>
          <tbody>
            {products.map((p) => {
              const base = p.prices.find((x) => x.currency === settings.baseCurrency);
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/products/${p.id}`} className="font-medium text-navy-900 hover:text-teal-700">{p.title}</Link>
                    <div className="mt-0.5 flex gap-1">
                      {p.type === "BUNDLE" && <span className="badge bg-navy-100 text-navy-700">bundle</span>}
                      {p.isFeatured && <span className="badge bg-teal-50 text-teal-800">featured</span>}
                      {p.isDemo && <span className="badge bg-amber-100 text-amber-900">demo</span>}
                    </div>
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{p.category?.name ?? <span className="text-navy-400">—</span>}</td>
                  <td>{base ? formatMoney(base.amount, base.currency) : <span className="text-red-700">missing</span>}</td>
                  <td className="text-xs text-navy-600">{p.prices.filter((x) => x.currency !== settings.baseCurrency).map((x) => formatMoney(x.amount, x.currency)).join(", ") || "—"}</td>
                  <td>{p._count.orderItems}</td>
                  <td className="text-xs text-navy-600">{p.updatedAt.toLocaleDateString("en-GB")}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
