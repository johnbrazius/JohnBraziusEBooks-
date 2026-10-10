import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const BOT_RE = /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse/i;

/** Anonymous daily view counter. Stores no IP address, cookie or identifier. */
export async function POST(req: Request) {
  if (BOT_RE.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { productId?: unknown } | null;
  const productId = typeof body?.productId === "string" ? body.productId.slice(0, 40) : null;
  if (!productId) return new NextResponse(null, { status: 204 });
  const day = new Date(new Date().toISOString().slice(0, 10));
  try {
    const exists = await db.product.findFirst({ where: { id: productId, status: "PUBLISHED" }, select: { id: true } });
    if (exists) {
      await db.productViewDaily.upsert({
        where: { productId_day: { productId, day } },
        update: { views: { increment: 1 } },
        create: { productId, day, views: 1 },
      });
    }
  } catch {
    /* analytics must never break the page */
  }
  return new NextResponse(null, { status: 204 });
}
