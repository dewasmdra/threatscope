"use client";

import { useMemo, useState } from "react";
import type { KevItem } from "@/lib/types";
import { formatDate, relativeTime } from "@/lib/format";

export default function KevExplorer({ items }: { items: KevItem[] }) {
  const [query, setQuery] = useState("");
  const [ransomOnly, setRansomOnly] = useState(false);
  const [visible, setVisible] = useState(30);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((k) => {
      if (ransomOnly && !k.ransomware) return false;
      if (!q) return true;
      return (
        k.cveID.toLowerCase().includes(q) ||
        k.vendorProject.toLowerCase().includes(q) ||
        k.product.toLowerCase().includes(q) ||
        k.vulnerabilityName.toLowerCase().includes(q)
      );
    });
  }, [items, query, ransomOnly]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(30);
          }}
          placeholder="Filter by vendor, product, or CVE…"
          className="flex-1 rounded-xl border border-edge bg-panel px-4 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-neon/60"
        />
        <button
          type="button"
          onClick={() => {
            setRansomOnly((v) => !v);
            setVisible(30);
          }}
          className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium transition ${
            ransomOnly
              ? "border-alert/60 bg-alert/10 text-alert"
              : "border-edge text-muted hover:text-ink"
          }`}
        >
          Ransomware-linked only
        </button>
      </div>

      <p className="mb-3 font-mono text-xs text-muted">
        {filtered.length} of {items.length} exploited vulnerabilities
      </p>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-edge text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">CVE</th>
              <th className="px-4 py-3 font-medium">Vendor / Product</th>
              <th className="px-4 py-3 font-medium">Vulnerability</th>
              <th className="px-4 py-3 font-medium">Added</th>
              <th className="px-4 py-3 font-medium">Fix due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/70">
            {filtered.slice(0, visible).map((k) => (
              <tr key={k.cveID} className="transition hover:bg-white/[0.03]">
                <td className="whitespace-nowrap px-4 py-3 align-top">
                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${k.cveID}`}
                    target="_blank"
                    rel="noreferrer"
                    className="link-underline font-mono text-xs font-semibold text-neon"
                  >
                    {k.cveID}
                  </a>
                  {k.ransomware && (
                    <span className="badge sev-critical mt-1.5 block w-fit">Ransomware</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="block text-ink">{k.vendorProject}</span>
                  <span className="block text-xs text-muted">{k.product}</span>
                </td>
                <td className="max-w-md px-4 py-3 align-top">
                  <span className="block text-ink">{k.vulnerabilityName}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
                    {k.shortDescription}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-muted">
                  {formatDate(k.dateAdded)}
                  <span className="block text-muted/70">{relativeTime(k.dateAdded)}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-muted">
                  {formatDate(k.dueDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible < filtered.length && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + 30)}
          className="mt-5 w-full rounded-xl border border-edge py-3 text-sm text-muted transition hover:border-neon/50 hover:text-neon"
        >
          Load more
        </button>
      )}
    </div>
  );
}
