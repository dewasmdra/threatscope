"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel grid place-items-center px-6 py-20 text-center">
      <h2 className="text-xl font-semibold text-ink">This view could not be rendered</h2>
      <p className="mt-2 max-w-md text-sm text-muted">
        One of the upstream intelligence feeds returned something unexpected. Retrying usually
        resolves it.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-xl bg-neon px-5 py-2.5 text-sm font-semibold text-void"
      >
        Try again
      </button>
    </div>
  );
}
