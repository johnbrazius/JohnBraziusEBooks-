"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { toMinor } from "@/lib/money";

export type DiscountState = { ok?: boolean; error?: string; message?: string };

const schema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/, "Code: 3–40 letters, numbers, - or _."),
  description: z.string().trim().max(200),
  type: z.enum(["PERCENT", "FIXED"]),
  percentOff: z.string().trim(),
  amountOff: z.string().trim(),
  currency: z.string().trim().toUpperCase(),
  minSubtotal: z.string().trim(),
  startsAt: z.string().trim(),
  endsAt: z.string().trim(),
  maxRedemptions: z.string().trim(),
});

export async function saveDiscount(_prev: DiscountState, form: FormData): Promise<DiscountState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "") || null;
  const parsed = schema.safeParse(Object.fromEntries(Object.keys(schema.shape).map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const currency = v.currency || null;
  if (currency && !/^[A-Z]{3}$/.test(currency)) return { error: "Currency must be a 3-letter code." };

  let percentOff: number | null = null;
  let amountOff: number | null = null;
  if (v.type === "PERCENT") {
    percentOff = Number(v.percentOff);
    if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) return { error: "Percent off must be a whole number from 1 to 100." };
  } else {
    if (!currency) return { error: "A fixed-amount discount needs a currency." };
    amountOff = toMinor(v.amountOff, currency);
    if (!amountOff || amountOff <= 0) return { error: "Enter a valid amount off." };
  }
  let minSubtotal: number | null = null;
  if (v.minSubtotal) {
    if (!currency) return { error: "A minimum order amount needs a currency." };
    minSubtotal = toMinor(v.minSubtotal, currency);
    if (minSubtotal == null) return { error: "Invalid minimum order amount." };
  }
  const startsAt = v.startsAt ? new Date(v.startsAt) : null;
  const endsAt = v.endsAt ? new Date(v.endsAt) : null;
  if ((startsAt && isNaN(+startsAt)) || (endsAt && isNaN(+endsAt))) return { error: "Invalid date." };
  if (startsAt && endsAt && endsAt <= startsAt) return { error: "End date must be after start date." };
  const maxRedemptions = v.maxRedemptions ? Number(v.maxRedemptions) : null;
  if (maxRedemptions != null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) return { error: "Usage limit must be a positive whole number." };

  const productIds = form.getAll("productIds").map(String).filter(Boolean);
  const appliesToAll = productIds.length === 0;
  const clash = await db.discountCode.findFirst({ where: { code: v.code, ...(id ? { NOT: { id } } : {}) } });
  if (clash) return { error: "That code already exists." };

  const data = {
    code: v.code, description: v.description || null, type: v.type, percentOff, amountOff, currency, minSubtotal, startsAt, endsAt, maxRedemptions,
    active: form.get("active") === "on", appliesToAll,
    products: { set: productIds.map((pid) => ({ id: pid })) },
  };
  if (id) await db.discountCode.update({ where: { id }, data });
  else await db.discountCode.create({ data: { ...data, products: { connect: productIds.map((pid) => ({ id: pid })) } } });
  revalidatePath("/admin/discounts");
  return { ok: true, message: id ? "Discount updated." : "Discount created." };
}

export async function toggleDiscount(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const d = await db.discountCode.findUnique({ where: { id } });
  if (d) await db.discountCode.update({ where: { id }, data: { active: !d.active } });
  revalidatePath("/admin/discounts");
}
