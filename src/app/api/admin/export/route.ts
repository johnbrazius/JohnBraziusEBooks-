import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { fromMinor } from "@/lib/money";

function csv(rows: (string | number | null | undefined)[][]) {
  // Quote every cell and neutralise spreadsheet formula injection.
  return rows
    .map((r) => r.map((c) => {
      let s = c == null ? "" : String(c);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    }).join(","))
    .join("\n");
}

export async function GET(req: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = new URL(req.url).searchParams.get("type");
  let body = "";
  if (type === "orders") {
    const orders = await db.order.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } });
    body = csv([
      ["reference", "created_at", "paid_at", "status", "email", "currency", "subtotal", "discount", "total", "refunded", "discount_code", "provider", "provider_payment_id", "items"],
      ...orders.map((o) => [o.reference, o.createdAt.toISOString(), o.paidAt?.toISOString(), o.status, o.email, o.currency, fromMinor(o.subtotalAmount, o.currency), fromMinor(o.discountAmount, o.currency), fromMinor(o.totalAmount, o.currency), fromMinor(o.refundedAmount, o.currency), o.discountCodeText, o.provider, o.providerPaymentId, o.items.map((i) => i.titleSnapshot).join(" | ")]),
    ]);
  } else if (type === "newsletter") {
    const subs = await db.newsletterSubscriber.findMany({ where: { status: "SUBSCRIBED" }, orderBy: { createdAt: "asc" } });
    body = csv([
      ["email", "consent_at", "consent_text", "source", "unsubscribe_url"],
      ...subs.map((s) => [s.email, s.consentAt.toISOString(), s.consentText, s.source, `${env.siteUrl()}/newsletter/unsubscribe?token=${s.unsubscribeToken}`]),
    ]);
  } else {
    return NextResponse.json({ error: "Unknown export" }, { status: 400 });
  }
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
