import type { KevItem } from "@/lib/types";

/** Marquee of the newest actively-exploited CVEs — duplicated once for a seamless loop. */
export default function Ticker({ items }: { items: KevItem[] }) {
  if (!items.length) return null;
  const slice = items.slice(0, 14);
  const loop = [...slice, ...slice];

  return (
    <div className="relative overflow-hidden border-y border-edge bg-panel/60">
      <div className="marquee-track gap-8 py-2.5">
        {loop.map((k, i) => (
          <span key={`${k.cveID}-${i}`} className="flex items-center gap-2 whitespace-nowrap text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-alert" aria-hidden />
            <span className="font-mono font-semibold text-alert">{k.cveID}</span>
            <span className="text-muted">
              {k.vendorProject} {k.product}
            </span>
            {k.ransomware && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-warn">
                ransomware
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-void to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-void to-transparent" />
    </div>
  );
}
