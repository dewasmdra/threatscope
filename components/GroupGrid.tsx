"use client";

import { useMemo, useState } from "react";
import type { ThreatGroup } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function GroupGrid({ groups }: { groups: ThreatGroup[] }) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(24);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.altname ?? "").toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q),
    );
  }, [groups, query]);

  if (!groups.length) {
    return (
      <div className="panel grid place-items-center py-12 text-center text-sm text-muted">
        Group directory is rate-limited right now — try again in a few minutes.
      </div>
    );
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setVisible(24);
        }}
        placeholder="Search crews by name or alias…"
        className="mb-4 w-full rounded-xl border border-edge bg-panel px-4 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-neon/60"
      />
      <p className="mb-3 font-mono text-xs text-muted">
        {filtered.length} of {groups.length} tracked crews
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, visible).map((g) => (
          <article key={g.name} className="panel panel-hover flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-mono text-sm font-bold tracking-tight text-ink">{g.name}</h3>
              {g.victimCount > 0 && (
                <span className="badge sev-critical">{g.victimCount} recent</span>
              )}
            </div>
            {g.altname && <p className="mt-0.5 text-xs text-muted">aka {g.altname}</p>}
            <p className="mt-2 line-clamp-4 flex-1 text-sm leading-relaxed text-muted">
              {g.description}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-edge pt-2.5 text-[11px] text-muted">
              <span>{g.onionCount} leak site{g.onionCount === 1 ? "" : "s"}</span>
              {g.addedDate && <span>tracked {formatDate(g.addedDate)}</span>}
            </div>
          </article>
        ))}
      </div>

      {visible < filtered.length && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + 24)}
          className="mt-5 w-full rounded-xl border border-edge py-3 text-sm text-muted transition hover:border-neon/50 hover:text-neon"
        >
          Show more crews
        </button>
      )}
    </div>
  );
}
