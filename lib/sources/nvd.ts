import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { CveItem, FetchResult, Severity } from "@/lib/types";

const ENDPOINT = "https://services.nvd.nist.gov/rest/json/cves/2.0";

/** NVD's hard ceiling per request. */
const MAX_PAGE = 2000;
/** Safety valve so a bad date range can't spin forever. */
const MAX_PAGES = 12;
/**
 * Wall-clock ceiling for one window walk, kept well under the 60s `maxDuration` the report
 * routes declare. A busy month can outrun the platform's function limit and return nothing at
 * all; stopping early instead yields a partial window flagged `complete: false`, which the UI
 * already reports via SourceStatus.
 *
 * The walk is not the only thing spending that 60s — the KEV and leak-site fetches run
 * alongside it, the previous month's total costs another throttled request after it, and the
 * page still has to render. 45s left too little room and busy months kept dying at the limit,
 * so the walk gets half the budget and the rest of the request gets the other half.
 */
const WALK_BUDGET_MS = 30_000;

const API_KEY = process.env.NVD_API_KEY;
/**
 * NVD allows 5 requests / 30s anonymously and 50 / 30s with a key.
 * We serialise requests and keep a gap with headroom rather than risk a 403.
 */
const MIN_GAP_MS = API_KEY ? 700 : 6_500;

let queue: Promise<unknown> = Promise.resolve();
let lastStart = 0;

/** Serialises every NVD call and spaces them out to respect the published rate limit. */
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastStart + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastStart = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

interface NvdMetric {
  cvssData?: { baseScore?: number; baseSeverity?: string; vectorString?: string };
  baseSeverity?: string;
}

interface NvdCve {
  cve: {
    id: string;
    published: string;
    lastModified: string;
    sourceIdentifier?: string;
    descriptions?: { lang: string; value: string }[];
    metrics?: Record<string, NvdMetric[]>;
    weaknesses?: { description?: { lang: string; value: string }[] }[];
  };
}

interface NvdResponse {
  totalResults?: number;
  startIndex?: number;
  vulnerabilities?: NvdCve[];
}

function normalizeSeverity(raw?: string): Severity {
  const s = (raw ?? "").toUpperCase();
  if (s === "CRITICAL" || s === "HIGH" || s === "MEDIUM" || s === "LOW") return s;
  return "NONE";
}

/** NVD exposes CVSS v4.0, v3.1, v3.0 and v2 under different keys — take the newest present. */
function pickMetric(metrics?: Record<string, NvdMetric[]>) {
  if (!metrics) return null;
  for (const key of ["cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]) {
    const entry = metrics[key]?.[0];
    if (entry) {
      return {
        score: entry.cvssData?.baseScore ?? null,
        severity: normalizeSeverity(entry.cvssData?.baseSeverity ?? entry.baseSeverity),
        vector: entry.cvssData?.vectorString ?? null,
      };
    }
  }
  return null;
}

function mapCve(v: NvdCve): CveItem {
  const metric = pickMetric(v.cve.metrics);
  const desc =
    v.cve.descriptions?.find((d) => d.lang === "en")?.value ??
    v.cve.descriptions?.[0]?.value ??
    "No description published yet.";
  const cwe = v.cve.weaknesses
    ?.flatMap((w) => w.description ?? [])
    .map((d) => d.value)
    .find((val) => val.startsWith("CWE-"));

  return {
    id: v.cve.id,
    published: v.cve.published,
    lastModified: v.cve.lastModified,
    description: desc.length > 400 ? `${desc.slice(0, 399)}…` : desc,
    severity: metric?.severity ?? "NONE",
    score: metric?.score ?? null,
    vector: metric?.vector ?? null,
    cwe: cwe ?? null,
    source: v.cve.sourceIdentifier ?? "nvd",
    url: `https://nvd.nist.gov/vuln/detail/${v.cve.id}`,
  };
}

/** NVD wants a naked ISO timestamp with milliseconds and no timezone suffix. */
export function nvdStamp(d: Date) {
  return `${d.toISOString().slice(0, 19)}.000`;
}

async function nvdPage(
  start: Date,
  end: Date,
  startIndex: number,
  resultsPerPage: number,
): Promise<NvdResponse | null> {
  const url =
    `${ENDPOINT}?pubStartDate=${encodeURIComponent(nvdStamp(start))}` +
    `&pubEndDate=${encodeURIComponent(nvdStamp(end))}` +
    `&resultsPerPage=${resultsPerPage}&startIndex=${startIndex}`;

  return throttled(async () => {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "cyber-trend-dashboard/1.0",
          Accept: "application/json",
          ...(API_KEY ? { apiKey: API_KEY } : {}),
        },
        // Pages run to several MB, past the data cache ceiling — the aggregate is cached instead.
        cache: "no-store",
        // A page runs to several MB and a stalled one must not eat the whole function budget:
        // this has to stay comfortably below WALK_BUDGET_MS so the walk can degrade instead.
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) return null;
      return (await res.json()) as NvdResponse;
    } catch {
      return null;
    }
  });
}

export interface CveWindow {
  /** Every CVE NVD reports as published in the window, not just the ones we downloaded. */
  total: number;
  severity: Record<Severity, number>;
  daily: { date: string; count: number }[];
  cwes: { cwe: string; count: number }[];
  /** Newest advisories, full detail, for display. */
  latest: CveItem[];
  /** False when the page cap was hit, so aggregates cover only part of the window. */
  complete: boolean;
  pages: number;
}

const EMPTY_SEVERITY = (): Record<Severity, number> => ({
  CRITICAL: 0,
  HIGH: 0,
  MEDIUM: 0,
  LOW: 0,
  NONE: 0,
});

