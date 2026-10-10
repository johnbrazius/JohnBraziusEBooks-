import Link from "next/link";

export function Logo({ name, light = false }: { name: string; light?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label={`${name} — home`}>
      <span aria-hidden className="grid h-9 w-9 place-items-center rounded-lg bg-navy-900 ring-1 ring-navy-700">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M4 18 L9 12 L13 15 L20 6" stroke="#27c4b8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 6 H20 V11" stroke="#27c4b8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={`font-display text-lg font-bold tracking-tight ${light ? "text-white" : "text-navy-900"}`}>{name}</span>
    </Link>
  );
}
