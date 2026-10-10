"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { attemptLogin } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function loginAction(_prev: { error: string }, form: FormData): Promise<{ error: string }> {
  const ip = clientIp(await headers());
  if (!(await rateLimit(`login:${ip}`, 10, 900))) return { error: "Too many sign-in attempts. Try again in 15 minutes." };
  const email = String(form.get("email") ?? "").slice(0, 254);
  const password = String(form.get("password") ?? "").slice(0, 200);
  const result = await attemptLogin(email, password);
  if (!result.ok) return { error: result.error };
  redirect("/admin");
}
