import "server-only";
import { randomBytes } from "crypto";
import { env } from "./env";
import { signTicket, verifyTicket } from "./session-token";
import { storage } from "./storage";
import { UPLOAD_RULES, matchesMagicBytes, safeFileName, type UploadKind } from "./storage/files";

export type UploadTicket = { path: string; kind: UploadKind; contentType: string; fileName: string; size: number };

const AUD = "wgl-upload";
const DIRS: Record<UploadKind, string> = { cover: "covers", ebook: "ebooks", sample: "samples" };

export async function issueUpload(input: { kind: UploadKind; fileName: string; contentType: string; size: number; productId?: string | null }) {
  const rule = UPLOAD_RULES[input.kind];
  const ext = rule.mime[input.contentType];
  if (!ext) throw new Error(`File type not allowed. Allowed: ${Object.keys(rule.mime).join(", ")}`);
  if (!Number.isInteger(input.size) || input.size <= 0) throw new Error("Empty file.");
  if (input.size > rule.maxBytes) throw new Error(`File is too large (max ${Math.round(rule.maxBytes / 1024 / 1024)} MB).`);
  const owner = input.productId && /^[a-z0-9]{10,40}$/.test(input.productId) ? input.productId : "unassigned";
  const path = `${rule.visibility}/${DIRS[input.kind]}/${owner}/${randomBytes(12).toString("hex")}.${ext}`;
  const ticketData: UploadTicket = { path, kind: input.kind, contentType: input.contentType, fileName: safeFileName(input.fileName), size: input.size };
  const ticket = await signTicket(ticketData, env.authSecret(), 3600, AUD);
  if (storage.driver() === "local") {
    return { mode: "local" as const, uploadUrl: `/api/admin/uploads/local?ticket=${encodeURIComponent(ticket)}`, ticket };
  }
  const { url } = await storage.createSignedUpload(path);
  return { mode: "supabase" as const, uploadUrl: url, ticket };
}

export async function readTicket(ticket: string): Promise<UploadTicket | null> {
  return verifyTicket<UploadTicket>(ticket, env.authSecret(), AUD);
}

/** Confirms an uploaded object exists, is within limits and its content matches its declared type. */
export async function verifyUploaded(ticketStr: string, expectedKind: UploadKind): Promise<UploadTicket & { sizeBytes: number }> {
  const t = await readTicket(ticketStr);
  if (!t || t.kind !== expectedKind) throw new Error("Upload authorisation is invalid or expired. Please upload the file again.");
  const head = await storage.head(t.path, 16);
  if (!head) throw new Error("Uploaded file was not found. Please upload it again.");
  const rule = UPLOAD_RULES[t.kind];
  if (head.size > rule.maxBytes) {
    await storage.remove(t.path);
    throw new Error("Uploaded file is too large.");
  }
  if (!matchesMagicBytes(t.contentType, head.head)) {
    await storage.remove(t.path);
    throw new Error("The uploaded file's contents do not match its type. Please upload a valid file.");
  }
  return { ...t, sizeBytes: head.size };
}
