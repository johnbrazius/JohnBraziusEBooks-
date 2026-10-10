"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { RESERVED_PAGE_SLUGS, SLUG_RE } from "@/lib/slug";

export type PageState = { ok?: boolean; error?: string; message?: string };

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(SLUG_RE, "Invalid slug.").max(80),
  body: z.string().max(100_000),
  metaDescription: z.string().trim().max(170),
});

export async function savePage(_prev: PageState, form: FormData): Promise<PageState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "") || null;
  const parsed = schema.safeParse({ title: form.get("title"), slug: form.get("slug"), body: form.get("body"), metaDescription: form.get("metaDescription") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  if (RESERVED_PAGE_SLUGS.has(v.slug)) return { error: "That slug is reserved by the store." };
  const clash = await db.page.findFirst({ where: { slug: v.slug, ...(id ? { NOT: { id } } : {}) } });
  if (clash) return { error: "Another page uses that slug." };
  const data = { ...v, metaDescription: v.metaDescription || null, needsReview: form.get("needsReview") === "on", showInFooter: form.get("showInFooter") === "on" };
  const page = id ? await db.page.update({ where: { id }, data }) : await db.page.create({ data });
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/pages/${page.id}`);
  return { ok: true, message: "Page saved." };
}

export async function deletePage(form: FormData) {
  await requireAdmin();
  await db.page.delete({ where: { id: String(form.get("id")) } });
  revalidatePath("/", "layout");
  redirect("/admin/pages");
}
