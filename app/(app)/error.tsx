"use client";

export default function LearningError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="card mx-auto max-w-xl space-y-3 p-6" role="alert">
      <h1 className="font-display text-xl font-bold">We couldn&apos;t load this page</h1>
      <p className="muted text-sm">Your saved progress has not been changed. Check your connection and try again.</p>
      <button onClick={reset} className="btn-primary">Try again</button>
    </section>
  );
}
