import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader, BackLink } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "New ebook" };

export default async function NewProductPage() {
  const [settings, categories, ebooks] = await Promise.all([
    getSettings(),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.product.findMany({ where: { type: "EBOOK", status: { not: "ARCHIVED" } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  return (
    <>
      <BackLink href="/admin/products">Products</BackLink>
      <PageHeader title="New ebook" description="Saved as a draft. Nothing is visible to customers until you publish." />
      <ProductForm categories={categories} ebooks={ebooks} baseCurrency={settings.baseCurrency} suggestedCurrencies={settings.displayCurrencies} />
    </>
  );
}
