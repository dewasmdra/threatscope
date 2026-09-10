import type { FetchResult } from "@/lib/types";

const UA =
  "cyber-trend-dashboard/1.0 (+https://github.com/; educational threat-intel aggregator)";

/**
 * Fetch JSON with an ISR cache window. Never throws: a failed source degrades
 * to `fallback` so one dead upstream can't take down the whole dashboard.
 */
export async function safeJson<T>(
  url: string,
  fallback: T,
  revalidate = 1800,
  init: RequestInit = {},
): Promise<FetchResult<T>> {
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "User-Agent": UA, Accept: "application/json", ...init.headers },
      // revalidate 0 means "skip the data cache" — used for payloads over its 2MB ceiling.
      ...(revalidate > 0 ? { next: { revalidate } } : {}),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return { data: fallback, ok: false, error: `HTTP ${res.status}`, fetchedAt };
    }
    return { data: (await res.json()) as T, ok: true, fetchedAt };
  } catch (err) {
    const error = err instanceof Error ? err.message : "unknown error";
    return { data: fallback, ok: false, error, fetchedAt };
  }
}

export async function safeText(
  url: string,
  revalidate = 1800,
): Promise<FetchResult<string>> {
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return { data: "", ok: false, error: `HTTP ${res.status}`, fetchedAt };
    }
    return { data: await res.text(), ok: true, fetchedAt };
  } catch (err) {
    const error = err instanceof Error ? err.message : "unknown error";
    return { data: "", ok: false, error, fetchedAt };
  }
}
