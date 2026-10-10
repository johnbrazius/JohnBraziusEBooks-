/** Upload rules per file kind. Validation happens both before upload (declared type/size) and after (magic bytes). */

export type UploadKind = "cover" | "ebook" | "sample";

export const UPLOAD_RULES: Record<UploadKind, { maxBytes: number; mime: Record<string, string>; visibility: "public" | "private" }> = {
  cover: {
    maxBytes: 5 * 1024 * 1024,
    mime: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
    visibility: "public",
  },
  ebook: {
    maxBytes: 200 * 1024 * 1024,
    mime: { "application/pdf": "pdf", "application/epub+zip": "epub", "application/zip": "zip" },
    visibility: "private",
  },
  sample: {
    maxBytes: 25 * 1024 * 1024,
    mime: { "application/pdf": "pdf", "application/epub+zip": "epub" },
    visibility: "private",
  },
};

/** Checks the first bytes of a file against the declared MIME type. */
export function matchesMagicBytes(mime: string, head: Uint8Array): boolean {
  const starts = (...sig: number[]) => sig.every((b, i) => head[i] === b);
  switch (mime) {
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/webp":
      return starts(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
    case "application/pdf":
      return starts(0x25, 0x50, 0x44, 0x46, 0x2d); // %PDF-
    case "application/epub+zip":
    case "application/zip":
      return starts(0x50, 0x4b, 0x03, 0x04);
    default:
      return false;
  }
}

/** Safe file name for Content-Disposition and storage keys. */
export function safeFileName(name: string): string {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  return cleaned.slice(-100) || "file";
}
