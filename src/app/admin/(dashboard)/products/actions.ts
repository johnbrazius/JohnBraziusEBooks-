"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { storage } from "@/lib/storage";
import { verifyUploaded } from "@/lib/uploads";
import { parsePrices, productFormSchema, publishProblems } from "@/lib/validation";

export type ProductFormState = { ok?: boolean; message?: string; error?: string; problems?: string[]; fieldErrors?: Record<string, string> };

type Intent = "save" | "publish" | "unpublish" | "archive";

export async function saveProduct(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const settings = await getSettings();
  const id = String(form.get("id") ?? "") || null;
  const intent = (String(form.get("intent") ?? "save") as Intent);

  const parsed = productFormSchema.safeParse({
    type: form.get("type"),
    title: form.get("title") ?? "",
    subtitle: form.get("subtitle") ?? "",
    slug: form.get("slug") ?? "",
    shortDescription: form.get("shortDescription") ?? "",
    description: form.get("description") ?? "",
    audience: form.get("audience") ?? "",
    learningOutcomes: form.get("learningOutcomes") ?? "",
    tableOfContents: form.get("tableOfContents") ?? "",
    faq: form.get("faq") ?? "",
    tags: form.get("tags") ?? "",
    fileFormat: form.get("fileFormat") ?? "PDF",
    pageCount: form.get("pageCount") ?? "",
    language: form.get("language") ?? "English",
    author: form.get("author") ?? "",
    isFeatured: form.get("isFeatured") === "on",
    seoTitle: form.get("seoTitle") ?? "",
    seoDescription: form.get("seoDescription") ?? "",
    coverAlt: form.get("coverAlt") ?? "",
    categoryId: form.get("categoryId") ?? "",
    saleStartsAt: form.get("saleStartsAt") ?? "",
    saleEndsAt: form.get("saleEndsAt") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const v = parsed.data;
  const isDemo = form.get("isDemo") === "on";

  const currencies = form.getAll("price_currency").map(String);
  const amounts = form.getAll("price_amount").map(String);
  const sales = form.getAll("price_sale").map(String);
  const prices = parsePrices(currencies.map((c, i) => ({ currency: c, amount: amounts[i] ?? "", saleAmount: sales[i] ?? "" })));
  if (!prices.ok) return { error: prices.error, fieldErrors: { prices: prices.error } };

  if (v.saleStartsAt && v.saleEndsAt && v.saleEndsAt <= v.saleStartsAt) {
    return { error: "The sale end date must be after the start date.", fieldErrors: { saleEndsAt: "Must be after the start date." } };
  }
  const clash = await db.product.findFirst({ where: { slug: v.slug, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (clash) return { error: "That URL slug is already used by another product.", fieldErrors: { slug: "Already in use — choose another." } };
  if (v.categoryId && !(await db.category.findUnique({ where: { id: v.categoryId } }))) {
    return { error: "Selected category no longer exists.", fieldErrors: { categoryId: "Choose a category." } };
  }

  const bundleIds = v.type === "BUNDLE" ? [...new Set(form.getAll("bundleItems").map(String))].filter((b) => b && b !== id) : [];
  if (bundleIds.length) {
    const valid = await db.product.count({ where: { id: { in: bundleIds }, type: "EBOOK" } });
    if (valid !== bundleIds.length) return { error: "Bundles can only include individual ebooks." };
  }

  const existing = id ? await db.product.findUnique({ where: { id }, include: { files: true } }) : null;
  if (id && !existing) return { error: "Product not found." };

  // Verify any newly uploaded files before touching the database.
  const tickets = { cover: String(form.get("coverTicket") ?? ""), ebook: String(form.get("mainTicket") ?? ""), sample: String(form.get("sampleTicket") ?? "") };
  let cover, main, sample;
  try {
    cover = tickets.cover ? await verifyUploaded(tickets.cover, "cover") : null;
    main = tickets.ebook ? await verifyUploaded(tickets.ebook, "ebook") : null;
    sample = tickets.sample ? await verifyUploaded(tickets.sample, "sample") : null;
  } catch (err) {
    return { error: (err as Error).message };
  }

  const data = {
    type: v.type,
    title: v.title,
    subtitle: v.subtitle ?? null,
    slug: v.slug,
    shortDescription: v.shortDescription,
    description: v.description,
    audience: v.audience,
    learningOutcomes: v.learningOutcomes,
    tableOfContents: v.tableOfContents,
    faq: v.faq as Prisma.InputJsonValue,
    tags: v.tags,
    fileFormat: v.fileFormat,
    pageCount: v.pageCount,
    language: v.language,
    author: v.author ?? null,
    isFeatured: v.isFeatured,
    isDemo,
    seoTitle: v.seoTitle ?? null,
    seoDescription: v.seoDescription ?? null,
    coverAlt: v.coverAlt ?? null,
    categoryId: v.categoryId ?? null,
    saleStartsAt: v.saleStartsAt,
    saleEndsAt: v.saleEndsAt,
  };

  const removeCover = form.get("removeCover") === "on";
  const removeSample = form.get("removeSample") === "on";
  const staleFiles: string[] = [];

  const productId = await db.$transaction(async (tx) => {
    const p = existing
      ? await tx.product.update({ where: { id: existing.id }, data })
      : await tx.product.create({ data: { ...data, status: "DRAFT" } });

    await tx.productPrice.deleteMany({ where: { productId: p.id } });
    if (prices.prices.length) await tx.productPrice.createMany({ data: prices.prices.map((x) => ({ ...x, productId: p.id })) });

    await tx.bundleItem.deleteMany({ where: { bundleId: p.id } });
    if (bundleIds.length) await tx.bundleItem.createMany({ data: bundleIds.map((productId) => ({ bundleId: p.id, productId })) });

    if (cover || removeCover) {
      if (existing?.coverPath && existing.coverPath !== cover?.path) staleFiles.push(existing.coverPath);
      await tx.product.update({ where: { id: p.id }, data: { coverPath: cover?.path ?? null } });
    }
    for (const [kind, f] of [["MAIN", main], ["SAMPLE", sample]] as const) {
      const old = existing?.files.find((x) => x.kind === kind);
      if (f) {
        if (old && old.storagePath !== f.path) staleFiles.push(old.storagePath);
        await tx.productFile.upsert({
          where: { productId_kind: { productId: p.id, kind } },
          update: { storagePath: f.path, fileName: f.fileName, mimeType: f.contentType, sizeBytes: f.sizeBytes },
          create: { productId: p.id, kind, storagePath: f.path, fileName: f.fileName, mimeType: f.contentType, sizeBytes: f.sizeBytes },
        });
      } else if (kind === "SAMPLE" && removeSample && old) {
        staleFiles.push(old.storagePath);
        await tx.productFile.delete({ where: { id: old.id } });
      }
    }
    return p.id;
  });

  // Old files are only deleted after the database points at the new ones. Paid files that past orders still
  // need are never deleted here — orders always resolve to the product's CURRENT main file.
  await Promise.all(staleFiles.map((f) => storage.remove(f)));

  let outcome = existing ? "saved" : "created";
  let problems: string[] = [];
  const loadForCheck = () =>
    db.product.findUniqueOrThrow({ where: { id: productId }, include: { prices: true, files: true, _count: { select: { bundleItems: true } } } });
  const check = (p: Awaited<ReturnType<typeof loadForCheck>>) =>
    publishProblems({
      type: p.type,
      title: p.title,
      shortDescription: p.shortDescription,
      description: p.description,
      categoryId: p.categoryId,
      prices: p.prices,
      hasMainFile: p.files.some((f) => f.kind === "MAIN"),
      bundleCount: p._count.bundleItems,
      baseCurrency: settings.baseCurrency,
    });

  if (intent === "publish") {
    const p = await loadForCheck();
    problems = check(p);
    if (problems.length) outcome = "blocked";
    else {
      await db.product.update({ where: { id: productId }, data: { status: "PUBLISHED", publishedAt: p.publishedAt ?? new Date() } });
      outcome = "published";
    }
  } else if (intent === "unpublish") {
    await db.product.update({ where: { id: productId }, data: { status: "DRAFT" } });
    outcome = "unpublished";
  } else if (intent === "archive") {
    await db.product.update({ where: { id: productId }, data: { status: "ARCHIVED", isFeatured: false } });
    outcome = "archived";
  } else if (existing?.status === "PUBLISHED") {
    // Saving a live product must not leave it in a state that cannot be sold.
    problems = check(await loadForCheck());
    if (problems.length) {
      await db.product.update({ where: { id: productId }, data: { status: "DRAFT" } });
      outcome = "demoted";
    }
  }

  revalidatePath("/", "layout");
  // Redirect (rather than returning state) so the form re-renders from fresh data and upload tickets reset.
  const qs = new URLSearchParams({ r: outcome });
  if (problems.length) qs.set("p", problems.join("|"));
  redirect(`/admin/products/${productId}?${qs}`);
}

export async function deleteProduct(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const product = await db.product.findUnique({ where: { id }, include: { files: true, _count: { select: { orderItems: true } } } });
  if (!product) redirect("/admin/products");
  if (product._count.orderItems > 0) {
    // Customers who bought it must keep access — archive instead of deleting.
    await db.product.update({ where: { id }, data: { status: "ARCHIVED", isFeatured: false } });
    redirect(`/admin/products/${id}?archived=1`);
  }
  await db.product.delete({ where: { id } });
  await Promise.all([...product.files.map((f) => f.storagePath), ...(product.coverPath ? [product.coverPath] : [])].map((p) => storage.remove(p)));
  revalidatePath("/", "layout");
  redirect("/admin/products?deleted=1");
}
