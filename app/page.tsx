import { Suspense } from "react";
import Link from "next/link";
import { getRecentCveWindow } from "@/lib/sources/nvd";
import { getKev, kevAddedThisYear, topKevVendors, kevByYear } from "@/lib/sources/kev";
import {
  getRecentVictims,
  activeGroups,
  targetedSectors,
  targetedCountries,
} from "@/lib/sources/ransomware";
import { getNews } from "@/lib/sources/news";
import { SectionHeading, StatCard, SourceStatus, BarList } from "@/components/ui";
import { TrendChart, SeverityBar, YearBars } from "@/components/charts";
import VictimList from "@/components/VictimList";
import NewsList from "@/components/NewsList";
import Ticker from "@/components/Ticker";
import { SEVERITY_STYLES, compact, countryName, relativeTime } from "@/lib/format";

// Walking every NVD page for the window exceeds the 60s build-time prerender cap, so this
// renders on demand; the expensive aggregation itself is cached for 30 minutes.
export const dynamic = "force-dynamic";

/* ---------------------------------------------------------------------------
 * NVD-backed panels.
 *
 * NVD is the only slow source on this page, so each panel that needs it sits
 * behind its own Suspense boundary and the rest of the dashboard paints without
 * waiting. They share one request-memoised loader, so the walk happens once.
 * ------------------------------------------------------------------------- */

async function NvdStatusPill() {
  const res = await getRecentCveWindow(7, 300);
  return <SourceStatus label="NVD" ok={res.ok} error={res.error} />;
}

async function CveKpiTile() {
  const { data, ok } = await getRecentCveWindow(7, 300);
  const highOrWorse = data.severity.CRITICAL + data.severity.HIGH;
  return (
    <StatCard
      label="CVEs · last 7 days"
      value={ok ? compact(data.total) : "—"}
      hint={ok ? `${compact(highOrWorse)} rated high or critical` : "NVD unreachable"}
      accent="blue"
    />
  );
}

async function CveTrendPanels() {
  const { data } = await getRecentCveWindow(7, 300);
  return (
    <>
      <div className="panel p-5 lg:col-span-2">
        <SectionHeading eyebrow="Disclosure volume" title="New CVEs published per day" />
        <TrendChart series={data.daily} />
      </div>
      <div className="panel p-5">
        <SectionHeading eyebrow="CVSS mix" title="Severity distribution" />
        <SeverityBar counts={data.severity} />
      </div>
    </>
  );
}

