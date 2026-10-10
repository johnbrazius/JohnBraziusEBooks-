"use client";

import { useActionState } from "react";
import Link from "next/link";
import { subscribeNewsletter, type FormState } from "@/app/actions";

export function NewsletterForm({ consentText, dark = false }: { consentText: string; dark?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeNewsletter, {});
  if (state.ok) return <p role="status" className={dark ? "text-teal-200" : "text-teal-800"}>{state.message}</p>;
  return (
    <form action={action} className="w-full max-w-md space-y-3" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="nl-email" className="sr-only">Email address</label>
        <input id="nl-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="input flex-1" />
        <button className="btn-primary" disabled={pending}>{pending ? "Subscribing…" : "Subscribe"}</button>
      </div>
      {/* Honeypot: hidden from people, often filled by bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className={`flex items-start gap-2 text-xs ${dark ? "text-navy-200" : "text-navy-600"}`}>
        <input type="checkbox" name="consent" required className="mt-0.5 rounded border-navy-300 text-teal-600" />
        <span>{consentText} See our <Link className="underline" href="/privacy">Privacy Policy</Link>.</span>
      </label>
      {state.error && <p role="alert" className={`text-sm ${dark ? "text-red-300" : "text-red-700"}`}>{state.error}</p>}
    </form>
  );
}
