export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-navy-200 bg-navy-50/50 px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold text-navy-900">{title}</p>
      {children && <div className="mt-2 text-sm text-navy-600">{children}</div>}
    </div>
  );
}
