import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { CheckoutError, startCheckout } from "@/lib/orders";
import { visitorCurrency } from "@/lib/currency";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { emailSchema } from "@/lib/validation";

const body = z.object({
  productIds: z.array(z.string().min(1).max(40)).min(1).max(50),
  email: emailSchema,
  discountCode: z.string().max(40).nullable().optional(),
  expectedTotal: z.number().int().nonnegative(),
  expectedCurrency: z.string().regex(/^[A-Z]{3}$/),
});

export async function POST(req: Request) {
  const h = await headers();
  if (!(await rateLimit(`checkout:${clientIp(h)}`, 10, 600))) {
    return NextResponse.json({ error: "Too many checkout attempts. Please wait a few minutes." }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const emailIssue = parsed.error.issues.find((i) => i.path[0] === "email");
    return NextResponse.json({ error: emailIssue ? emailIssue.message : "Invalid checkout request." }, { status: 400 });
  }
  try {
    const result = await startCheckout({ ...parsed.data, preferredCurrency: await visitorCurrency() });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CheckoutError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error("[checkout] unexpected error", (err as Error).message);
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}
