import type { Victim } from "@/lib/types";
import { countryName, relativeTime } from "@/lib/format";

export default function VictimList({ victims }: { victims: Victim[] }) {
  if (!victims.length) {
    return (
      <div className="panel grid place-items-center py-12 text-center text-sm text-muted">
        Leak-site feed is temporarily unavailable.
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {victims.map((v, i) => (
        <li key={`${v.victim}-${v.group}-${i}`} className="panel panel-hover p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge sev-critical">{v.group}</span>
            <h3 className="truncate text-sm font-semibold text-ink">{v.victim}</h3>
            <span className="ml-auto font-mono text-xs text-muted">
              {relativeTime(v.discovered)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>🎯 {v.activity}</span>
            {v.country && <span>📍 {countryName(v.country)}</span>}
            {v.domain && <span className="font-mono">{v.domain}</span>}
          </div>
          {v.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{v.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
