import { safeJson } from "./fetcher";
import type { FetchResult, ThreatGroup, Victim } from "@/lib/types";

const BASE = "https://api.ransomware.live/v2";

interface RawVictim {
  victim?: string;
  group?: string;
  group_name?: string;
  country?: string;
  activity?: string;
  domain?: string;
  discovered?: string;
  attackdate?: string;
  description?: string;
  claim_url?: string;
}

interface RawGroup {
  name?: string;
  group_name?: string;
  description?: string;
  added_date?: string;
  altname?: string | null;
  locations?: unknown[];
}

function clean(text: string, max = 320) {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

/** Leak-site victim postings claimed by ransomware crews. */
export async function getRecentVictims(limit = 60): Promise<FetchResult<Victim[]>> {
  const res = await safeJson<RawVictim[]>(`${BASE}/recentvictims`, [], 1800);
  const list = Array.isArray(res.data) ? res.data : [];

  const victims: Victim[] = list
    .map((v) => ({
      victim: v.victim ?? "Unnamed victim",
      group: v.group ?? v.group_name ?? "unknown",
      country: (v.country ?? "").toUpperCase(),
      activity: v.activity ?? "Unknown sector",
      domain: v.domain ?? "",
      discovered: v.discovered ?? v.attackdate ?? "",
      attackdate: v.attackdate ?? "",
      description: clean(v.description ?? ""),
      claimUrl: v.claim_url ?? "",
    }))
    .sort((a, b) => +new Date(b.discovered) - +new Date(a.discovered))
    .slice(0, limit);

  return { ...res, data: victims };
}

export async function getGroups(victims: Victim[] = []): Promise<FetchResult<ThreatGroup[]>> {
  const res = await safeJson<RawGroup[]>(`${BASE}/groups`, [], 21_600);
  const list = Array.isArray(res.data) ? res.data : [];

  const victimCounts = new Map<string, number>();
  for (const v of victims) {
    victimCounts.set(v.group, (victimCounts.get(v.group) ?? 0) + 1);
  }

  const groups: ThreatGroup[] = list
    .map((g) => {
      const name = g.name ?? g.group_name ?? "";
      return {
        name,
        description: clean(g.description ?? "No public profile recorded for this crew.", 260),
        addedDate: g.added_date ?? "",
        altname: g.altname ?? null,
        onionCount: Array.isArray(g.locations) ? g.locations.length : 0,
        victimCount: victimCounts.get(name) ?? 0,
      };
    })
    .filter((g) => g.name)
    .sort((a, b) => b.victimCount - a.victimCount || a.name.localeCompare(b.name));

  return { ...res, data: groups };
}

/**
 * Victims claimed during one month. Separate endpoint from `recentvictims`,
 * which only ever returns the latest ~100 postings regardless of date.
 */
export async function getVictimsByMonth(
  year: number,
  month: number,
): Promise<FetchResult<Victim[]>> {
  const res = await safeJson<RawVictim[]>(`${BASE}/victims/${year}/${month}`, [], 86_400);
  const list = Array.isArray(res.data) ? res.data : [];

  const victims: Victim[] = list
    .map((v) => ({
      victim: v.victim ?? "Unnamed victim",
      group: v.group ?? v.group_name ?? "unknown",
      country: (v.country ?? "").toUpperCase(),
      activity: v.activity ?? "Unknown sector",
      domain: v.domain ?? "",
      discovered: v.discovered ?? v.attackdate ?? "",
      attackdate: v.attackdate ?? "",
      description: clean(v.description ?? ""),
      claimUrl: v.claim_url ?? "",
    }))
    .sort((a, b) => +new Date(b.discovered) - +new Date(a.discovered));

  return { ...res, data: victims };
}

export function activeGroups(victims: Victim[], limit = 8) {
  const counts = new Map<string, number>();
  for (const v of victims) counts.set(v.group, (counts.get(v.group) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([group, count]) => ({ group, count }));
}

export function targetedSectors(victims: Victim[], limit = 7) {
  const counts = new Map<string, number>();
  for (const v of victims) {
    const key = v.activity && v.activity !== "Not Found" ? v.activity : "Unclassified";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([sector, count]) => ({ sector, count }));
}

export function targetedCountries(victims: Victim[], limit = 8) {
  const counts = new Map<string, number>();
  for (const v of victims) {
    if (!v.country) continue;
    counts.set(v.country, (counts.get(v.country) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([country, count]) => ({ country, count }));
}
