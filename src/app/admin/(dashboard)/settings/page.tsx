import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { activeProvider } from "@/lib/payments";
import { emailConfigured } from "@/lib/email";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSettings();
  const provider = activeProvider();
  const status: [string, string, boolean][] = [
    ["Payment provider", provider ? `${provider.id}${provider.testMode ? " (test mode)" : " (live)"}${provider.ready ? "" : " — not ready"}` : "none — checkout disabled", Boolean(provider?.ready)],
    ["Chargeable currencies", env.paymentCurrencies().join(", ") || "none", env.paymentCurrencies().length > 0],
    ["File storage", env.storageDriver() === "supabase" ? "Supabase Storage (private bucket)" : "Local disk (development only)", env.storageDriver() === "supabase"],
    ["Transactional email", emailConfigured() ? "Resend configured" : "Not configured — customers rely on the order page link", emailConfigured()],
    ["Site URL", env.siteUrl(), true],
  ];
  return (
    <>
      <PageHeader title="Settings" />
      <section className="card mb-6 p-5">
        <h2 className="font-semibold text-navy-900">Integrations (set via environment variables)</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[200px_1fr]">
          {status.map(([k, v, ok]) => (
            <div key={k} className="contents">
              <dt className="text-navy-500">{k}</dt>
              <dd><span aria-hidden className={ok ? "text-teal-600" : "text-amber-600"}>{ok ? "● " : "▲ "}</span>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="hint mt-3">Secrets are never shown or editable here. Change them in Vercel → Project → Settings → Environment Variables, then redeploy.</p>
      </section>
      <SettingsForm settings={settings} chargeable={env.paymentCurrencies()} />
    </>
  );
}
