import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  buildMonthlyReport,
  delta,
  isValidMonth,
  monthLabel,
  previousMonth,
  recentMonths,
  reportToCsv,
} from "@/lib/report";
import { SectionHeading, SourceStatus, BarList } from "@/components/ui";
import { TrendChart, SeverityBar } from "@/components/charts";
import { DeltaBadge, MonthPicker, ExportBar } from "@/components/report-ui";
import { ReportSummary } from "@/components/report-summary";
import { reportToTextAll } from "@/lib/report-summary";
import { countryName, formatDate, compact } from "@/lib/format";

// A month is up to seven NVD pages — far past the 60s build-time prerender cap. Returning no
// static params keeps the build empty while `dynamicParams` lets any period be generated on
// first request and then cached. Deliberately NOT `force-dynamic`: that streams the response,
// which commits a 200 status before notFound() can run for an unknown period.
export const revalidate = 86_400;
export const dynamicParams = true;

// On-demand generation walks up to seven NVD pages, so raise the platform function cap.
export const maxDuration = 60;

export async function generateStaticParams() {
  return [] as { month: string }[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ month: string }>;
}): Promise<Metadata> {
  const { month } = await params;
  if (!isValidMonth(month)) notFound();
  return {
    title: `${monthLabel(month)} report`,
    description: `Monthly cybersecurity trend report for ${monthLabel(month)}.`,
  };
}

