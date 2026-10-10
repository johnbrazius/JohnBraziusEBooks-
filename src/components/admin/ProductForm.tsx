"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { saveProduct, type ProductFormState } from "@/app/admin/(dashboard)/products/actions";
import { slugify } from "@/lib/slug";
import { COMMON_CURRENCIES } from "@/lib/money";
import { FileUpload } from "./FileUpload";

type PriceRow = { currency: string; amount: string; saleAmount: string };

export type ProductInitial = {
  id: string;
  status: string;
  type: "EBOOK" | "BUNDLE";
  title: string;
  subtitle: string;
  slug: string;
  shortDescription: string;
  description: string;
  audience: string;
  learningOutcomes: string;
  tableOfContents: string;
  faq: string;
  tags: string;
  fileFormat: string;
  pageCount: string;
  language: string;
  author: string;
  isFeatured: boolean;
  isDemo: boolean;
  seoTitle: string;
  seoDescription: string;
  coverAlt: string;
  categoryId: string;
  saleStartsAt: string;
  saleEndsAt: string;
  prices: PriceRow[];
  bundleItems: string[];
  coverUrl: string | null;
  mainFile: { fileName: string; sizeBytes: number } | null;
  sampleFile: { fileName: string; sizeBytes: number } | null;
};

function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}

