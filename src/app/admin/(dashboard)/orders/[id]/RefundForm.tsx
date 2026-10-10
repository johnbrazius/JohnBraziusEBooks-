"use client";

import { useActionState } from "react";
import { refundOrder, type OrderActionState } from "../actions";

export function RefundForm({ id, currency, max }: { id: string; currency: string; max: string }) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(refundOrder, {});
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("Issue this refund through the payment provider?")) e.preventDefault(); }} className="mt-4 rounded-lg bg-navy-50 p-3">
      <input type="hidden" name="id" value={id} />
      <label className="label" htmlFor="refund-amt">Refund amount ({currency}) — max {max}</label>
      <div className="flex gap-2">
        <input id="refund-amt" name="amount" defaultValue={max} inputMode="decimal" className="input" />
        <button className="btn-danger" disabled={pending}>{pending ? "Refunding…" : "Refund"}</button>
      </div>
      <p className="hint">A full refund automatically revokes download access.</p>
      {state.error && <p role="alert" className="mt-1 text-sm text-red-700">{state.error}</p>}
      {state.message && <p role="status" className="mt-1 text-sm text-teal-700">{state.message}</p>}
    </form>
  );
}
