import type { Metadata } from "next";
import {
  getRecentVictims,
  getGroups,
  activeGroups,
  targetedSectors,
  targetedCountries,
} from "@/lib/sources/ransomware";
import { SectionHeading, StatCard, SourceStatus, BarList } from "@/components/ui";
import GroupGrid from "@/components/GroupGrid";
import VictimList from "@/components/VictimList";
import { countryName } from "@/lib/format";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Threat Actors",
  description:
    "Ransomware and extortion crews, their leak-site activity, targeted sectors and geographies.",
};

export default async function ThreatActorsPage() {
  const victimRes = await getRecentVictims(80);
  const victims = victimRes.data;
  const groupRes = await getGroups(victims);
  const groups = groupRes.data;

  return (
    <>
      <header className="rise mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SourceStatus label="Leak-site feed" ok={victimRes.ok} error={victimRes.error} />
          <SourceStatus label="Group directory" ok={groupRes.ok} error={groupRes.error} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Threat actors</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Extortion crews publish their victims to pressure payment. Aggregating those postings
          shows who is currently operating, which sectors they favour, and where their targets sit
          — useful context for prioritising your own defences.
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tracked crews" value={groups.length} accent="alert" />
        <StatCard label="Recent victim posts" value={victims.length} accent="warn" />
        <StatCard
          label="Crews active recently"
          value={new Set(victims.map((v) => v.group)).size}
          accent="neon"
        />
        <StatCard
          label="Countries hit"
          value={new Set(victims.filter((v) => v.country).map((v) => v.country)).size}
          accent="blue"
        />
      </section>

      <section className="mb-10 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <SectionHeading eyebrow="Attribution" title="Most active crews" />
          <BarList
            items={activeGroups(victims, 9).map((g) => ({ label: g.group, value: g.count }))}
            colorFrom="#f43f5e"
            colorTo="#fb923c"
          />
        </div>
        <div className="panel p-5">
          <SectionHeading eyebrow="Victimology" title="Targeted sectors" />
          <BarList
            items={targetedSectors(victims, 9).map((s) => ({ label: s.sector, value: s.count }))}
            colorFrom="#fb923c"
            colorTo="#facc15"
          />
        </div>
        <div className="panel p-5">
          <SectionHeading eyebrow="Geography" title="Targeted countries" />
          <BarList
            items={targetedCountries(victims, 9).map((c) => ({
              label: countryName(c.country),
              value: c.count,
            }))}
          />
        </div>
      </section>

      <section className="mb-10">
        <SectionHeading eyebrow="Directory" title="Tracked ransomware crews" />
        <GroupGrid groups={groups} />
      </section>

      <section>
        <SectionHeading eyebrow="Leak sites" title="Recent claimed victims" />
        <VictimList victims={victims.slice(0, 24)} />
      </section>
    </>
  );
}
