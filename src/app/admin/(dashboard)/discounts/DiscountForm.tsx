"use client";

import { useActionState, useState } from "react";
import { saveDiscount, type DiscountState } from "./actions";

type Init = { id: string; code: string; description: string; type: "PERCENT" | "FIXED"; percentOff: string; amountOff: string; currency: string; minSubtotal: string; startsAt: string; endsAt: string; maxRedemptions: string; active: boolean; productIds: string[] };

export function DiscountForm({ initial, products }: { initial?: Init; products: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<DiscountState, FormData>(saveDiscount, {});
  const [type, setType] = useState(initial?.type ?? "PERCENT");
  const k = initial?.id ?? "new";
  return (
    <form action={action} className="space-y-3 text-sm">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div><label className="label" htmlFor={`c-${k}`}>Code</label><input id={`c-${k}`} name="code" required defaultValue={initial?.code} className="input font-mono uppercase" placeholder="LAUNCH20" /></div>
      <div><label className="label" htmlFor={`de-${k}`}>Internal note</label><input id={`de-${k}`} name="description" defaultValue={initial?.description} className="input" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor={`t-${k}`}>Type</label>
          <select id={`t-${k}`} name="type" value={type} onChange={(e) => setType(e.target.value as "PERCENT")} className="input"><option value="PERCENT">Percent off</option><option value="FIXED">Fixed amount off</option></select></div>
        {type === "PERCENT"
          ? <div><label className="label" htmlFor={`p-${k}`}>Percent</label><input id={`p-${k}`} name="percentOff" inputMode="numeric" defaultValue={initial?.percentOff} className="input" placeholder="20" /></div>
          : <div><label className="label" htmlFor={`a-${k}`}>Amount</label><input id={`a-${k}`} name="amountOff" inputMode="decimal" defaultValue={initial?.amountOff} className="input" placeholder="2.00" /></div>}
      </div>
      {type === "PERCENT" && <input type="hidden" name="amountOff" value="" />}
      {type === "FIXED" && <input type="hidden" name="percentOff" value="" />}
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor={`cu-${k}`}>Currency</label><input id={`cu-${k}`} name="currency" maxLength={3} defaultValue={initial?.currency} className="input uppercase" placeholder={type === "FIXED" ? "USD (required)" : "any"} /></div>
        <div><label className="label" htmlFor={`m-${k}`}>Min. order</label><input id={`m-${k}`} name="minSubtotal" inputMode="decimal" defaultValue={initial?.minSubtotal} className="input" placeholder="optional" /></div>
      </div>
      <p className="hint">If a currency is set, the code only works for checkouts charged in that currency.</p>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor={`s-${k}`}>Starts</label><input id={`s-${k}`} type="datetime-local" name="startsAt" defaultValue={initial?.startsAt} className="input" /></div>
        <div><label className="label" htmlFor={`e-${k}`}>Ends</label><input id={`e-${k}`} type="datetime-local" name="endsAt" defaultValue={initial?.endsAt} className="input" /></div>
      </div>
      <div><label className="label" htmlFor={`mx-${k}`}>Usage limit</label><input id={`mx-${k}`} name="maxRedemptions" inputMode="numeric" defaultValue={initial?.maxRedemptions} className="input" placeholder="unlimited" /></div>
      <details>
        <summary className="cursor-pointer text-navy-700">Limit to specific products ({initial?.productIds.length || "all"})</summary>
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
          {products.map((p) => <label key={p.id} className="flex gap-2"><input type="checkbox" name="productIds" value={p.id} defaultChecked={initial?.productIds.includes(p.id)} />{p.title}</label>)}
        </div>
      </details>
      <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={initial?.active ?? true} /> Active</label>
      {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
      {state.message && <p role="status" className="text-teal-700">{state.message}</p>}
      <button className="btn-navy" disabled={pending}>{pending ? "Saving…" : initial ? "Save" : "Create code"}</button>
    </form>
  );
}
