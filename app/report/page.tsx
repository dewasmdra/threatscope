import type { Metadata } from "next";
import Link from "next/link";
import { latestCompleteMonth, monthLabel, recentMonths } from "@/lib/report";
import { SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Monthly Reports",
  description: "Month-by-month cybersecurity trend reports built from NVD, CISA KEV and leak-site data.",
};

export default function ReportIndexPage() {
  const latest = latestCompleteMonth();
  const months = recentMonths(12);

  return (
    <>
      <header className="rise mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon/80">Reporting</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Monthly trend reports
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Each report recomputes its figures from source for the calendar month it covers, so a
          period you open today gives the same numbers as one opened last week. Every metric is
          exportable as CSV and the page is laid out to print cleanly to PDF.
        </p>
        <Link
          href={`/report/${latest}`}
          className="mt-5 inline-block rounded-xl bg-neon px-5 py-2.5 text-sm font-semibold text-void transition hover:bg-neon/85"
        >
          Open {monthLabel(latest)} report
        </Link>
      </header>

      <SectionHeading eyebrow="Archive" title="Available periods" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {months.map((m) => (
          <Link key={m} href={`/report/${m}`} className="panel panel-hover flex items-center justify-between p-4">
            <span className="text-sm font-medium text-ink">{monthLabel(m)}</span>
            <span className="font-mono text-xs text-muted">{m} →</span>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted">
        The first time a period is opened it is built from scratch — that walks every page NVD holds
        for the month and can take up to a minute without an NVD API key. Afterwards it is served
        from cache.
      </p>
    </>
  );
}
