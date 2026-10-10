import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { CategoryForm } from "./CategoryForm";
import { deleteCategory, moveCategory } from "./actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const metadata = { title: "Categories" };

export default async function CategoriesAdmin() {
  const cats = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageHeader title="Categories" description="Order here controls the order on the storefront." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {cats.map((c, i) => (
            <details key={c.id} className="card p-4">
              <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-navy-900">{c.name}</span>
                <span className="text-xs text-navy-500">/categories/{c.slug} · {c._count.products} product(s)</span>
                <span className="ml-auto flex gap-1">
                  <form action={moveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="up" /><button className="btn-ghost px-2 py-1" disabled={i === 0} aria-label={`Move ${c.name} up`}>↑</button></form>
                  <form action={moveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="down" /><button className="btn-ghost px-2 py-1" disabled={i === cats.length - 1} aria-label={`Move ${c.name} down`}>↓</button></form>
                </span>
              </summary>
              <div className="mt-4 border-t border-navy-100 pt-4">
                <CategoryForm initial={{ id: c.id, name: c.name, slug: c.slug, description: c.description, seoTitle: c.seoTitle ?? "", seoDescription: c.seoDescription ?? "" }} />
                <form action={deleteCategory} className="mt-4 flex flex-wrap items-end gap-2 rounded-lg bg-red-50 p-3">
                  <input type="hidden" name="id" value={c.id} />
                  <label className="text-sm text-red-900">
                    Move its products to:
                    <select name="moveTo" className="input mt-1">
                      <option value="">(none — published products return to draft)</option>
                      {cats.filter((x) => x.id !== c.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </label>
                  <ConfirmButton className="btn-danger" message={`Delete the category “${c.name}”?`}>Delete category</ConfirmButton>
                </form>
              </div>
            </details>
          ))}
        </div>
        <div className="card h-fit p-5">
          <h2 className="mb-3 font-semibold text-navy-900">New category</h2>
          <CategoryForm />
        </div>
      </div>
    </>
  );
}
