import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { quoteCart } from "@/lib/orders";
import { visitorCurrency } from "@/lib/currency";

const body = z.object({
  productIds: z.array(z.string().min(1).max(40)).max(50),
  discountCode: z.string().max(40).nullable().optional(),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const quote = await quoteCart(parsed.data.productIds, await visitorCurrency(), parsed.data.discountCode);
  const meta = await db.product.findMany({ where: { id: { in: quote.lines.map((l) => l.productId) } }, select: { id: true, slug: true, type: true } });
  return NextResponse.json({
    ...quote,
    discount: quote.discount ? { code: quote.discount.code } : null,
    lines: quote.lines.map((l) => {
      const m = meta.find((x) => x.id === l.productId);
      return { ...l, slug: m?.slug ?? "", type: m?.type ?? "EBOOK" };
    }),
  });
}
