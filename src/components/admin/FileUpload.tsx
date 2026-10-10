"use client";

import { useRef, useState } from "react";

type Kind = "cover" | "ebook" | "sample";
const ACCEPT: Record<Kind, string> = {
  cover: "image/jpeg,image/png,image/webp",
  ebook: "application/pdf,application/epub+zip,application/zip",
  sample: "application/pdf,application/epub+zip",
};

function fmt(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

/**
 * Uploads a file directly to storage (Supabase signed URL in production) and stores the resulting signed
 * ticket in a hidden input. The server re-verifies the ticket and the file contents when the form is saved.
 */
export function FileUpload({ kind, name, label, productId, current, hint }: { kind: Kind; name: string; label: string; productId?: string; current?: { fileName: string; sizeBytes: number } | null; hint?: string }) {
  const [ticket, setTicket] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const id = `upload-${name}`;

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    setMessage(`Uploading ${file.name}…`);
    setTicket("");
    try {
      const contentType = file.type || (file.name.endsWith(".epub") ? "application/epub+zip" : "");
      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, fileName: file.name, contentType, size: file.size, productId: productId ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload refused");
      let put: Response;
      if (data.mode === "supabase") {
        const fd = new FormData();
        fd.append("cacheControl", "3600");
        fd.append("", file);
        put = await fetch(data.uploadUrl, { method: "PUT", body: fd, headers: { "x-upsert": "false" } });
      } else {
        put = await fetch(data.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
      }
      if (!put.ok) {
        const err = await put.json().catch(() => ({}));
        throw new Error(err.error ?? err.message ?? `Upload failed (${put.status})`);
      }
      setTicket(data.ticket);
      setStatus("done");
      setMessage(`${file.name} (${fmt(file.size)}) uploaded — click Save to attach it.`);
    } catch (err) {
      setStatus("error");
      setMessage((err as Error).message);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {current && <p className="mb-1 text-xs text-navy-600">Current: <span className="font-medium">{current.fileName}</span> ({fmt(current.sizeBytes)})</p>}
      <input id={id} ref={inputRef} type="file" accept={ACCEPT[kind]} onChange={onChange} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-800" />
      <input type="hidden" name={name} value={ticket} />
      {hint && <p className="hint">{hint}</p>}
      {message && (
        <p role={status === "error" ? "alert" : "status"} className={`mt-1 text-xs ${status === "error" ? "text-red-700" : status === "done" ? "text-teal-700" : "text-navy-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
