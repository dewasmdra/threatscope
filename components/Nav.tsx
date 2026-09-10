"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/cve", label: "CVE Feed" },
  { href: "/kev", label: "Exploited (KEV)" },
  { href: "/threat-actors", label: "Threat Actors" },
  { href: "/news", label: "Intel News" },
  { href: "/report", label: "Monthly Report" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-edge/80 bg-void/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-neon/40 bg-neon/10 text-neon">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 2.5 4.5 5.8v5.6c0 4.6 3.1 8.4 7.5 10.1 4.4-1.7 7.5-5.5 7.5-10.1V5.8L12 2.5Z" />
              <path d="M9.2 12.1l2 2 3.6-3.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block font-mono text-sm font-bold tracking-tight text-ink">
              THREAT<span className="text-neon">SCOPE</span>
            </span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-muted">
              Cyber Trend Intelligence
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-neon/10 text-neon"
                    : "text-muted hover:bg-white/5 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-edge p-2 text-muted md:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-edge bg-panel/95 px-4 py-2 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-white/5 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
