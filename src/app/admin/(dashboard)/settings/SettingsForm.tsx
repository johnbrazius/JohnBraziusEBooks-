"use client";

import { useActionState } from "react";
import type { StoreSettings } from "@/lib/settings-defaults";
import { saveSettingsAction, type SettingsState } from "./actions";

function F({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="label">{label}</label>{children}{hint && <p className="hint">{hint}</p>}</div>;
}

export function SettingsForm({ settings: s, chargeable }: { settings: StoreSettings; chargeable: string[] }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettingsAction, {});
  return (
    <form action={action} className="space-y-6">
      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 font-semibold text-navy-900">Store</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="storeName" label="Store name"><input id="storeName" name="storeName" defaultValue={s.storeName} className="input" /></F>
          <F id="supportEmail" label="Support email" hint="Shown publicly on contact and order pages."><input id="supportEmail" name="supportEmail" type="email" defaultValue={s.supportEmail} className="input" /></F>
        </div>
        <F id="tagline" label="Tagline / hero headline"><input id="tagline" name="tagline" defaultValue={s.tagline} className="input" /></F>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 font-semibold text-navy-900">Currencies</legend>
        <p className="text-xs text-navy-600">Your payment account can currently charge: <strong>{chargeable.join(", ") || "none"}</strong> (PAYMENT_CURRENCIES). Product prices in other currencies are not used for charging.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="baseCurrency" label="Base currency" hint="Every product needs a price in this currency; it is the fallback charge currency."><input id="baseCurrency" name="baseCurrency" maxLength={3} defaultValue={s.baseCurrency} className="input uppercase" /></F>
          <F id="displayCurrencies" label="Visitor-selectable currencies" hint="Comma-separated, e.g. USD, INR"><input id="displayCurrencies" name="displayCurrencies" defaultValue={s.displayCurrencies.join(", ")} className="input uppercase" /></F>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="countryCurrency" label="Default currency by visitor country" hint="One per line, e.g. IN=INR (uses Vercel's country header)."><textarea id="countryCurrency" name="countryCurrency" rows={3} defaultValue={Object.entries(s.countryCurrency).map(([k, v]) => `${k}=${v}`).join("\n")} className="input font-mono" /></F>
          <F id="indicativeRates" label={`Indicative rates (1 ${s.baseCurrency} = …)`} hint={`Display-only estimates for products without a fixed price in that currency. Clearly labelled “estimate”. ${s.indicativeRatesUpdatedAt ? `Last updated ${new Date(s.indicativeRatesUpdatedAt).toLocaleDateString("en-GB")}.` : ""}`}>
            <textarea id="indicativeRates" name="indicativeRates" rows={3} defaultValue={Object.entries(s.indicativeRates).map(([k, v]) => `${k}=${v}`).join("\n")} className="input font-mono" placeholder="INR=83.25" />
          </F>
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 font-semibold text-navy-900">Promotional banner</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="bannerEnabled" defaultChecked={s.banner.enabled} /> Show banner across the store</label>
        <F id="bannerText" label="Banner text"><input id="bannerText" name="bannerText" maxLength={200} defaultValue={s.banner.text} className="input" placeholder="Launch week: 20% off with code LAUNCH20" /></F>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="bannerLinkUrl" label="Link URL"><input id="bannerLinkUrl" name="bannerLinkUrl" defaultValue={s.banner.linkUrl} className="input" placeholder="/ebooks" /></F>
          <F id="bannerLinkLabel" label="Link label"><input id="bannerLinkLabel" name="bannerLinkLabel" maxLength={40} defaultValue={s.banner.linkLabel} className="input" placeholder="Shop now" /></F>
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 font-semibold text-navy-900">Social links</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["twitter", "linkedin", "youtube", "instagram", "facebook"] as const).map((k) => (
            <F key={k} id={k} label={k[0].toUpperCase() + k.slice(1)}><input id={k} name={k} defaultValue={s.social[k]} className="input" placeholder="https://…" /></F>
          ))}
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 font-semibold text-navy-900">Marketing</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="newsletterEnabled" defaultChecked={s.newsletterEnabled} /> Show newsletter signup</label>
        <F id="bestsellerMinOrders" label="Bestseller threshold" hint="A product is labelled “Bestseller” only after this many real paid orders.">
          <input id="bestsellerMinOrders" name="bestsellerMinOrders" type="number" min={1} defaultValue={s.bestsellerMinOrders} className="input max-w-[120px]" />
        </F>
      </fieldset>

      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-teal-700">{state.message}</p>}
      <button className="btn-navy" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
