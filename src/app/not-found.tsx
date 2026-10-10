import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-navy-900">Page not found</h1>
      <p className="mt-3 text-navy-600">The page you were looking for doesn’t exist or is no longer available.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-navy">Go home</Link>
        <Link href="/ebooks" className="btn-secondary">Browse ebooks</Link>
      </div>
    </main>
  );
}
