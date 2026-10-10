"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { adminRefund, sendOrderEmail } from "@/lib/orders";
import { toMinor } from "@/lib/money";

export type OrderActionState = { ok?: boolean; error?: string; message?: string };

export async function refundOrder(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  await requireAdmin();
  const id = String(form.get("id"));
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return { error: "Order not found." };
  const amount = toMinor(String(form.get("amount") ?? ""), order.currency);
  if (amount == null) return { error: "Enter a valid amount." };
  try {
    await adminRefund(id, amount);
  } catch (err) {
    return { error: (err as Error).message };
  }
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, message: "Refund requested from the payment provider. Status updates arrive via webhook." };
}

export async function grantAction(form: FormData) {
  await requireAdmin();
  const grantId = String(form.get("grantId"));
  const op = String(form.get("op"));
  const data =
    op === "revoke" ? { revokedAt: new Date() } :
    op === "restore" ? { revokedAt: null } :
    op === "reset" ? { downloadCount: 0 } : null;
  if (!data) return;
  const g = await db.downloadGrant.update({ where: { id: grantId }, data });
  revalidatePath(`/admin/orders/${g.orderId}`);
}

export async function resendEmail(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  await sendOrderEmail(id);
  revalidatePath(`/admin/orders/${id}`);
}
