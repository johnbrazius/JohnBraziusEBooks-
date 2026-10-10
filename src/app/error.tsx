"use client";

/** Catches errors anywhere below the root layout (including the store layout) and explains next steps. */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Website Growth Lab</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-navy-900">The store can’t load right now</h1>
      <p className="mt-3 text-navy-600">Please try again in a moment.</p>
      <button onClick={reset} className="btn-navy mt-6">Try again</button>
      <div className="mt-10 rounded-xl border border-navy-100 bg-navy-50 p-4 text-left text-sm text-navy-700">
        <p className="font-semibold text-navy-900">Are you the site owner?</p>
        <p className="mt-1">
          Open{" "}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- JSON API route, not a page */}
          <a href="/api/health" className="font-mono text-teal-700 underline">/api/health</a> to see what needs fixing (usually a missing
          database setting or tables that haven’t been created yet).
        </p>
        {error.digest && <p className="mt-2 text-xs text-navy-500">Error reference: {error.digest}</p>}
      </div>
    </main>
  );
}
