"use client";

import { useActionState } from "react";
import { saveCategory, type CatState } from "./actions";

type Init = { id: string; name: string; slug: string; description: string; seoTitle: string; seoDescription: string };

export function CategoryForm({ initial }: { initial?: Init }) {
  const [state, action, pending] = useActionState<CatState, FormData>(saveCategory, {});
  const p = initial?.id ?? "new";
  return (
    <form action={action} className="space-y-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div><label className="label" htmlFor={`n-${p}`}>Name</label><input id={`n-${p}`} name="name" required defaultValue={initial?.name} className="input" /></div>
      <div><label className="label" htmlFor={`s-${p}`}>Slug</label><input id={`s-${p}`} name="slug" defaultValue={initial?.slug} placeholder="auto from name" className="input font-mono" /></div>
      <div><label className="label" htmlFor={`d-${p}`}>Description</label><textarea id={`d-${p}`} name="description" rows={3} defaultValue={initial?.description} className="input" /><p className="hint">Shown on the category page — a few helpful sentences avoid “thin” pages.</p></div>
      <div><label className="label" htmlFor={`t-${p}`}>SEO title</label><input id={`t-${p}`} name="seoTitle" maxLength={70} defaultValue={initial?.seoTitle} className="input" /></div>
      <div><label className="label" htmlFor={`m-${p}`}>Meta description</label><input id={`m-${p}`} name="seoDescription" maxLength={170} defaultValue={initial?.seoDescription} className="input" /></div>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-teal-700">{state.message}</p>}
      <button className="btn-navy" disabled={pending}>{pending ? "Saving…" : initial ? "Save" : "Create category"}</button>
    </form>
  );
}
