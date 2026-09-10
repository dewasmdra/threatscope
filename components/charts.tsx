"use client";

import { useId, useState } from "react";
import type { Severity } from "@/lib/types";
import { SEVERITY_STYLES } from "@/lib/format";

const SEV_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"];

/**
 * Area + line trend with a crosshair tooltip.
 * Single series, so no legend box — the card title names it.
 */
export function TrendChart({
  series,
  label = "CVEs published",
}: {
  series: { date: string; count: number }[];
  label?: string;
}) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const W = 720;
  const H = 200;
  const PAD = { top: 16, right: 12, bottom: 26, left: 34 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const max = Math.max(...series.map((d) => d.count), 1);
  const step = series.length > 1 ? innerW / (series.length - 1) : innerW;
  const x = (i: number) => PAD.left + i * step;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const line = series.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.count)}`).join(" ");
  const area = `${line} L${x(series.length - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z`;
  // Deduped: a small max (e.g. 1) would otherwise collapse midpoint and top into one value.
  const ticks = [...new Set([0, Math.round(max / 2), max])];

  const point = active !== null ? series[active] : null;

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${label} over the last ${series.length} days`}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22e5c8" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#22e5c8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="#1b2436"
              strokeWidth="1"
            />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#7d8aa3">
              {t}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="#22e5c8" strokeWidth="2" strokeLinejoin="round" />

        {point && active !== null && (
          <g>
            <line
              x1={x(active)}
              x2={x(active)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="#22e5c8"
              strokeOpacity="0.4"
              strokeDasharray="3 3"
            />
            <circle cx={x(active)} cy={y(point.count)} r="5" fill="#22e5c8" stroke="#0b0f1a" strokeWidth="2" />
          </g>
        )}

        {series.map((d, i) => (
          <rect
            key={d.date}
            x={x(i) - step / 2}
            y={PAD.top}
            width={step}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setActive(i)}
          >
            <title>{`${d.date}: ${d.count} ${label}`}</title>
          </rect>
        ))}

        {series.map((d, i) =>
          i % Math.ceil(series.length / 7) === 0 ? (
            <text
              key={`t-${d.date}`}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#7d8aa3"
            >
              {d.date.slice(5)}
            </text>
          ) : null,
        )}
      </svg>

      <figcaption className="mt-1 h-5 text-xs text-muted">
        {point ? (
          <span>
            <span className="font-mono text-ink">{point.date}</span> — {point.count} {label}
          </span>
        ) : (
          <span>Hover the chart for a daily count.</span>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * Severity mix as a stacked ordered bar. Severity is an ordered status scale,
 * so every segment carries a direct text label — identity is never color-alone.
 */
export function SeverityBar({ counts }: { counts: Record<Severity, number> }) {
  const total = SEV_ORDER.reduce((sum, s) => sum + counts[s], 0);
  if (!total) return <p className="text-sm text-muted">No scored CVEs in this window.</p>;

  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        {SEV_ORDER.filter((s) => counts[s] > 0).map((s) => (
          <div
            key={s}
            title={`${SEVERITY_STYLES[s].label}: ${counts[s]} (${Math.round((counts[s] / total) * 100)}%)`}
            style={{
              width: `${(counts[s] / total) * 100}%`,
              backgroundColor: SEVERITY_STYLES[s].hex,
            }}
          />
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {SEV_ORDER.map((s) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: SEVERITY_STYLES[s].hex }}
              aria-hidden
            />
            <span className="w-20 text-ink">{SEVERITY_STYLES[s].label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${total ? Math.max((counts[s] / total) * 100, counts[s] ? 2 : 0) : 0}%`,
                  backgroundColor: SEVERITY_STYLES[s].hex,
                }}
              />
            </span>
            <span className="w-16 text-right font-mono text-xs tabular-nums text-muted">
              {counts[s]} · {total ? Math.round((counts[s] / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** KEV additions per year — magnitude over time, one hue. */
export function YearBars({ data }: { data: [string, number][] }) {
  const max = Math.max(...data.map(([, v]) => v), 1);
  return (
    <div className="flex h-40 items-end gap-2">
      {data.map(([year, count]) => (
        <div key={year} className="flex flex-1 flex-col items-center gap-2">
          <span className="font-mono text-[10px] tabular-nums text-muted">{count}</span>
          <div
            title={`${year}: ${count} KEV entries added`}
            className="w-full rounded-t bg-gradient-to-t from-neon-2/30 to-neon transition hover:opacity-80"
            style={{ height: `${Math.max((count / max) * 100, 2)}%` }}
          />
          <span className="font-mono text-[10px] text-muted">{year.slice(2)}</span>
        </div>
      ))}
    </div>
  );
}
