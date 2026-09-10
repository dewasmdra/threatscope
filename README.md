# ThreatScope — Cybersecurity Trend Dashboard

A Next.js 16 (App Router) dashboard that aggregates live cybersecurity trend data into one
operational view: new vulnerability disclosures, confirmed in-the-wild exploitation, ransomware
crew activity, and security headlines.

No API keys required — every source is a public, unauthenticated feed.

## Data sources

| Source | Endpoint | Used for | Cache |
|---|---|---|---|
| NIST NVD API 2.0 | `services.nvd.nist.gov/rest/json/cves/2.0` | Newly published CVEs, CVSS scores, CWE classes | 30 min live / 7 d settled |
| CISA KEV catalog | `cisa.gov/.../known_exploited_vulnerabilities.json` | Vulnerabilities confirmed exploited in the wild | 1 h |
| ransomware.live | `api.ransomware.live/v2` | Leak-site victim postings, crew directory | 30 min – 6 h |
| RSS | The Hacker News, BleepingComputer, Krebs on Security | Security headlines | 15 min |

Every fetch goes through `lib/sources/fetcher.ts`, which never throws: a dead or rate-limited
upstream degrades to an empty result and the page renders with a "degraded" source pill instead
of erroring out.

## Pages

- `/` — dashboard: KPI tiles, disclosure-volume trend, severity mix, KEV growth, most-exploited
  vendors, ransomware attribution/victimology/geography, and the two live feeds.
- `/cve` — CVEs published in the trailing 7 days: full-window counts and charts, with the 300 most
  recent searchable and filterable by severity.
- `/kev` — the full CISA KEV catalog with search and a ransomware-linked filter.
- `/threat-actors` — ransomware crew directory plus recent leak-site claims.
- `/news` — merged RSS feed from independent security newsrooms.
- `/report` and `/report/YYYY-MM` — monthly trend report with month-over-month deltas, CSV export
  and a print stylesheet for PDF.

## Running it

```bash
cp .env.example .env.local   # optional, but see NVD_API_KEY below
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

### NVD_API_KEY

Optional, free, and worth setting. NVD allows 5 requests / 30s anonymously and 50 / 30s with a
key. Requests are serialised and throttled in `lib/sources/nvd.ts`, so the key mostly buys
latency: a full month walk (7 pages) takes ~2 minutes without one and seconds with it.

## Monthly reports

`/report/YYYY-MM` recomputes its figures from source for the calendar month requested, so the
same period gives the same numbers whenever it is opened. It covers CVE volume and severity mix,
daily disclosure counts, leading CWEs, KEV entries added that month, and ransomware victimology —
each with a month-over-month delta where a baseline exists.

Deliberate design choices:

- **The comparison month costs two requests, not a second walk.** Only headline totals are needed
  for a delta, and those come from NVD `totalResults` plus one ransomware.live call.
- **Aggregates are cached by how settled the window is.** A window that closed more than two days
  ago is cached for a week; a live trailing window for 30 minutes. Re-walking seven pages of a
  finished month every half hour would be pure waste.
- **News is excluded on purpose.** RSS feeds carry no archive, so past months cannot be
  reconstructed from them. Reporting on them would require snapshotting daily from now on.
- **Partial data is stated, never hidden.** If the page cap is hit or NVD is unreachable, the
  report says so; the headline total always comes from NVD's own count.

## Notes

- **NVD returns results ascending by publish date.** Reading only the first page therefore yields
  the *oldest* advisories in a range, not the newest — the reason `lib/sources/nvd.ts` walks every
  page of a window and aggregates as it goes rather than making a single request.
- **`/`, `/cve` and `/report/[month]` render on demand.** A full window walk exceeds Next's 60s
  build-time prerender cap. The expensive aggregation is cached (`unstable_cache`), so only the
  first request after expiry pays for it.
- **Trailing windows are anchored to whole UTC days, and that is load-bearing.** The window
  bounds form the cache key. An unsnapped `new Date()` end changes the key every millisecond and
  defeats the cache entirely; bucketing it to the same period as the TTL is just as bad, because
  the key then rotates exactly when the entry expires, making every refresh a blocking miss
  instead of a stale hit. A day-coarse key with a 30-minute TTL lets Next serve stale while it
  revalidates. `/` and `/cve` also request the same `latestN`, so they share one cached walk.
- **NVD panels stream.** The dashboard and CVE feed paint their shell immediately and fill the
  NVD-backed panels behind Suspense boundaries; a request-scoped `cache()` keeps the shared walk
  to one per request. Measured locally: first byte ~0.14s, ~0.05s once cached, and ~0.08s on a
  request that arrives after the TTL expired (stale served, refresh in background). Only a
  genuinely empty cache pays the full ~30s walk, and the loading state says so.
- **NVD download speed is the floor, not the rate limiter.** Profiling a 7-day window: 6.6 MB
  took 21s and 4.3 MB took 40s to transfer. Cutting requests does not help; only cutting bytes
  or caching does.
- **Unknown report periods are rejected in `middleware.ts`.** Calling `notFound()` inside the page
  renders the right body but leaves the status at 200, because a dynamic segment has already
  committed its response headers by then.
- **Charts are hand-rolled SVG** (`components/charts.tsx`) — no charting dependency. The severity
  scale is an ordered status scale, so every segment ships a direct text label and value; colour
  is never the only encoding.
- **KEV payload.** The raw catalog is >2 MB, past Next's data-cache ceiling, so it is fetched
  uncached and the *trimmed* result is cached via `unstable_cache`. The `/kev` page still ships the
  whole catalog to the client so search covers everything — that makes it the heaviest route
  (~800 KB of HTML). If that matters for your deployment, move the search server-side.
- NVD rate limits are handled by a serial throttling queue in `lib/sources/nvd.ts`; set
  `NVD_API_KEY` to raise the ceiling (see above).
- ransomware.live returns HTTP 429 under load. When that happens the crew directory shows an
  explicit "rate-limited" state rather than an empty grid.
- All content is aggregated for defensive research and awareness. Actor names and leak-site claims
  are reproduced as reported by the upstream feed and are not independently verified.
