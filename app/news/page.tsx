import type { Metadata } from "next";
import { getNews } from "@/lib/sources/news";
import { SectionHeading, SourceStatus } from "@/components/ui";
import NewsList from "@/components/NewsList";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Intel News",
  description: "Security headlines aggregated from leading independent security newsrooms.",
};

export default async function NewsPage() {
  const res = await getNews(40);
  const sources = [...new Set(res.data.map((n) => n.source))];

  return (
    <>
      <header className="rise mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SourceStatus label="RSS aggregator" ok={res.ok} error={res.error} />
          {sources.map((s) => (
            <span key={s} className="badge sev-none">
              {s}
            </span>
          ))}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Intel news</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Headlines merged from independent security newsrooms and sorted newest first. Stories
          often surface breaches and campaigns days before they reach a CVE or KEV entry.
        </p>
      </header>

      <SectionHeading eyebrow="Feed" title={`${res.data.length} recent stories`} />
      <NewsList items={res.data} />
    </>
  );
}
