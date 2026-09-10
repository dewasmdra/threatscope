import type { Metadata } from "next";
import {
  getKev,
  kevAddedThisYear,
  topKevVendors,
  kevByYear,
  kevDueWithin,
} from "@/lib/sources/kev";
import { SectionHeading, StatCard, SourceStatus, BarList } from "@/components/ui";
import { YearBars } from "@/components/charts";
import KevExplorer from "@/components/KevExplorer";
import { formatDate } from "@/lib/format";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Known Exploited Vulnerabilities",
  description:
    "The CISA KEV catalog — vulnerabilities with confirmed exploitation in the wild, with remediation deadlines.",
};

export default async function KevPage() {
  const res = await getKev();
  const kev = res.data;
  const ransomware = kev.items.filter((k) => k.ransomware);
  const dueSoon = kevDueWithin(kev.items, 30);

  return (
    <>
      <header className="rise mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SourceStatus label="CISA KEV" ok={res.ok} error={res.error} />
          <span className="font-mono text-[11px] text-muted">
            catalog {kev.catalogVersion} · released {formatDate(kev.dateReleased)}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Known exploited vulnerabilities
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          CISA only adds a CVE here once exploitation has been observed in the wild. If something
          you run appears in this catalog, it is not a theoretical risk — patch it against the
          published deadline.
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Catalog size" value={kev.count} accent="alert" />
        <StatCard
          label={`Added in ${new Date().getFullYear()}`}
          value={kevAddedThisYear(kev.items)}
          accent="warn"
        />
        <StatCard
          label="Ransomware-linked"
          value={ransomware.length}
          hint="Used in known extortion campaigns"
          accent="alert"
        />
        <StatCard
          label="Deadlines within 30 days"
          value={dueSoon.length}
          hint="Federal remediation due dates"
          accent="neon"
        />
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <SectionHeading eyebrow="Trend" title="Entries added per year" />
          <YearBars data={kevByYear(kev.items)} />
        </div>
        <div className="panel p-5">
          <SectionHeading eyebrow="Attack surface" title="Most-exploited vendors" />
          <BarList
            items={topKevVendors(kev.items, 9).map((v) => ({ label: v.vendor, value: v.count }))}
            colorFrom="#f43f5e"
            colorTo="#fb923c"
          />
        </div>
      </section>

      <SectionHeading eyebrow="Catalog" title="Browse every entry" />
      <KevExplorer items={kev.items} />
    </>
  );
}
