import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { coverUrl } from "@/lib/storage";
import { faqToText } from "@/lib/validation";
import { fromMinor } from "@/lib/money";
import { PageHeader, BackLink, StatusBadge, Notice } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { deleteProduct } from "../actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

type Params = Promise<{ id: string }>;
type SP = Promise<{ r?: string; p?: string; archived?: string }>;

export const metadata = { title: "Edit ebook" };

const RESULTS: Record<string, ["success" | "warn" | "info", string]> = {
  created: ["success", "Draft created. Add files and prices, then publish when ready."],
  saved: ["success", "Saved."],
  published: ["success", "Published — it is now live in the store."],
  unpublished: ["info", "Unpublished — it is no longer visible in the store."],
  archived: ["info", "Archived."],
  blocked: ["warn", "Saved, but not published yet. Fix these first:"],
  demoted: ["warn", "Saved, but the product was moved back to draft because it is incomplete:"],
};

function toLocalInput(d: Date | null) {
  if (!d) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default async function EditProductPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  const product = await db.product.findUnique({
    where: { id },
    include: { prices: true, files: true, bundleItems: { select: { productId: true } }, _count: { select: { orderItems: true } } },
  });
  if (!product) notFound();
  const [settings, categories, ebooks] = await Promise.all([
    getSettings(),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.product.findMany({ where: { type: "EBOOK", id: { not: id }, status: { not: "ARCHIVED" } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  const main = product.files.find((f) => f.kind === "MAIN");
  const sample = product.files.find((f) => f.kind === "SAMPLE");

  return (
    <>
      <BackLink href="/admin/products">Products</BackLink>
      <PageHeader
        title={product.title}
        description={`${product._count.orderItems} order item(s)`}
        actions={
          <>
            <StatusBadge status={product.status} />
            <Link href={`/admin/products/${product.id}/preview`} className="btn-secondary" target="_blank">Preview ↗</Link>
            {product.status === "PUBLISHED" && <Link href={`/ebooks/${product.slug}`} className="btn-secondary" target="_blank">View live ↗</Link>}
          </>
        }
      />
      {sp.r && RESULTS[sp.r] && (
        <div className="mb-4">
          <Notice kind={RESULTS[sp.r][0]}>
            {RESULTS[sp.r][1]}
            {sp.p && <ul className="mt-1 list-disc pl-5">{sp.p.split("|").slice(0, 10).map((x) => <li key={x}>{x}</li>)}</ul>}
          </Notice>
        </div>
      )}
      {sp.archived && <div className="mb-4"><Notice kind="info">This product has orders, so it was archived instead of deleted. Existing customers keep their downloads.</Notice></div>}
      <ProductForm
        key={product.updatedAt.toISOString()}
        categories={categories}
        ebooks={ebooks}
        baseCurrency={settings.baseCurrency}
        suggestedCurrencies={settings.displayCurrencies}
        initial={{
          id: product.id,
          status: product.status,
          type: product.type,
          title: product.title,
          subtitle: product.subtitle ?? "",
          slug: product.slug,
          shortDescription: product.shortDescription,
          description: product.description,
          audience: product.audience,
          learningOutcomes: product.learningOutcomes.join("\n"),
          tableOfContents: product.tableOfContents,
          faq: faqToText(product.faq),
          tags: product.tags.join(", "),
          fileFormat: product.fileFormat,
          pageCount: product.pageCount ? String(product.pageCount) : "",
          language: product.language,
          author: product.author ?? "",
          isFeatured: product.isFeatured,
          isDemo: product.isDemo,
          seoTitle: product.seoTitle ?? "",
          seoDescription: product.seoDescription ?? "",
          coverAlt: product.coverAlt ?? "",
          categoryId: product.categoryId ?? "",
          saleStartsAt: toLocalInput(product.saleStartsAt),
          saleEndsAt: toLocalInput(product.saleEndsAt),
          prices: product.prices.map((p) => ({ currency: p.currency, amount: fromMinor(p.amount, p.currency), saleAmount: p.saleAmount != null ? fromMinor(p.saleAmount, p.currency) : "" })),
          bundleItems: product.bundleItems.map((b) => b.productId),
          coverUrl: coverUrl(product.coverPath),
          mainFile: main ? { fileName: main.fileName, sizeBytes: main.sizeBytes } : null,
          sampleFile: sample ? { fileName: sample.fileName, sizeBytes: sample.sizeBytes } : null,
        }}
      />
      <div className="mt-10 rounded-xl border border-red-200 bg-red-50/50 p-5">
        <h2 className="font-semibold text-red-900">Delete product</h2>
        <p className="mt-1 text-sm text-red-800">
          {product._count.orderItems > 0
            ? "This product has been purchased, so it will be archived (hidden from the store) rather than deleted. Customers keep access."
            : "Permanently deletes this product and its files. This cannot be undone."}
        </p>
        <form action={deleteProduct} className="mt-3">
          <input type="hidden" name="id" value={product.id} />
          <ConfirmButton className="btn-danger" message={`Really delete “${product.title}”?`}>
            {product._count.orderItems > 0 ? "Archive product" : "Delete permanently"}
          </ConfirmButton>
        </form>
      </div>
    </>
  );
}