function Section({ title, children, description }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="card space-y-4 p-6">
      <legend className="sr-only">{title}</legend>
      <div>
        <h2 className="font-semibold text-navy-900">{title}</h2>
        {description && <p className="text-xs text-navy-500">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}

function setIntent(intent: string) {
  return (e: React.MouseEvent<HTMLButtonElement>) => {
    const field = e.currentTarget.form?.elements.namedItem("intent");
    if (field instanceof HTMLInputElement) field.value = intent;
  };
}

export function ProductForm({
  initial,
  categories,
  ebooks,
  baseCurrency,
  suggestedCurrencies,
}: {
  initial?: ProductInitial;
  categories: { id: string; name: string }[];
  ebooks: { id: string; title: string }[];
  baseCurrency: string;
  suggestedCurrencies: string[];
}) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct, {});
  const [type, setType] = useState<"EBOOK" | "BUNDLE">(initial?.type ?? "EBOOK");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [shortDesc, setShortDesc] = useState(initial?.shortDescription ?? "");
  const [seoDesc, setSeoDesc] = useState(initial?.seoDescription ?? "");
  const [prices, setPrices] = useState<PriceRow[]>(
    initial?.prices.length
      ? initial.prices
      : [...new Set([baseCurrency, ...suggestedCurrencies])].slice(0, 2).map((c) => ({ currency: c, amount: "", saleAmount: "" })),
  );
  const fe = state.fieldErrors ?? {};
  const published = initial?.status === "PUBLISHED";

  return (
    <form action={action} className="space-y-6" noValidate>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {/* Set synchronously by each submit button; more reliable than relying on the submitter's name/value. */}
      <input type="hidden" name="intent" defaultValue="save" />

      {(state.error || state.message) && (
        <div role={state.error ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${state.error ? "border-red-200 bg-red-50 text-red-800" : "border-teal-200 bg-teal-50 text-teal-900"}`}>
          <p className="font-medium">{state.error ?? state.message}</p>
          {state.problems && <ul className="mt-1 list-disc pl-5">{state.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}

      <Section title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product type" name="type">
            <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as "EBOOK" | "BUNDLE")} className="input">
              <option value="EBOOK">Ebook (single downloadable file)</option>
              <option value="BUNDLE">Bundle (several ebooks at one price)</option>
            </select>
          </Field>
          <Field label="Category" name="categoryId" error={fe.categoryId}>
            <select id="categoryId" name="categoryId" defaultValue={initial?.categoryId ?? ""} className="input">
              <option value="">— Choose a category —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Title *" name="title" error={fe.title}>
          <input
            id="title" name="title" required maxLength={160} className="input" value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="Subtitle" name="subtitle" error={fe.subtitle}>
          <input id="subtitle" name="subtitle" maxLength={200} defaultValue={initial?.subtitle} className="input" />
        </Field>
        <Field label="URL slug *" name="slug" error={fe.slug} hint={`Product URL: /ebooks/${slug || "your-slug"}${published ? " — changing this on a live product breaks existing links." : ""}`}>
          <input id="slug" name="slug" required maxLength={80} className="input font-mono" value={slug} onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true); }} />
        </Field>
        <Field label={`Short description * (${shortDesc.length}/300)`} name="shortDescription" error={fe.shortDescription} hint="Shown on product cards and used as the default meta description.">
          <textarea id="shortDescription" name="shortDescription" rows={2} maxLength={300} className="input" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
        </Field>
        <Field label="Full description *" name="description" error={fe.description} hint="Markdown supported: **bold**, _italic_, ## headings, - lists, [links](https://…).">
          <textarea id="description" name="description" rows={10} defaultValue={initial?.description} className="input font-mono text-xs" />
        </Field>
      </Section>

      <Section title="Pricing" description={`A price in ${baseCurrency} (the store's base currency) is required. Add fixed prices for other markets, e.g. INR for India. Only currencies your payment account can charge are offered at checkout.`}>
        <div className="space-y-2">
          <div className="grid grid-cols-[100px_1fr_1fr_40px] gap-2 text-xs font-semibold text-navy-600">
            <span>Currency</span><span>Price</span><span>Sale price (optional)</span><span />
          </div>
          {prices.map((row, i) => (
            <div key={i} className="grid grid-cols-[100px_1fr_1fr_40px] gap-2">
              <input aria-label="Currency" name="price_currency" list="currency-list" value={row.currency} maxLength={3} className="input uppercase"
                onChange={(e) => setPrices(prices.map((r, j) => (j === i ? { ...r, currency: e.target.value.toUpperCase() } : r)))} />
              <input aria-label={`Price in ${row.currency}`} name="price_amount" inputMode="decimal" placeholder="10.00" value={row.amount} className="input"
                onChange={(e) => setPrices(prices.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))} />
              <input aria-label={`Sale price in ${row.currency}`} name="price_sale" inputMode="decimal" placeholder="—" value={row.saleAmount} className="input"
                onChange={(e) => setPrices(prices.map((r, j) => (j === i ? { ...r, saleAmount: e.target.value } : r)))} />
              <button type="button" aria-label="Remove price" className="btn-ghost px-2" onClick={() => setPrices(prices.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <datalist id="currency-list">{COMMON_CURRENCIES.map((c) => <option key={c} value={c} />)}</datalist>
          <button type="button" className="btn-secondary text-xs" onClick={() => setPrices([...prices, { currency: "", amount: "", saleAmount: "" }])}>+ Add currency</button>
          {fe.prices && <p className="text-xs font-medium text-red-700">{fe.prices}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sale starts" name="saleStartsAt" error={fe.saleStartsAt} hint="Leave empty to start immediately.">
            <input id="saleStartsAt" name="saleStartsAt" type="datetime-local" defaultValue={initial?.saleStartsAt} className="input" />
          </Field>
          <Field label="Sale ends" name="saleEndsAt" error={fe.saleEndsAt} hint="Leave empty for no end date.">
            <input id="saleEndsAt" name="saleEndsAt" type="datetime-local" defaultValue={initial?.saleEndsAt} className="input" />
          </Field>
        </div>
      </Section>

      <Section title="Files" description="Ebook files are stored privately and only delivered after verified payment. Covers are public.">
        <div className="grid gap-6 sm:grid-cols-[160px_1fr]">
          <div className="relative aspect-[3/4] overflow-hidden rounded bg-navy-100">
            {initial?.coverUrl ? <Image src={initial.coverUrl} alt="" fill className="object-cover" sizes="160px" /> : <span className="grid h-full place-items-center p-2 text-center text-xs text-navy-500">No cover — a typographic cover is generated automatically</span>}
          </div>
          <div className="space-y-4">
            <FileUpload kind="cover" name="coverTicket" label="Cover image" productId={initial?.id} hint="JPG, PNG or WebP, max 5 MB. Recommended 1200×1600 px (3:4)." />
            {initial?.coverUrl && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeCover" /> Remove current cover</label>}
            <Field label="Cover alt text" name="coverAlt" hint="Describe the cover for screen readers, e.g. “Cover of The Small Business Website & SEO Playbook”.">
              <input id="coverAlt" name="coverAlt" maxLength={200} defaultValue={initial?.coverAlt} className="input" />
            </Field>
          </div>
        </div>
        {type === "EBOOK" && (
          <FileUpload kind="ebook" name="mainTicket" label="Downloadable ebook file *" productId={initial?.id} current={initial?.mainFile} hint="PDF, EPUB or ZIP, max 200 MB. Customers who already bought this product will receive the new version." />
        )}
        <FileUpload kind="sample" name="sampleTicket" label="Free sample / preview (optional)" productId={initial?.id} current={initial?.sampleFile} hint="PDF or EPUB, max 25 MB. Anyone can download this from the product page." />
        {initial?.sampleFile && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeSample" /> Remove current sample</label>}
      </Section>

      {type === "BUNDLE" && (
        <Section title="Bundle contents" description="Customers who buy the bundle get download access to each selected ebook.">
          {ebooks.length === 0 ? <p className="text-sm text-navy-600">Create some ebooks first.</p> : (
            <div className="grid gap-2 sm:grid-cols-2">
              {ebooks.map((e) => (
                <label key={e.id} className="flex items-center gap-2 rounded-lg border border-navy-100 p-2 text-sm">
                  <input type="checkbox" name="bundleItems" value={e.id} defaultChecked={initial?.bundleItems.includes(e.id)} />
                  {e.title}
                </label>
              ))}
            </div>
          )}
        </Section>
      )}

      <Section title="Product page content">
        <Field label="Who this is for" name="audience" hint="Markdown supported.">
          <textarea id="audience" name="audience" rows={4} defaultValue={initial?.audience} className="input" />
        </Field>
        <Field label="What readers will learn" name="learningOutcomes" hint="One outcome per line.">
          <textarea id="learningOutcomes" name="learningOutcomes" rows={5} defaultValue={initial?.learningOutcomes} className="input" />
        </Field>
        <Field label="Table of contents" name="tableOfContents" hint="One chapter per line, or Markdown.">
          <textarea id="tableOfContents" name="tableOfContents" rows={6} defaultValue={initial?.tableOfContents} className="input" />
        </Field>
        <Field label="FAQ" name="faq" hint="Separate each question with a blank line. First line = question, following lines = answer.">
          <textarea id="faq" name="faq" rows={6} defaultValue={initial?.faq} className="input" placeholder={"Do I need technical skills?\nNo — every step is explained.\n\nWhat format is it?\nPDF."} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="File format" name="fileFormat"><input id="fileFormat" name="fileFormat" defaultValue={initial?.fileFormat ?? "PDF"} className="input" /></Field>
          <Field label="Pages" name="pageCount" error={fe.pageCount}><input id="pageCount" name="pageCount" inputMode="numeric" defaultValue={initial?.pageCount} className="input" /></Field>
          <Field label="Language" name="language"><input id="language" name="language" defaultValue={initial?.language ?? "English"} className="input" /></Field>
          <Field label="Author" name="author"><input id="author" name="author" defaultValue={initial?.author} className="input" /></Field>
        </div>
        <Field label="Tags" name="tags" hint="Comma-separated. Used by search.">
          <input id="tags" name="tags" defaultValue={initial?.tags} className="input" placeholder="seo, local seo, small business" />
        </Field>
      </Section>

      <Section title="SEO">
        <Field label="SEO title" name="seoTitle" error={fe.seoTitle} hint="Optional, max 70 characters. Defaults to the product title.">
          <input id="seoTitle" name="seoTitle" maxLength={70} defaultValue={initial?.seoTitle} className="input" />
        </Field>
        <Field label={`Meta description (${seoDesc.length}/170)`} name="seoDescription" error={fe.seoDescription} hint="Optional. Defaults to the short description.">
          <textarea id="seoDescription" name="seoDescription" rows={2} maxLength={170} value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} className="input" />
        </Field>
      </Section>

      <Section title="Visibility">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={initial?.isFeatured} /> Feature on the homepage</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDemo" defaultChecked={initial?.isDemo ?? false} /> Mark as demo product (shows a “Demo product” label)</label>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-navy-100 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button type="submit" onClick={setIntent("save")} className="btn-navy" disabled={pending}>{pending ? "Saving…" : published ? "Save changes" : "Save draft"}</button>
        {!published && <button type="submit" onClick={setIntent("publish")} className="btn-primary" disabled={pending}>Save & publish</button>}
        {published && <button type="submit" onClick={setIntent("unpublish")} className="btn-secondary" disabled={pending}>Unpublish</button>}
        {initial && initial.status !== "ARCHIVED" && <button type="submit" onClick={setIntent("archive")} className="btn-ghost" disabled={pending}>Archive</button>}
        <span className="ml-auto text-xs text-navy-500">Status: {initial?.status?.toLowerCase() ?? "new draft"}</span>
      </div>
    </form>
  );
}
