import Link from "next/link";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-navy-600">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-navy-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-navy-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy-500">{hint}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-teal-100 text-teal-800",
  DRAFT: "bg-navy-100 text-navy-700",
  ARCHIVED: "bg-gray-200 text-gray-700",
  PAID: "bg-teal-100 text-teal-800",
  PENDING: "bg-amber-100 text-amber-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-200 text-gray-700",
  REFUNDED: "bg-purple-100 text-purple-800",
  PARTIALLY_REFUNDED: "bg-purple-100 text-purple-800",
  SENT: "bg-teal-100 text-teal-800",
  SKIPPED: "bg-gray-200 text-gray-700",
  NOT_SENT: "bg-gray-200 text-gray-700",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_STYLES[status] ?? "bg-navy-100 text-navy-700"}`}>{status.replace(/_/g, " ").toLowerCase()}</span>;
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full divide-y divide-navy-100 text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-navy-500 [&_tbody_tr:hover]:bg-navy-50/50 [&_tbody]:divide-y [&_tbody]:divide-navy-100">
        {children}
      </table>
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "success"; children: React.ReactNode }) {
  const s = { info: "bg-navy-50 text-navy-800 border-navy-200", warn: "bg-amber-50 text-amber-900 border-amber-200", error: "bg-red-50 text-red-800 border-red-200", success: "bg-teal-50 text-teal-900 border-teal-200" }[kind];
  return <div role={kind === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${s}`}>{children}</div>;
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="mb-3 inline-block text-sm text-navy-600 hover:text-teal-700">← {children}</Link>;
}
