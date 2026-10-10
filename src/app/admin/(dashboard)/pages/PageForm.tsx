"use client";

import { useActionState } from "react";
import { savePage, type PageState } from "./actions";

type Init = { id: string; title: string; slug: string; body: string; metaDescription: string; needsReview: boolean; showInFooter: boolean };

export function PageForm({ initial }: { initial?: Init }) {
  const [state, action, pending] = useActionState<PageState, FormData>(savePage, {});
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="pt">Title</label><input id="pt" name="title" required defaultValue={initial?.title} className="input" /></div>
        <div><label className="label" htmlFor="ps">Slug</label><input id="ps" name="slug" required defaultValue={initial?.slug} className="input font-mono" /></div>
      </div>
      <div><label className="label" htmlFor="pm">Meta description</label><input id="pm" name="metaDescription" maxLength={170} defaultValue={initial?.metaDescription} className="input" /></div>
      <div><label className="label" htmlFor="pb">Content (Markdown)</label><textarea id="pb" name="body" rows={22} defaultValue={initial?.body} className="input font-mono text-xs" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="needsReview" defaultChecked={initial?.needsReview ?? false} /> Needs professional/legal review</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showInFooter" defaultChecked={initial?.showInFooter ?? true} /> Show link in footer</label>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-teal-700">{state.message}</p>}
      <button className="btn-navy" disabled={pending}>{pending ? "Saving…" : "Save page"}</button>
    </form>
  );
}
