"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="font-display text-2xl font-bold text-navy-900">Something went wrong</h1>
      <p className="mt-2 text-navy-600">Please try again. If the problem continues, contact support.</p>
      <button onClick={reset} className="btn-navy mt-6">Try again</button>
    </div>
  );
}
