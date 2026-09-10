import { safeText } from "./fetcher";
import type { FetchResult, NewsItem } from "@/lib/types";

const FEEDS = [
  { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
  { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
  { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" },
];

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

function decode(input: string) {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;|&#39;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

function stripTags(input: string) {
  return decode(input.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function tag(block: string, name: string) {
  // `[^]` matches any char including newlines without needing an escape here.
  const re = new RegExp(`<${name}[^>]*>([^]*?)</${name}>`, "i");
  const raw = re.exec(block)?.[1] ?? "";
  return decode(raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).trim();
}

/** Minimal RSS 2.0 reader — the feeds we consume are well-formed, so no XML dep needed. */
function parseRss(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = stripTags(tag(block, "title"));
    const link = tag(block, "link").trim() || tag(block, "guid").trim();
    if (!title || !link.startsWith("http")) continue;
    items.push({
      title,
      link,
      pubDate: tag(block, "pubDate"),
      source,
      summary: stripTags(tag(block, "description")).slice(0, 260),
    });
  }
  return items;
}

export async function getNews(limit = 24): Promise<FetchResult<NewsItem[]>> {
  const results = await Promise.all(FEEDS.map((f) => safeText(f.url, 900)));

  // Feeds syndicate each other, so the same link can arrive twice — keep the first.
  const seen = new Set<string>();
  const items = results
    .flatMap((res, i) => (res.ok ? parseRss(res.data, FEEDS[i].name) : []))
    .filter((n) => !seen.has(n.link) && seen.add(n.link))
    .sort((a, b) => +new Date(b.pubDate) - +new Date(a.pubDate))
    .slice(0, limit);

  const ok = results.some((r) => r.ok);
  return {
    data: items,
    ok,
    error: ok ? undefined : "all news feeds unreachable",
    fetchedAt: new Date().toISOString(),
  };
}
