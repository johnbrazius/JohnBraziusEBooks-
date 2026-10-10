import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyOrderAccess } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { storage } from "@/lib/storage";
import { safeFileName } from "@/lib/storage/files";

type Params = Promise<{ grantId: string }>;

function deny(message: string, status = 403) {
  return new NextResponse(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(req: Request, { params }: { params: Params }) {
  const { grantId } = await params;
  const token = new URL(req.url).searchParams.get("t");

  const grant = await db.downloadGrant.findUnique({
    where: { id: grantId },
    include: { order: { select: { id: true, status: true } }, product: { select: { files: { where: { kind: "MAIN" } } } } },
  });
  // Identical response for unknown grant and bad token.
  if (!grant || !verifyOrderAccess(grant.order.id, token)) return deny("Download link is invalid.", 404);
  if (grant.order.status !== "PAID" && grant.order.status !== "PARTIALLY_REFUNDED") return deny("This order is not eligible for download.");
  if (grant.revokedAt) return deny("Access to this download has been revoked.");
  if (grant.expiresAt && grant.expiresAt < new Date()) return deny("This download link has expired. Please contact support.");
  const file = grant.product.files[0];
  if (!file) return deny("This file is not available yet. Please contact support.", 404);
  if (!(await rateLimit(`dl:${grant.id}`, 20, 3600))) return deny("Too many download attempts. Please try again later.", 429);

  // Atomic check-and-increment so parallel requests cannot exceed the limit.
  const counted = await db.downloadGrant.updateMany({
    where: { id: grant.id, downloadCount: { lt: grant.maxDownloads }, revokedAt: null },
    data: { downloadCount: { increment: 1 }, lastDownloadAt: new Date() },
  });
  if (counted.count === 0) return deny("Download limit reached. Please contact support if you need more downloads.");

  const fileName = safeFileName(file.fileName);
  const signed = await storage.signedDownloadUrl(file.storagePath, fileName, 60);
  if (signed) return NextResponse.redirect(signed, { status: 303, headers: { "Cache-Control": "no-store" } });

  const body = await storage.read(file.storagePath);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(body.length),
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
