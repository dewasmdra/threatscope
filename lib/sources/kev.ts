import { unstable_cache } from "next/cache";
import { safeJson } from "./fetcher";
import type { FetchResult, KevCatalog, KevItem } from "@/lib/types";

const FEED =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

interface RawKev {
  catalogVersion?: string;
  dateReleased?: string;
  count?: number;
  vulnerabilities?: {
    cveID: string;
    vendorProject: string;
    product: string;
    vulnerabilityName: string;
    dateAdded: string;
    shortDescription?: string;
    dueDate?: string;
    knownRansomwareCampaignUse?: string;
    cwes?: string[];
  }[];
}

const EMPTY: KevCatalog = {
  catalogVersion: "unavailable",
  dateReleased: "",
  count: 0,
  items: [],
};

/**
 * The raw KEV feed is >2MB, past Next's data-cache ceiling, so it is fetched
 * uncached and the trimmed result is what gets cached instead.
 */
async function loadKev(): Promise<FetchResult<KevCatalog>> {
  const res = await safeJson<RawKev>(FEED, {}, 0, { cache: "no-store" });
  const items: KevItem[] = (res.data.vulnerabilities ?? [])
    .map((v) => ({
      cveID: v.cveID,
      vendorProject: v.vendorProject,
      product: v.product,
      vulnerabilityName: v.vulnerabilityName,
      dateAdded: v.dateAdded,
      shortDescription: (v.shortDescription ?? "").slice(0, 180),
      dueDate: v.dueDate ?? "",
      ransomware: (v.knownRansomwareCampaignUse ?? "").toLowerCase() === "known",
    }))
    .sort((a, b) => +new Date(b.dateAdded) - +new Date(a.dateAdded));

  if (!items.length) return { ...res, data: EMPTY };

  return {
    ...res,
    data: {
      catalogVersion: res.data.catalogVersion ?? "unknown",
      dateReleased: res.data.dateReleased ?? "",
      count: res.data.count ?? items.length,
      items,
    },
  };
}

const cachedKev = unstable_cache(loadKev, ["cisa-kev-catalog-v1"], {
  revalidate: 3600,
  tags: ["kev"],
});

/** CISA Known Exploited Vulnerabilities — vulns confirmed exploited in the wild. */
export async function getKev(): Promise<FetchResult<KevCatalog>> {
  return cachedKev();
}

export function kevAddedThisYear(items: KevItem[]) {
  const year = new Date().getFullYear().toString();
  return items.filter((i) => i.dateAdded.startsWith(year)).length;
}

export function topKevVendors(items: KevItem[], limit = 8) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.vendorProject, (counts.get(item.vendorProject) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([vendor, count]) => ({ vendor, count }));
}

/** KEV entries added during a `YYYY-MM` month. */
export function kevInMonth(items: KevItem[], month: string) {
  return items.filter((i) => i.dateAdded.startsWith(month));
}

/** Entries whose federal remediation deadline falls inside the next `days` days. */
export function kevDueWithin(items: KevItem[], days = 30) {
  const now = Date.now();
  const horizon = now + days * 86_400_000;
  return items.filter((k) => {
    const due = Date.parse(k.dueDate);
    return !Number.isNaN(due) && due > now && due < horizon;
  });
}

/** KEV entries added per year — the long-run exploitation curve. */
export function kevByYear(items: KevItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const year = item.dateAdded.slice(0, 4);
    if (year) counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