async function CriticalSpotlight() {
  const { data } = await getRecentCveWindow(7, 300);
  const critical = data.latest.filter((c) => c.severity === "CRITICAL").slice(0, 6);
  if (!critical.length) return null;

  return (
    <section className="mb-10">
      <SectionHeading
        eyebrow="Priority triage"
        title="Newest critical advisories"
        action={
          <Link href="/cve" className="link-underline text-xs text-neon">
            View all →
          </Link>
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {critical.map((cve) => (
          <a
            key={cve.id}
            href={cve.url}
            target="_blank"
            rel="noreferrer"
            className="panel panel-hover flex flex-col p-4"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-neon">{cve.id}</span>
              <span className={`badge ${SEVERITY_STYLES.CRITICAL.className}`}>
                Critical{cve.score !== null ? ` · ${cve.score.toFixed(1)}` : ""}
              </span>
            </div>
            <p className="mt-2 line-clamp-4 flex-1 text-sm leading-relaxed text-muted">
              {cve.description}
            </p>
            <p className="mt-3 font-mono text-[11px] text-muted/70">
              {relativeTime(cve.published)} · {cve.cwe ?? "uncategorised"}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

async function CweSection() {
  const { data } = await getRecentCveWindow(7, 300);
  const cwes = data.cwes.slice(0, 6);
  if (!cwes.length) return null;

  return (
    <section className="panel mt-10 p-5">
      <SectionHeading eyebrow="Root causes" title="Most common weakness types this week" />
      <BarList
        items={cwes.map((c) => ({ label: c.cwe, value: c.count }))}
        colorFrom="#4d8bff"
        colorTo="#22e5c8"
      />
    </section>
  );
}

function PanelSkeleton({ className = "" }: { className?: string }) {
  return <div className={`panel animate-pulse bg-white/[0.03] ${className}`} />;
}

/* ------------------------------------------------------------------------- */

export default async function DashboardPage() {
  // Everything here is cheap and cached, so the shell paints without waiting on NVD.
  const [kevRes, victimRes, newsRes] = await Promise.all([
    getKev(),
    getRecentVictims(60),
    getNews(12),
  ]);

  const kev = kevRes.data;
  const victims = victimRes.data;
  const ransomKev = kev.items.filter((k) => k.ransomware).length;

  return (
    <>
      <div className="-mx-4 mb-8 sm:-mx-6">
        <Ticker items={kev.items} />
      </div>

      {/* Hero */}
      <section className="rise mb-10">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="badge sev-low">
            <span className="pulse-dot" aria-hidden />
            Live feed
          </span>
          <Suspense fallback={<span className="badge sev-none">NVD · loading</span>}>
            <NvdStatusPill />
          </Suspense>
          <SourceStatus label="CISA KEV" ok={kevRes.ok} error={kevRes.error} />
          <SourceStatus label="ransomware.live" ok={victimRes.ok} error={victimRes.error} />
          <SourceStatus label="News" ok={newsRes.ok} error={newsRes.error} />
        </div>

        <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
          The threat landscape,{" "}
          <span className="bg-gradient-to-r from-neon to-neon-2 bg-clip-text text-transparent">
            refreshed every 30 minutes
          </span>
          .
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          ThreatScope pulls new vulnerability disclosures, confirmed in-the-wild exploitation,
          ransomware leak-site postings and security headlines into one operational view — so you
          can see what changed today without opening five tabs.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/cve"
            className="rounded-xl bg-neon px-5 py-2.5 text-sm font-semibold text-void transition hover:bg-neon/85"
          >
            Explore CVE feed
          </Link>
          <Link
            href="/report"
            className="rounded-xl border border-edge px-5 py-2.5 text-sm font-medium text-ink transition hover:border-neon/50 hover:text-neon"
          >
            Monthly report
          </Link>
        </div>
      </section>

      {/* KPIs */}
      <section className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<PanelSkeleton className="h-[116px]" />}>
          <CveKpiTile />
        </Suspense>
        <StatCard
          label="KEV catalog"
          value={compact(kev.count)}
          hint={`${kevAddedThisYear(kev.items)} added in ${new Date().getFullYear()}`}
          accent="alert"
        />
        <StatCard
          label="Ransomware-linked KEVs"
          value={compact(ransomKev)}
          hint="Confirmed used in extortion campaigns"
          accent="warn"
        />
        <StatCard
          label="Leak-site victims"
          value={compact(victims.length)}
          hint={`${new Set(victims.map((v) => v.group)).size} distinct crews`}
          accent="neon"
        />
      </section>

      {/* Trend + severity */}
      <section className="mb-10 grid gap-4 lg:grid-cols-3">
        <Suspense
          fallback={
            <>
              <div className="panel flex h-72 items-center justify-center p-5 lg:col-span-2">
                <p className="flex items-center gap-2 text-sm text-muted">
                  <span className="pulse-dot" aria-hidden />
                  Pulling this week&apos;s advisories from NVD…
                </p>
              </div>
              <PanelSkeleton className="h-72" />
            </>
          }
        >
          <CveTrendPanels />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <CriticalSpotlight />
      </Suspense>

      {/* Exploitation analytics */}
      <section className="mb-10 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <SectionHeading
            eyebrow="CISA KEV"
            title="Known-exploited vulnerabilities added per year"
          />
          <YearBars data={kevByYear(kev.items).slice(-8)} />
        </div>
        <div className="panel p-5">
          <SectionHeading eyebrow="Attack surface" title="Most-exploited vendors" />
          <BarList
            items={topKevVendors(kev.items, 8).map((v) => ({ label: v.vendor, value: v.count }))}
          />
        </div>
      </section>

      {/* Ransomware analytics */}
      <section className="mb-10 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <SectionHeading eyebrow="Attribution" title="Most active crews" />
          <BarList
            items={activeGroups(victims, 8).map((g) => ({ label: g.group, value: g.count }))}
            colorFrom="#f43f5e"
            colorTo="#fb923c"
          />
        </div>
        <div className="panel p-5">
          <SectionHeading eyebrow="Victimology" title="Targeted sectors" />
          <BarList
            items={targetedSectors(victims, 7).map((s) => ({ label: s.sector, value: s.count }))}
            colorFrom="#fb923c"
            colorTo="#facc15"
          />
        </div>
        <div className="panel p-5">
          <SectionHeading eyebrow="Geography" title="Targeted countries" />
          <BarList
            items={targetedCountries(victims, 8).map((c) => ({
              label: countryName(c.country),
              value: c.count,
            }))}
          />
        </div>
      </section>

      {/* Feeds */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Leak sites"
            title="Latest ransomware claims"
            action={
              <Link href="/threat-actors" className="link-underline text-xs text-neon">
                All actors →
              </Link>
            }
          />
          <VictimList victims={victims.slice(0, 6)} />
        </div>
        <div>
          <SectionHeading
            eyebrow="Open source intel"
            title="Security headlines"
            action={
              <Link href="/news" className="link-underline text-xs text-neon">
                More news →
              </Link>
            }
          />
          <NewsList items={newsRes.data.slice(0, 6)} />
        </div>
      </section>

      <Suspense fallback={null}>
        <CweSection />
      </Suspense>
    </>
  );
}
