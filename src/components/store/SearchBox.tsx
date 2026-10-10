export function SearchBox({ defaultValue = "", large = false }: { defaultValue?: string; large?: boolean }) {
  return (
    <form action="/ebooks" method="get" role="search" className="relative w-full">
      <label htmlFor={large ? "hero-search" : "search"} className="sr-only">Search ebooks</label>
      <svg aria-hidden viewBox="0 0 24 24" className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 ${large ? "h-5 w-5" : "h-4 w-4"}`} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        id={large ? "hero-search" : "search"}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search ebooks by title, topic or keyword…"
        className={`input ${large ? "py-3.5 pl-11 pr-28 text-base" : "pl-9"}`}
        maxLength={100}
      />
      {large && <button className="btn-primary absolute right-1.5 top-1/2 -translate-y-1/2">Search</button>}
    </form>
  );
}
