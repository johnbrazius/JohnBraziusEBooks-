import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

/**
 * Storage abstraction.
 *  - "local": files live under ./storage (git-ignored). For local development only — Vercel's filesystem is
 *    read-only and ephemeral, so uploads would be lost.
 *  - "supabase": covers go to a PUBLIC bucket, ebooks and samples to a PRIVATE bucket served via signed,
 *    expiring URLs.
 *
 * Storage paths look like "public/covers/<productId>/<random>.webp" or "private/ebooks/<productId>/<random>.pdf".
 * The first segment selects the bucket.
 */

export type Visibility = "public" | "private";

const LOCAL_ROOT = path.join(process.cwd(), "storage");

let supabase: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!supabase) {
    const url = env.supabaseUrl();
    const key = env.supabaseServiceRoleKey();
    if (!url || !key) throw new Error("STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return supabase;
}

function split(storagePath: string): { visibility: Visibility; key: string } {
  const [first, ...rest] = storagePath.split("/");
  if ((first !== "public" && first !== "private") || rest.length === 0) throw new Error("Invalid storage path");
  const key = rest.join("/");
  if (key.includes("..") || key.startsWith("/")) throw new Error("Invalid storage path");
  return { visibility: first, key };
}

function bucket(v: Visibility) {
  return v === "public" ? env.supabasePublicBucket() : env.supabasePrivateBucket();
}

function localFile(storagePath: string) {
  const { visibility, key } = split(storagePath);
  const full = path.join(LOCAL_ROOT, visibility, key);
  if (!full.startsWith(path.join(LOCAL_ROOT, visibility) + path.sep)) throw new Error("Invalid storage path");
  return full;
}

export const storage = {
  driver: () => env.storageDriver(),

  /** Upload from the server (used by the seed script and small local uploads). */
  async put(storagePath: string, body: Buffer, contentType: string) {
    if (env.storageDriver() === "local") {
      const file = localFile(storagePath);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, body);
      return;
    }
    const { visibility, key } = split(storagePath);
    const { error } = await sb().storage.from(bucket(visibility)).upload(key, body, { contentType, upsert: true });
    if (error) throw new Error(`Upload failed: ${error.message}`);
  },

  /** For direct browser → Supabase uploads (bypasses Vercel's ~4.5 MB request body limit). */
  async createSignedUpload(storagePath: string): Promise<{ url: string }> {
    const { visibility, key } = split(storagePath);
    const { data, error } = await sb().storage.from(bucket(visibility)).createSignedUploadUrl(key);
    if (error || !data) throw new Error(`Could not create upload URL: ${error?.message}`);
    return { url: data.signedUrl };
  },

  /** Reads the first `bytes` bytes and the total size — used to verify uploads. Null if the object is missing. */
  async head(storagePath: string, bytes = 16): Promise<{ head: Uint8Array; size: number } | null> {
    if (env.storageDriver() === "local") {
      try {
        const file = localFile(storagePath);
        const stat = await fs.stat(file);
        const fh = await fs.open(file, "r");
        const buf = Buffer.alloc(Math.min(bytes, stat.size));
        await fh.read(buf, 0, buf.length, 0);
        await fh.close();
        return { head: new Uint8Array(buf), size: stat.size };
      } catch {
        return null;
      }
    }
    const { visibility, key } = split(storagePath);
    const { data } = await sb().storage.from(bucket(visibility)).createSignedUrl(key, 60);
    if (!data?.signedUrl) return null;
    const res = await fetch(data.signedUrl, { headers: { Range: `bytes=0-${bytes - 1}` } });
    if (!res.ok) return null;
    const head = new Uint8Array(await res.arrayBuffer()).slice(0, bytes);
    const range = res.headers.get("content-range"); // "bytes 0-15/123456"
    const size = range ? Number(range.split("/")[1]) : Number(res.headers.get("content-length") ?? head.length);
    return { head, size };
  },

  /** Public URL for covers. */
  publicUrl(storagePath: string): string {
    const { visibility, key } = split(storagePath);
    if (visibility !== "public") throw new Error("Not a public file");
    if (env.storageDriver() === "local") return `/media/${key}`;
    return sb().storage.from(bucket("public")).getPublicUrl(key).data.publicUrl;
  },

  /**
   * Short-lived download URL for a private file (Supabase), or null for the local driver, in which case the
   * caller streams the file itself via `read`.
   */
  async signedDownloadUrl(storagePath: string, fileName: string, expiresInSeconds = 60): Promise<string | null> {
    if (env.storageDriver() === "local") return null;
    const { visibility, key } = split(storagePath);
    const { data, error } = await sb().storage.from(bucket(visibility)).createSignedUrl(key, expiresInSeconds, { download: fileName });
    if (error || !data) throw new Error(`Could not sign download: ${error?.message}`);
    return data.signedUrl;
  },

  async read(storagePath: string): Promise<Buffer> {
    if (env.storageDriver() === "local") return fs.readFile(localFile(storagePath));
    const { visibility, key } = split(storagePath);
    const { data, error } = await sb().storage.from(bucket(visibility)).download(key);
    if (error || !data) throw new Error(`Download failed: ${error?.message}`);
    return Buffer.from(await data.arrayBuffer());
  },

  async remove(storagePath: string) {
    try {
      if (env.storageDriver() === "local") {
        await fs.unlink(localFile(storagePath));
        return;
      }
      const { visibility, key } = split(storagePath);
      await sb().storage.from(bucket(visibility)).remove([key]);
    } catch (err) {
      console.warn("[storage] remove failed", (err as Error).message);
    }
  },

  localPathFor: localFile,
};

export function coverUrl(coverPath: string | null | undefined): string | null {
  if (!coverPath) return null;
  try {
    return storage.publicUrl(coverPath);
  } catch {
    return null;
  }
}
