import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { issueUpload } from "@/lib/uploads";

const body = z.object({
  kind: z.enum(["cover", "ebook", "sample"]),
  fileName: z.string().min(1).max(200),
  contentType: z.string().max(100),
  size: z.number().int().positive(),
  productId: z.string().max(40).nullable().optional(),
});

export async function POST(req: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  try {
    return NextResponse.json(await issueUpload(parsed.data));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
