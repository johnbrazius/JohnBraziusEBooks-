import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { safeFileName } from "@/lib/storage/files";
import { clientIp, rateLimit } from "@/lib/rate-limit";

type Params = Promise<{ productId: string }>;

/** Free sample files for published products. Still private in storage; served via short-lived URLs. */
export async function GET(_req: Request, { params }: { params: Params }) {
  const { productId } = await params;
  const product = await db.product.findUnique({ where: { id: productId }, select: { status: true, files: { where: { kind: "SAMPLE" } } } });
  const file = product?.status === "PUBLISHED" ? product.files[0] : undefined;
  if (!file) return new NextResponse("Not found", { status: 404 });
  if (!(await rateLimit(`sample:${clientIp(await headers())}`, 30, 3600))) return new NextResponse("Too many requests", { status: 429 });

  const fileName = safeFileName(file.fileName);
  const signed = await storage.signedDownloadUrl(file.storagePath, fileName, 120);
  if (signed) return NextResponse.redirect(signed, 303);
  const body = await storage.read(file.storagePath);
  return new NextResponse(new Uint8Array(body), {
    headers: { "Content-Type": file.mimeType, "Content-Disposition": `attachment; filename="${fileName}"`, "X-Robots-Tag": "noindex" },
  });
}
