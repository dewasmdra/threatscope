import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getRecentCveWindow } from "@/lib/sources/nvd";
import { SectionHeading, StatCard, SourceStatus, BarList } from "@/components/ui";
import { TrendChart, SeverityBar } from "@/components/charts";
import CveExplorer from "@/components/CveExplorer";
import { compact } from "@/lib/format";

export const dynamic = "force-dynamic";

// The NVD walk runs on every request here; the platform default cuts it off too early.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "CVE Feed",
  description: "Newly published CVEs from the NIST National Vulnerability Database.",
};

function Skeleton() {
  return (
    <div>
      <p className="mb-6 flex items-center gap-2 text-sm text-muted">
        <span className="pulse-dot" aria-hidden />
        Pulling this week&apos;s advisories from NVD. The first load after a cache refresh takes
        around half a minute; after that this page is instant.
      </p>
      <div className="animate-pulse">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[116px] rounded-2xl bg-white/[0.03]" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="h-72 rounded-2xl bg-white/[0.03] lg:col-span-2" />
        <div className="h-72 rounded-2xl bg-white/[0.03]" />
      </div>
      <div className="mt-8 space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/[0.03]" />
        ))}
      </div>
      </div>
    </div>
  );
}

async function CveBody() {
  const res = await getRecentCveWindow(7, 300);
  const cve = res.data;

  return (
    <>
      <div className="mb-6 flex items-center gap-2">
        <SourceStatus label="NVD API 2.0" ok={res.ok} error={res.error} />
        <span className="font-mono text-[11px] text-muted">
          {compact(cve.total)} published in window · cached 30 min
        </span>
      </div>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Published in window" value={compact(cve.total)} accent="blue" />
        <StatCard label="Critical" value={compact(cve.severity.CRITICAL)} accent="alert" />
        <StatCard label="High" value={compact(cve.severity.HIGH)} accent="warn" />
        <StatCard
          label="Awaiting analysis"
          value={compact(cve.severity.NONE)}
          hint="No CVSS score assigned yet"
          accent="neon"
        />
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <SectionHeading eyebrow="Volume" title="Published per day" />
          <TrendChart series={cve.daily} />
        </div>
        <div className="panel p-5">
          <SectionHeading eyebrow="CVSS mix" title="Severity distribution" />
          <SeverityBar counts={cve.severity} />
        </div>
      </section>

      {cve.cwes.length > 0 && (
        <section className="panel mb-8 p-5">
          <SectionHeading eyebrow="Root causes" title="Leading weakness classes" />
          <BarList
            items={cve.cwes.slice(0, 6).map((c) => ({ label: c.cwe, value: c.count }))}
            colorFrom="#4d8bff"
            colorTo="#22e5c8"
          />
        </section>
      )}

      <SectionHeading
        eyebrow="Explorer"
        title={`${cve.latest.length} most recent advisories`}
        action={
          <Link href="/report" className="link-underline text-xs text-neon">
            Monthly reports →
          </Link>
        }
      />
      <CveExplorer items={cve.latest} />
    </>
  );
}

export default function CvePage() {
  return (
    <>
      <header className="rise mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">CVE feed</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Every advisory published to the National Vulnerability Database in the last seven days,
          scored with the newest CVSS metric NVD provides. Counts and charts cover the whole window;
          the searchable list below holds the most recent 300.
        </p>
      </header>

      <Suspense fallback={<Skeleton />}>
        <CveBody />
      </Suspense>
    </>
  );
}
