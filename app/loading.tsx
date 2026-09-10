export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-2/3 rounded-lg bg-white/5" />
      <div className="h-4 w-1/2 rounded bg-white/5" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-64 rounded-2xl bg-white/5 lg:col-span-2" />
        <div className="h-64 rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}
