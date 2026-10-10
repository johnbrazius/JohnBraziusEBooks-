import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Serves PUBLIC files (covers) when STORAGE_DRIVER=local. Private files are never reachable here. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (env.storageDriver() !== "local") return new NextResponse("Not found", { status: 404 });
  const { path } = await params;
  const key = path.join("/");
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  if (!TYPES[ext] || !key.startsWith("covers/")) return new NextResponse("Not found", { status: 404 });
  try {
    const body = await storage.read(`public/${key}`);
    return new NextResponse(new Uint8Array(body), { headers: { "Content-Type": TYPES[ext], "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
