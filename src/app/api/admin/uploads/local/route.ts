import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { readTicket } from "@/lib/uploads";
import { storage } from "@/lib/storage";
import { matchesMagicBytes, UPLOAD_RULES } from "@/lib/storage/files";

/** Receives uploads for the LOCAL storage driver (development). Production uploads go straight to Supabase. */
export async function PUT(req: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (storage.driver() !== "local") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const ticket = await readTicket(new URL(req.url).searchParams.get("ticket") ?? "");
  if (!ticket) return NextResponse.json({ error: "Invalid or expired upload ticket" }, { status: 400 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0 || buf.length > UPLOAD_RULES[ticket.kind].maxBytes || buf.length > ticket.size) {
    return NextResponse.json({ error: "File size not allowed" }, { status: 400 });
  }
  if (!matchesMagicBytes(ticket.contentType, buf.subarray(0, 16))) {
    return NextResponse.json({ error: "File contents do not match its type" }, { status: 400 });
  }
  await storage.put(ticket.path, buf, ticket.contentType);
  return NextResponse.json({ ok: true });
}
