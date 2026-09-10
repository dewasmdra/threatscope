"use client";

import { useMemo, useState } from "react";
import type { CveItem, Severity } from "@/lib/types";
import { SEVERITY_STYLES, relativeTime } from "@/lib/format";

const FILTERS: (Severity | "ALL")[] = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"];

export default function CveExplorer({
  items,
  pageSize = 25,
}: {
  items: CveItem[];
  pageSize?: number;
}) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<Severity | "ALL">("ALL");
  const [visible, setVisible] = useState(pageSize);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (severity !== "ALL" && c.severity !== severity) return false;
      if (!q) return true;
      return (
        c.id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.cwe ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, severity]);

  const shown = filtered.slice(0, visible);

  return (
    <div>
      {/* Filters live in one row above the results. */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search CVEs</span>
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(pageSize);
            }}
            placeholder="Search CVE ID, keyword, or CWE…"
            className="w-full rounded-xl border border-edge bg-panel py-2.5 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-muted focus:border-neon/60"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setSeverity(f);
                setVisible(pageSize);
              }}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                severity === f
                  ? "border-neon/60 bg-neon/10 text-neon"
                  : "border-edge text-muted hover:text-ink"
              }`}
            >
              {f === "ALL" ? "All" : SEVERITY_STYLES[f].label}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 font-mono text-xs text-muted">
        {filtered.length} of {items.length} advisories
      </p>

      <ul className="space-y-2.5">
        {shown.map((cve) => {
          const style = SEVERITY_STYLES[cve.severity];
          return (
            <li key={cve.id} className="panel panel-hover p-4">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={cve.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link-underline font-mono text-sm font-semibold text-neon"
                >
                  {cve.id}
                </a>
                <span className={`badge ${style.className}`}>
                  {style.label}
                  {cve.score !== null && <span className="tabular-nums">· {cve.score.toFixed(1)}</span>}
                </span>
                {cve.cwe && (
                  <span className="badge sev-none">{cve.cwe}</span>
                )}
                <span className="ml-auto font-mono text-xs text-muted">
                  {relativeTime(cve.published)}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                {cve.description}
              </p>
              {cve.vector && (
                <p className="mt-2 truncate font-mono text-[11px] text-muted/70">{cve.vector}</p>
              )}
            </li>
          );
        })}
      </ul>

      {!filtered.length && (
        <div className="panel grid place-items-center py-12 text-center text-sm text-muted">
          No advisories match that filter.
        </div>
      )}

      {visible < filtered.length && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + pageSize)}
          className="mt-5 w-full rounded-xl border border-edge py-3 text-sm text-muted transition hover:border-neon/50 hover:text-neon"
        >
          Load {Math.min(pageSize, filtered.length - visible)} more
        </button>
      )}
    </div>
  );
}
