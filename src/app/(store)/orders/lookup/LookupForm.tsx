"use client";

import { useActionState } from "react";
import { lookupOrder, type FormState } from "@/app/actions";

export function LookupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(lookupOrder, {});
  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label htmlFor="lk-email" className="label">Email</label>
        <input id="lk-email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label htmlFor="lk-ref" className="label">Order reference</label>
        <input id="lk-ref" name="reference" required placeholder="WGL-AB12CD34" className="input uppercase" />
      </div>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-teal-800">{state.message}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Email my link"}</button>
    </form>
  );
}
