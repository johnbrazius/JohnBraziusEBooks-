import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { activeProvider } from "@/lib/payments";
import { env } from "@/lib/env";
import { logoutAction, logoutEverywhereAction } from "../actions";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const provider = activeProvider();
  return (
    <div className="min-h-screen bg-navy-50/60 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-navy-950 text-navy-100 lg:min-h-screen">
        <div className="flex items-center justify-between px-5 py-5 lg:block">
          <Link href="/admin" className="font-display text-lg font-bold text-white">Growth Lab Admin</Link>
          <Link href="/" className="text-xs text-teal-300 hover:underline lg:mt-1 lg:block" target="_blank">View store ↗</Link>
        </div>
        <AdminNav />
        <div className="border-t border-navy-800 px-5 py-4 text-xs text-navy-300">
          <p className="truncate">{admin.email}</p>
          <div className="mt-2 flex gap-3">
            <form action={logoutAction}><button className="hover:text-white">Sign out</button></form>
            <form action={logoutEverywhereAction}><button className="hover:text-white">Sign out everywhere</button></form>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        {(!provider || !provider.ready || provider.testMode || env.storageDriver() === "local") && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-900">
            {!provider && "No payment provider configured — checkout is disabled. "}
            {provider && !provider.ready && `Payments not ready: ${provider.problem} `}
            {provider?.ready && provider.testMode && `Payments are in TEST mode (${provider.id}). No real money is charged. `}
            {env.storageDriver() === "local" && "Files are stored on the local disk (development only — use Supabase Storage in production)."}
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
