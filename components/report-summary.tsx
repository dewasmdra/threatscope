"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui";
import type { SummaryLocale } from "@/lib/report-summary";

/** The summary exists to be pasted into an Indonesian Word document; flip this if that changes. */
const DEFAULT_LOCALE: SummaryLocale = "id";

const BTN =
  "rounded-xl border border-edge px-4 py-2 text-sm text-ink transition hover:border-neon/50 hover:text-neon";

interface UiLabels {
  eyebrow: string;
  title: string;
  lang: string;
  copy: string;
  copied: string;
  failed: string;
  area: string;
  hint: string;
  error: string;
}

const LABELS: Record<SummaryLocale, UiLabels> = {
  id: {
    eyebrow: "Salin ke Word",
    title: "Ringkasan teks",
    lang: "Bahasa ringkasan",
    copy: "Salin ke clipboard",
    copied: "Tersalin",
    failed: "Gagal menyalin",
    area: "Ringkasan teks biasa",
    hint: "Teks ini sudah diformat untuk ditempel ke dokumen Word: tanpa markdown, satu poin satu baris.",
    error: "Salin gagal. Pilih teks di atas lalu tekan Ctrl+C.",
  },
  en: {
    eyebrow: "Copy for Word",
    title: "Plain-text summary",
    lang: "Summary language",
    copy: "Copy to clipboard",
    copied: "Copied",
    failed: "Copy failed",
    area: "Plain-text summary",
    hint: "This text is formatted for pasting into Word: no markdown, one bullet per line.",
    error: "Copy failed. Select the text above and press Ctrl+C.",
  },
};

export function ReportSummary({ summaries }: { summaries: Record<SummaryLocale, string> }) {
  const [lang, setLang] = useState<SummaryLocale>(DEFAULT_LOCALE);
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Clears the confirmation on its own; the cleanup also covers unmount and a rapid second click.
  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  const t = LABELS[lang];

  const copy = async () => {
    try {
      // Called straight from the click handler with nothing awaited first, so the transient
      // user activation clipboard writes require is still intact.
      if (!navigator.clipboard) throw new Error("clipboard api unavailable");
      await navigator.clipboard.writeText(summaries[lang]);
      setStatus("copied");
    } catch {
      // No clipboard API means a non-secure context — dev served over a LAN IP, typically.
      // The textarea is already on the page for reading, so the legacy path is nearly free.
      const el = ref.current;
      if (el) {
        el.focus();
        el.select();
        setStatus(document.execCommand("copy") ? "copied" : "error");
        return;
      }
      setStatus("error");
    }
  };

  const copyLabel = status === "copied" ? t.copied : status === "error" ? t.failed : t.copy;

  return (
    <section className="panel mb-10 p-5 print:hidden">
      <SectionHeading
        eyebrow={t.eyebrow}
        title={t.title}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2" role="group" aria-label={t.lang}>
              {(["id", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => {
                    setLang(l);
                    setStatus("idle");
                  }}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    lang === l
                      ? "border-neon/60 text-neon"
                      : "border-edge text-muted hover:border-neon/50 hover:text-neon"
                  }`}
                >
                  {l === "id" ? "Bahasa Indonesia" : "English"}
                </button>
              ))}
            </div>
            <button type="button" onClick={copy} className={BTN}>
              {copyLabel}
            </button>
          </div>
        }
      />

      <textarea
        ref={ref}
        readOnly
        spellCheck={false}
        value={summaries[lang]}
        aria-label={t.area}
        className="h-[28rem] w-full resize-y rounded-xl border border-edge bg-panel px-4 py-3 font-mono text-xs leading-relaxed text-ink outline-none focus:border-neon/60"
      />

      <p className="mt-2 text-xs text-muted">{status === "error" ? t.error : t.hint}</p>
      {/* A screen reader will not necessarily re-announce the button's own label while focus sits on it. */}
      <span aria-live="polite" className="sr-only">
        {status === "idle" ? "" : copyLabel}
      </span>
    </section>
  );
}
