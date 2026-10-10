"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SLUG_RE, slugify } from "@/lib/slug";

export type CatState = { ok?: boolean; error?: string; message?: string };

const schema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(60),
  slug: z.string().trim().toLowerCase().max(60),
  description: z.string().trim().max(2000),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(170),
});

export async function saveCategory(_prev: CatState, form: FormData): Promise<CatState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "") || null;
  const parsed = schema.safeParse(Object.fromEntries(["name", "slug", "description", "seoTitle", "seoDescription"].map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const slug = v.slug || slugify(v.name);
  if (!SLUG_RE.test(slug)) return { error: "Slug may contain only lower-case letters, numbers and hyphens." };
  const clash = await db.category.findFirst({ where: { slug, ...(id ? { NOT: { id } } : {}) } });
  if (clash) return { error: "Another category already uses that slug." };
  const data = { name: v.name, slug, description: v.description, seoTitle: v.seoTitle || null, seoDescription: v.seoDescription || null };
  if (id) await db.category.update({ where: { id }, data });
  else {
    const max = await db.category.aggregate({ _max: { sortOrder: true } });
    await db.category.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  }
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Category updated." : "Category created." };
}

export async function moveCategory(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const dir = form.get("dir") === "up" ? -1 : 1;
  const all = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
  const i = all.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((c, idx) => db.category.update({ where: { id: c.id }, data: { sortOrder: idx } })));
  revalidatePath("/", "layout");
}

/** Deletes a category, first moving its products to another category (or leaving them uncategorised). */
export async function deleteCategory(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const moveTo = String(form.get("moveTo") ?? "") || null;
  if (moveTo === id) return;
  await db.$transaction(async (tx) => {
    if (moveTo) await tx.product.updateMany({ where: { categoryId: id }, data: { categoryId: moveTo } });
    else {
      // Uncategorised products cannot stay published (category is required to publish).
      await tx.product.updateMany({ where: { categoryId: id, status: "PUBLISHED" }, data: { status: "DRAFT" } });
    }
    await tx.category.delete({ where: { id } });
  });
  revalidatePath("/", "layout");
}
