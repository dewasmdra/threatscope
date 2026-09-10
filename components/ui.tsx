import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-neon/80">
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "neon",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "neon" | "alert" | "warn" | "blue";
}) {
  const bar = {
    neon: "from-neon to-neon-2",
    alert: "from-alert to-warn",
    warn: "from-warn to-amber",
    blue: "from-neon-2 to-neon",
  }[accent];

  return (
    <div className="panel panel-hover relative overflow-hidden p-4">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${bar}`} />
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Small "live / degraded" pill so a failed upstream is visible rather than silent. */
export function SourceStatus({
  label,
  ok,
  error,
}: {
  label: string;
  ok: boolean;
  error?: string;
}) {
  return (
    <span
      title={ok ? `${label}: live` : `${label}: ${error ?? "unavailable"}`}
      className={`badge ${ok ? "sev-low" : "sev-none"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-lime" : "bg-muted"}`} />
      {label}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="panel grid place-items-center px-6 py-12 text-center">
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

/** Horizontal ranked bars — used for vendors, sectors, countries, CWEs. */
export function BarList({
  items,
  colorFrom = "#22e5c8",
  colorTo = "#4d8bff",
}: {
  items: { label: string; value: number; sub?: string }[];
  colorFrom?: string;
  colorTo?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={`${item.label}-${i}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-ink">{item.label}</span>
            <span className="font-mono text-xs tabular-nums text-muted">{item.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((item.value / max) * 100, 3)}%`,
                background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