function Kpi({
  label,
  value,
  deltaValue,
  hint,
}: {
  label: string;
  value: string | number;
  deltaValue: number | null;
  hint?: string;
}) {
  return (
    <div className="panel p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      <div className="mt-2">
        <DeltaBadge value={deltaValue} />
      </div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="animate-pulse">
      <p className="mb-6 text-sm text-muted">
        Building this report from source. The first run walks every page NVD holds for the month,
        which takes up to a couple of minutes without an NVD API key; later visits are served from
        cache.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="h-64 rounded-2xl bg-white/5 lg:col-span-2" />
        <div className="h-64 rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}

/**
 * Validation runs here, before any JSX is returned, so an unknown period gets a real 404
 * status. The slow aggregation sits behind Suspense instead of a segment-level loading.tsx —
 * a loading.tsx would flush a 200 shell before this check could run.
 */
export default async function MonthlyReportPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  if (!isValidMonth(month)) notFound();

  const months = recentMonths(12);
  const options = months.includes(month) ? months : [month, ...months];

  return (
    <article>
      <header className="rise mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon/80">
            Monthly report
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {monthLabel(month)}
          </h1>
          <p className="mt-2 text-xs text-muted">
            Compared against {monthLabel(previousMonth(month))}
          </p>
        </div>
        <div className="print:hidden">
          <MonthPicker months={options} current={month} />
        </div>
      </header>

      <Suspense fallback={<ReportSkeleton />}>
        <ReportBody month={month} />
      </Suspense>
    </article>
  );
}

async function ReportBody({ month }: { month: string }) {
  const report = await buildMonthlyReport(month);
  const csv = reportToCsv(report);
  const summaries = reportToTextAll(report);

  const cveDelta = delta(report.cve.total, report.cvePrevTotal);
  const kevDelta = delta(report.kev.length, report.kevPrevCount);
  const victimDelta = delta(report.victims.length, report.victimsPrevCount);
  const highOrWorse = report.cve.severity.CRITICAL + report.cve.severity.HIGH;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SourceStatus
            label="NVD"
            ok={report.cveOk}
            error={report.cve.complete ? undefined : "partial"}
          />
          <SourceStatus label="CISA KEV" ok={report.kevOk} />
          <SourceStatus label="ransomware.live" ok={report.victimsOk} />
          <span className="font-mono text-[11px] text-muted">
            generated {formatDate(report.generatedAt)} · KEV catalog {report.kevCatalogVersion}
          </span>
        </div>
        <ExportBar csv={csv} month={month} />
      </div>

      {!report.cve.complete && report.cveOk && (
        <p className="panel mb-6 border-warn/40 p-4 text-sm text-warn">
          NVD returned only part of this month ({report.cve.pages} page
          {report.cve.pages === 1 ? "" : "s"} retrieved). Severity, daily and CWE breakdowns below
          are computed from what was retrieved; the headline total is NVD&apos;s own count and is
          accurate.
        </p>
      )}
      {!report.cveOk && (
        <p className="panel mb-6 border-alert/40 p-4 text-sm text-alert">
          NVD was unreachable, so vulnerability figures in this report are empty. Everything else on
          this page is unaffected.
        </p>
      )}

      <section className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="CVEs published"
          value={compact(report.cve.total)}
          deltaValue={cveDelta}
          hint={`${compact(highOrWorse)} rated high or critical`}
        />
        <Kpi
          label="Added to CISA KEV"
          value={report.kev.length}
          deltaValue={kevDelta}
          hint={`${report.kevRansomware} linked to ransomware campaigns`}
        />
        <Kpi
          label="Ransomware victims"
          value={compact(report.victims.length)}
          deltaValue={victimDelta}
          hint={`${new Set(report.victims.map((v) => v.group)).size} distinct crews`}
        />
        <Kpi
          label="Critical CVEs"
          value={compact(report.cve.severity.CRITICAL)}
          deltaValue={null}
          hint="CVSS base severity 9.0 and above"
        />
      </section>

      <section className="mb-10 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <SectionHeading eyebrow="Disclosure volume" title="CVEs published per day" />
          <TrendChart series={report.cve.daily} />
        </div>
        <div className="panel p-5">
          <SectionHeading eyebrow="CVSS mix" title="Severity distribution" />
          <SeverityBar counts={report.cve.severity} />
        </div>
      </section>

      {report.cve.cwes.length > 0 && (
        <section className="panel mb-10 p-5">
          <SectionHeading eyebrow="Root causes" title="Leading weakness classes" />
          <BarList
            items={report.cve.cwes.slice(0, 8).map((c) => ({ label: c.cwe, value: c.count }))}
            colorFrom="#4d8bff"
            colorTo="#22e5c8"
          />
        </section>
      )}

      <section className="mb-10 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <SectionHeading
            eyebrow="Confirmed exploitation"
            title={`${report.kev.length} vulnerabilities added to CISA KEV`}
          />
          {report.kev.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-edge text-[11px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="py-2 pr-3 font-medium">CVE</th>
                    <th className="py-2 pr-3 font-medium">Vendor / Product</th>
                    <th className="py-2 pr-3 font-medium">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge/70">
                  {report.kev.map((k) => (
                    <tr key={k.cveID}>
                      <td className="whitespace-nowrap py-2 pr-3 align-top">
                        <a
                          href={`https://nvd.nist.gov/vuln/detail/${k.cveID}`}
                          target="_blank"
                          rel="noreferrer"
                          className="link-underline font-mono text-xs font-semibold text-neon"
                        >
                          {k.cveID}
                        </a>
                        {k.ransomware && (
                          <span className="badge sev-critical mt-1 block w-fit">Ransomware</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <span className="block text-ink">{k.vendorProject}</span>
                        <span className="block text-xs text-muted">{k.product}</span>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 align-top text-xs text-muted">
                        {formatDate(k.dateAdded)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">
              No new entries were added to the KEV catalog in this month.
            </p>
          )}
        </div>
        <div className="panel p-5">
          <SectionHeading eyebrow="Attack surface" title="Vendors in KEV this month" />
          {report.kevVendors.length ? (
            <BarList
              items={report.kevVendors.map((v) => ({ label: v.vendor, value: v.count }))}
              colorFrom="#f43f5e"
              colorTo="#fb923c"
            />
          ) : (
            <p className="text-sm text-muted">Nothing added this month.</p>
          )}
        </div>
      </section>

      <section className="mb-10 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <SectionHeading eyebrow="Attribution" title="Most active crews" />
          <BarList
            items={report.crews.map((c) => ({ label: c.group, value: c.count }))}
            colorFrom="#f43f5e"
            colorTo="#fb923c"
          />
        </div>
        <div className="panel p-5">
          <SectionHeading eyebrow="Victimology" title="Targeted sectors" />
          <BarList
            items={report.sectors.map((s) => ({ label: s.sector, value: s.count }))}
            colorFrom="#fb923c"
            colorTo="#facc15"
          />
        </div>
        <div className="panel p-5">
          <SectionHeading eyebrow="Geography" title="Targeted countries" />
          <BarList
            items={report.countries.map((c) => ({
              label: countryName(c.country),
              value: c.count,
            }))}
          />
        </div>
      </section>

      <ReportSummary summaries={summaries} />

      <section className="panel p-5 text-xs leading-relaxed text-muted">
        <h2 className="mb-2 text-sm font-semibold text-ink">Method and caveats</h2>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            CVE figures come from the NVD API, counting advisories with a publication date inside{" "}
            {report.label} (UTC). The headline total is NVD&apos;s own <code>totalResults</code>;
            breakdowns are computed from {report.cve.pages} downloaded page
            {report.cve.pages === 1 ? "" : "s"}.
          </li>
          <li>
            KEV figures count entries whose <code>dateAdded</code> falls in this month — the date
            CISA confirmed exploitation, not the date the CVE was published.
          </li>
          <li>
            Ransomware figures are leak-site claims made by the actors themselves, as collected by
            ransomware.live. They are unverified assertions by criminal groups, not confirmed
            breaches, and undercount victims who paid before publication.
          </li>
          <li>
            Security-news coverage is deliberately excluded: RSS feeds carry no archive, so past
            months cannot be reconstructed from them.
          </li>
        </ul>
        <p className="mt-3">
          <Link href="/report" className="link-underline text-neon">
            All report periods
          </Link>
        </p>
      </section>
    </>
  );
}
