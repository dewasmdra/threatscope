"use client";

import { useRouter } from "next/navigation";
import { monthLabel } from "@/lib/report";

/** Month-over-month change. Direction is stated in words, never by colour alone. */
export function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="badge sev-none">no baseline</span>;
  }
  const rounded = Math.round(value);
  if (rounded === 0) {
    return <span className="badge sev-none">flat vs last month</span>;
  }
  const up = rounded > 0;
  return (
    <span className={`badge ${up ? "sev-critical" : "sev-low"}`}>
      {up ? "▲" : "▼"} {Math.abs(rounded)}% vs last month
    </span>
  );
}

export function MonthPicker({ months, current }: { months: string[]; current: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Report period</span>
      <select
        value={current}
        onChange={(e) => router.push(`/report/${e.target.value}`)}
        className="rounded-xl border border-edge bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-neon/60"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ExportBar({ csv, month }: { csv: string; month: string }) {
  const download = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `threatscope-report-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={download}
        className="rounded-xl border border-edge px-4 py-2 text-sm text-ink transition hover:border-neon/50 hover:text-neon"
      >
        Download CSV
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-xl border border-edge px-4 py-2 text-sm text-ink transition hover:border-neon/50 hover:text-neon"
      >
        Print / save as PDF
      </button>
    </div>
  );
}
