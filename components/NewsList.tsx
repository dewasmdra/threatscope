import type { NewsItem } from "@/lib/types";
import { relativeTime } from "@/lib/format";

export default function NewsList({ items }: { items: NewsItem[] }) {
  if (!items.length) {
    return (
      <div className="panel grid place-items-center py-12 text-center text-sm text-muted">
        News feeds are temporarily unreachable.
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((n) => (
        <li key={n.link} className="panel panel-hover p-4">
          <a href={n.link} target="_blank" rel="noreferrer" className="group block">
            <div className="flex items-center gap-2 text-xs">
              <span className="badge sev-none">{n.source}</span>
              <span className="font-mono text-muted">{relativeTime(n.pubDate)}</span>
            </div>
            <h3 className="mt-2 font-semibold leading-snug text-ink transition group-hover:text-neon">
              {n.title}
            </h3>
            {n.summary && (
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{n.summary}</p>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}
