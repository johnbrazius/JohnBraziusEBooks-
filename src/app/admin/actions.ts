"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logout, requireAdmin } from "@/lib/auth";

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

/** Signs this admin out everywhere by invalidating all existing session tokens. */
export async function logoutEverywhereAction() {
  const admin = await requireAdmin();
  await db.adminUser.update({ where: { id: admin.id }, data: { sessionVersion: { increment: 1 } } });
  await logout();
  redirect("/admin/login");
}
