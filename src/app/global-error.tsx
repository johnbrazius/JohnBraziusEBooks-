"use client";

/** Last-resort error page if the root layout itself fails. Uses inline styles because global CSS may not load. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fff", color: "#0c1730", margin: 0 }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "15vh 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28 }}>The store can’t load right now</h1>
          <p>Please try again in a moment.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 18px", background: "#14244a", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" }}>
            Try again
          </button>
          <p style={{ marginTop: 32, fontSize: 14 }}>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- JSON API route, not a page */}
            Site owner? Open <a href="/api/health">/api/health</a> to see what needs fixing.
          </p>
          {error.digest && <p style={{ fontSize: 12, color: "#5f6b85" }}>Error reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