function emptyWindow(start: Date, end: Date): CveWindow {
  return {
    total: 0,
    severity: EMPTY_SEVERITY(),
    daily: dayKeys(start, end).map((date) => ({ date, count: 0 })),
    cwes: [],
    latest: [],
    complete: false,
    pages: 0,
  };
}

function dayKeys(start: Date, end: Date) {
  const days: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/**
 * Walks every page NVD reports for the window and aggregates as it goes.
 *
 * NVD returns results ASCENDING by publish date, so reading only the first page
 * yields the OLDEST advisories — the reason aggregates here are built from a full
 * walk rather than a single request.
 */
async function walkWindow(start: Date, end: Date, latestN: number): Promise<CveWindow> {
  const deadline = Date.now() + WALK_BUDGET_MS;
  const first = await nvdPage(start, end, 0, MAX_PAGE);
  if (!first) return emptyWindow(start, end);

  const total = first.totalResults ?? 0;
  const severity = EMPTY_SEVERITY();
  const dayCounts = new Map<string, number>(dayKeys(start, end).map((d) => [d, 0]));
  const cweCounts = new Map<string, number>();
  let latest: CveItem[] = [];
  let pages = 0;

  const absorb = (batch: NvdCve[]) => {
    for (const raw of batch) {
      const item = mapCve(raw);
      severity[item.severity] += 1;

      const day = item.published.slice(0, 10);
      if (dayCounts.has(day)) dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);

      if (item.cwe && item.cwe !== "CWE-noinfo" && item.cwe !== "CWE-Other") {
        cweCounts.set(item.cwe, (cweCounts.get(item.cwe) ?? 0) + 1);
      }
      latest.push(item);
    }
    // Keep only the newest slice so memory stays flat across a 12k-CVE month.
    latest.sort((a, b) => +new Date(b.published) - +new Date(a.published));
    latest = latest.slice(0, latestN);
  };

  absorb(first.vulnerabilities ?? []);
  pages = 1;

  let index = MAX_PAGE;
  let complete = true;
  while (index < total) {
    if (pages >= MAX_PAGES || Date.now() >= deadline) {
      complete = false;
      break;
    }
    const page = await nvdPage(start, end, index, MAX_PAGE);
    if (!page) {
      complete = false;
      break;
    }
    absorb(page.vulnerabilities ?? []);
    pages += 1;
    index += MAX_PAGE;
  }

  return {
    total,
    severity,
    daily: [...dayCounts.entries()].map(([date, count]) => ({ date, count })),
    cwes: [...cweCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([cwe, count]) => ({ cwe, count })),
    latest,
    complete,
    pages,
  };
}

const walkCached = async (startIso: string, endIso: string, latestN: number) =>
  walkWindow(new Date(startIso), new Date(endIso), latestN);

/** Windows that are still moving need frequent refresh... */
const cachedWindowLive = unstable_cache(walkCached, ["nvd-cve-window-live-v1"], {
  revalidate: 1800,
  tags: ["nvd"],
});

/** ...whereas a window that closed days ago is settled; re-walking 7 pages for it is waste. */
const cachedWindowArchive = unstable_cache(walkCached, ["nvd-cve-window-archive-v1"], {
  revalidate: 604_800,
  tags: ["nvd"],
});

const SETTLED_AFTER_MS = 2 * 86_400_000;

function pickCache(end: Date) {
  return Date.now() - end.getTime() > SETTLED_AFTER_MS ? cachedWindowArchive : cachedWindowLive;
}

const cachedTotalLive = unstable_cache(
  async (startIso: string, endIso: string) =>
    (await nvdPage(new Date(startIso), new Date(endIso), 0, 1))?.totalResults ?? null,
  ["nvd-cve-total-v1"],
  { revalidate: 604_800, tags: ["nvd"] },
);

export async function getCveWindow(
  start: Date,
  end: Date,
  latestN = 300,
): Promise<FetchResult<CveWindow>> {
  const fetchedAt = new Date().toISOString();
  try {
    const data = await pickCache(end)(start.toISOString(), end.toISOString(), latestN);
    return {
      data,
      ok: data.pages > 0,
      error: data.pages === 0 ? "NVD unreachable" : data.complete ? undefined : "partial window",
      fetchedAt,
    };
  } catch (err) {
    return {
      data: emptyWindow(start, end),
      ok: false,
      error: err instanceof Error ? err.message : "unknown error",
      fetchedAt,
    };
  }
}

/**
 * Trailing-window helper used by the dashboard and the CVE feed.
 *
 * The window is anchored to whole UTC days, which matters for more than tidiness: the window
 * bounds form the cache key, so a moving `new Date()` end would change the key on every
 * request and turn every read into a blocking miss. Bucketing the key to the day — far coarser
 * than the 30-minute TTL — means the same entry is reused, so an expired one can be served
 * stale while it refreshes instead of making one unlucky visitor wait out a full walk.
 *
 * `cache()` additionally shares one walk between Suspense boundaries within a request.
 */
export const getRecentCveWindow = cache(async (days = 7, latestN = 300) => {
  const now = new Date();
  const endOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59),
  );
  const start = new Date(endOfToday.getTime() - (days - 1) * 86_400_000);
  start.setUTCHours(0, 0, 0, 0);
  return getCveWindow(start, endOfToday, latestN);
});

/** Total published in a range, without downloading the range — one cheap, cached request. */
export async function getCveTotal(start: Date, end: Date): Promise<number | null> {
  try {
    return await cachedTotalLive(start.toISOString(), end.toISOString());
  } catch {
    return null;
  }
}
