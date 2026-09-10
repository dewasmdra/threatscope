/**
 * Renders a MonthlyReport as pasteable plain text.
 *
 * Sibling of `reportToCsv` in lib/report.ts — pure, synchronous, no React — but kept in its own
 * module because the bilingual dictionary is longer than that whole file. Deliberately NOT
 * re-exported through `@/lib/report`: this module imports the *value* `delta` from there, so a
 * re-export would close a real ESM cycle.
 *
 * Output targets Microsoft Word: ASCII hyphen bullets, no markdown, one line per bullet,
 * plain numbered headings, and CRLF endings applied once in `finish`.
 */
import { delta, type MonthlyReport } from "@/lib/report";
import { monthRange } from "@/lib/month";
import { countryName, SEVERITY_STYLES } from "@/lib/format";
import type { Severity } from "@/lib/types";

export const SUMMARY_LOCALES = ["id", "en"] as const;
export type SummaryLocale = (typeof SUMMARY_LOCALES)[number];

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"];
/** Beyond this the entry list stops being a summary and becomes the table it is summarising. */
const KEV_LIST_MAX = 10;
/** A metric has to move at least this much before it earns the headline sentence. */
const VERDICT_MIN_PCT = 5;

/**
 * Every string the summary can emit. One interface, one object per locale, so a key missing in
 * either language fails `tsc` — that type check is the main safety net for this feature.
 * Anything with interpolation is a function rather than a placeholder string, because Indonesian
 * word order genuinely differs from English.
 */
interface SummaryCopy {
  /** Intl locales for numbers, dates and region names. */
  numbers: string;
  dates: string;
  region: string;

  docTitle: (month: string) => string;
  preparedLine: (date: string) => string;
  sourcesLine: string;

  hCve: string;
  hCwe: string;
  hKev: string;
  hRansom: string;
  hMethod: string;

  deltaUp: (pct: string) => string;
  deltaDown: (pct: string) => string;
  deltaFlat: string;
  deltaNone: string;
  prevWith: (prev: string, change: string) => string;
  prevNone: string;

  narCve: (month: string, total: string, change: string, hi: string, hiPct: string) => string;
  narKev: (n: string, ransom: string) => string;
  narKevEmpty: string;
  narVictims: (n: string, change: string) => string;
  narAllDown: string;
  verdictCve: string;
  verdictKev: string;
  verdictVictims: string;
  verdict: (driver: string) => string;
  verdictNone: string;

  notePartial: (pages: string) => string;
  bTotalCve: (total: string, prev: string) => string;
  bSeverity: (label: string, n: string) => string;
  bHighCrit: (n: string, pct: string) => string;
  bBusiest: (date: string, n: string) => string;

  bCwe: (cwe: string, n: string) => string;
  bCweShare: (k: string, count: string, pct: string) => string;

  bKevAdded: (n: string, prev: string) => string;
  bKevRansom: (n: string) => string;
  bKevVendors: (items: string) => string;
  bKevListHeading: string;
  bKevEntry: (cve: string, vendorProduct: string, date: string, ransomware: boolean) => string;
  bKevMore: (n: string) => string;
  bKevCatalog: (version: string) => string;
  emptyKev: string;

  bVictims: (n: string, prev: string) => string;
  bCrewCount: (n: string) => string;
  bCrews: (items: string) => string;
  bSectors: (items: string) => string;
  bCountries: (items: string) => string;

  errCve: string;
  errKev: string;
  errVictims: string;

  methodCve: (month: string, pages: string) => string;
  methodCveUnavailable: (month: string) => string;
  methodKev: string;
  methodRansom: string;
  methodNews: string;

  unknown: string;
  sevLabel: Record<Severity, string>;
}

const COPY: Record<SummaryLocale, SummaryCopy> = {
  id: {
    numbers: "id-ID",
    dates: "id-ID",
    region: "id",

    docTitle: (month) => `Ringkasan Tren Keamanan Siber Bulanan - ${month}`,
    preparedLine: (date) => `Disusun ${date}.`,
    sourcesLine: "Sumber: NVD (NIST), katalog CISA KEV, dan ransomware.live.",

    hCve: "Volume dan Tingkat Keparahan Kerentanan",
    hCwe: "Kelas Kelemahan Terbanyak",
    hKev: "Eksploitasi Terkonfirmasi (CISA KEV)",
    hRansom: "Aktivitas Ransomware",
    hMethod: "Metode dan Catatan Keterbatasan",

    deltaUp: (pct) => `naik ${pct} dibanding bulan sebelumnya`,
    deltaDown: (pct) => `turun ${pct} dibanding bulan sebelumnya`,
    deltaFlat: "setara dengan bulan sebelumnya",
    deltaNone: "tanpa data pembanding bulan sebelumnya",
    prevWith: (prev, change) => `(bulan sebelumnya: ${prev}, ${change})`,
    prevNone: "(tanpa data pembanding bulan sebelumnya)",

    narCve: (month, total, change, hi, hiPct) =>
      `Pada ${month} terbit ${total} kerentanan baru, ${change}, dan ${hi} di antaranya (${hiPct}) berpredikat tinggi atau kritis.`,
    narKev: (n, ransom) =>
      `CISA mengonfirmasi eksploitasi aktif terhadap ${n} kerentanan sepanjang bulan ini, ${ransom} di antaranya terkait kampanye ransomware.`,
    narKevEmpty:
      "CISA tidak menambahkan entri baru ke katalog kerentanan yang diketahui dieksploitasi pada bulan ini.",
    narVictims: (n, change) =>
      `Situs kebocoran ransomware mencantumkan ${n} korban, ${change}.`,
    narAllDown:
      "Seluruh sumber data tidak dapat dihubungi saat ringkasan ini disusun, sehingga tidak ada angka yang dapat dilaporkan untuk bulan ini.",
    verdictCve: "kenaikan volume publikasi kerentanan",
    verdictKev: "perubahan jumlah kerentanan dengan eksploitasi terkonfirmasi",
    verdictVictims: "perubahan jumlah korban ransomware yang diklaim secara publik",
    verdict: (driver) =>
      `Pergerakan paling menonjol bulan ini adalah ${driver}.`,
    verdictNone:
      "Tidak ada metrik yang bergerak secara berarti dibanding bulan sebelumnya.",

    notePartial: (pages) =>
      `- Catatan: NVD hanya mengembalikan sebagian data bulan ini (${pages} halaman berhasil diunduh). Total utama adalah hitungan resmi NVD dan tetap akurat, tetapi rincian di bawah dihitung dari data yang sempat diunduh.`,
    bTotalCve: (total, prev) => `- Total CVE yang terbit: ${total} ${prev}.`,
    bSeverity: (label, n) => `- ${label}: ${n}`,
    bHighCrit: (n, pct) => `- Gabungan tinggi dan kritis: ${n}, atau ${pct} dari total bulan ini.`,
    bBusiest: (date, n) => `- Hari pengungkapan tersibuk: ${date}, dengan ${n} CVE.`,

    bCwe: (cwe, n) => `- ${cwe}: ${n} CVE`,
    bCweShare: (k, count, pct) =>
      `- ${k} kelas teratas ini mencakup ${count} CVE, atau ${pct} dari total bulan ini.`,

    bKevAdded: (n, prev) => `- Entri yang ditambahkan bulan ini: ${n} ${prev}.`,
    bKevRansom: (n) => `- Terkait kampanye ransomware: ${n}.`,
    bKevVendors: (items) => `- Vendor paling terdampak: ${items}.`,
    bKevListHeading: "- Daftar entri bulan ini:",
    bKevEntry: (cve, vendorProduct, date, ransomware) =>
      `- ${cve} - ${vendorProduct} - ditambahkan ${date}${ransomware ? " (ransomware)" : ""}.`,
    bKevMore: (n) => `- dan ${n} entri lainnya; daftar lengkapnya ada di tabel KEV pada halaman laporan.`,
    bKevCatalog: (version) => `- Versi katalog KEV: ${version}.`,
    emptyKev: "- Tidak ada entri baru yang ditambahkan ke katalog KEV pada bulan ini.",

    bVictims: (n, prev) => `- Korban yang dicantumkan di situs kebocoran: ${n} ${prev}.`,
    bCrewCount: (n) => `- Jumlah kelompok berbeda yang teramati: ${n}.`,
    bCrews: (items) => `- Kelompok paling aktif: ${items}.`,
    bSectors: (items) => `- Sektor paling disasar: ${items}.`,
    bCountries: (items) => `- Negara paling disasar: ${items}.`,

    errCve:
      "- NVD tidak dapat dihubungi saat ringkasan ini disusun, sehingga angka kerentanan tidak tersedia untuk bulan ini.",
    errKev:
      "- Katalog CISA KEV tidak dapat dihubungi saat ringkasan ini disusun, sehingga angka eksploitasi terkonfirmasi tidak tersedia.",
    errVictims:
      "- ransomware.live tidak dapat dihubungi saat ringkasan ini disusun, sehingga angka korban ransomware tidak tersedia.",

    methodCve: (month, pages) =>
      `- Angka CVE berasal dari API NVD dan menghitung advisori dengan tanggal terbit di dalam ${month} (UTC). Total utama adalah hitungan resmi NVD; rincian tingkat keparahan, harian, dan kelas kelemahan dihitung dari ${pages} halaman yang berhasil diunduh.`,
    methodCveUnavailable: (month) =>
      `- Angka CVE seharusnya berasal dari API NVD untuk advisori yang terbit di dalam ${month} (UTC), tetapi NVD tidak dapat dihubungi saat ringkasan ini disusun sehingga bagian tersebut kosong.`,
    methodKev:
      "- Angka KEV menghitung entri yang tanggal penambahannya jatuh pada bulan ini, yaitu tanggal CISA mengonfirmasi eksploitasi, bukan tanggal CVE diterbitkan.",
    methodRansom:
      "- Angka ransomware adalah klaim situs kebocoran yang dibuat oleh kelompok penyerang sendiri, dikumpulkan oleh ransomware.live. Angka tersebut merupakan klaim pelaku kriminal yang belum terverifikasi, bukan pelanggaran yang terkonfirmasi, dan cenderung lebih rendah dari kenyataan karena korban yang membayar sebelum dipublikasikan tidak tercatat.",
    methodNews:
      "- Liputan berita keamanan sengaja tidak disertakan: umpan RSS yang dipakai di bagian lain aplikasi ini tidak menyimpan arsip, sehingga bulan-bulan lampau tidak dapat direkonstruksi darinya.",

    unknown: "Tidak diketahui",
    sevLabel: {
      CRITICAL: "Kritis",
      HIGH: "Tinggi",
      MEDIUM: "Sedang",
      LOW: "Rendah",
      NONE: "Tanpa skor",
    },
  },

  en: {
    numbers: "en-US",
    dates: "en-GB",
    region: "en",

    docTitle: (month) => `Monthly Cybersecurity Trend Summary - ${month}`,
    preparedLine: (date) => `Prepared ${date}.`,
    sourcesLine: "Sources: NVD (NIST), the CISA KEV catalog, and ransomware.live.",

    hCve: "Vulnerability Volume and Severity",
    hCwe: "Leading Weakness Classes",
    hKev: "Confirmed Exploitation (CISA KEV)",
    hRansom: "Ransomware Activity",
    hMethod: "Method and Caveats",

    deltaUp: (pct) => `up ${pct} month over month`,
    deltaDown: (pct) => `down ${pct} month over month`,
    deltaFlat: "flat against the previous month",
    deltaNone: "with no baseline for the previous month",
    prevWith: (prev, change) => `(previous month: ${prev}, ${change})`,
    prevNone: "(no baseline for the previous month)",

    narCve: (month, total, change, hi, hiPct) =>
      `In ${month}, ${total} new vulnerabilities were published, ${change}, and ${hi} of them (${hiPct}) carried a high or critical rating.`,
    narKev: (n, ransom) =>
      `CISA confirmed active exploitation of ${n} vulnerabilities during the month, ${ransom} of them tied to ransomware campaigns.`,
    narKevEmpty:
      "CISA added no new entries to its known exploited vulnerabilities catalog this month.",
    narVictims: (n, change) => `Ransomware leak sites named ${n} victims, ${change}.`,
    narAllDown:
      "Every data source was unreachable when this summary was prepared, so no figures can be reported for this month.",
    verdictCve: "the change in vulnerability disclosure volume",
    verdictKev: "the change in vulnerabilities with confirmed exploitation",
    verdictVictims: "the change in publicly claimed ransomware victims",
    verdict: (driver) => `The defining movement this month is ${driver}.`,
    verdictNone: "No metric moved materially against the previous month.",

    notePartial: (pages) =>
      `- Note: NVD returned only part of this month (${pages} pages retrieved). The headline total is NVD's own count and remains accurate, but the breakdowns below are computed from what was retrieved.`,
    bTotalCve: (total, prev) => `- Total CVEs published: ${total} ${prev}.`,
    bSeverity: (label, n) => `- ${label}: ${n}`,
    bHighCrit: (n, pct) => `- High or critical combined: ${n}, or ${pct} of the month.`,
    bBusiest: (date, n) => `- Busiest disclosure day: ${date}, with ${n} CVEs.`,

    bCwe: (cwe, n) => `- ${cwe}: ${n} CVEs`,
    bCweShare: (k, count, pct) =>
      `- These ${k} classes account for ${count} CVEs, or ${pct} of the month.`,

    bKevAdded: (n, prev) => `- Entries added this month: ${n} ${prev}.`,
    bKevRansom: (n) => `- Linked to ransomware campaigns: ${n}.`,
    bKevVendors: (items) => `- Most affected vendors: ${items}.`,
    bKevListHeading: "- Entries added this month:",
    bKevEntry: (cve, vendorProduct, date, ransomware) =>
      `- ${cve} - ${vendorProduct} - added ${date}${ransomware ? " (ransomware)" : ""}.`,
    bKevMore: (n) => `- and ${n} more entries; the full list is in the KEV table on the report page.`,
    bKevCatalog: (version) => `- KEV catalog version: ${version}.`,
    emptyKev: "- No new entries were added to the KEV catalog this month.",

    bVictims: (n, prev) => `- Victims named on leak sites: ${n} ${prev}.`,
    bCrewCount: (n) => `- Distinct groups observed: ${n}.`,
    bCrews: (items) => `- Most active groups: ${items}.`,
    bSectors: (items) => `- Most targeted sectors: ${items}.`,
    bCountries: (items) => `- Most targeted countries: ${items}.`,

    errCve:
      "- NVD was unreachable when this summary was prepared, so vulnerability figures are unavailable for this month.",
    errKev:
      "- The CISA KEV catalog was unreachable when this summary was prepared, so confirmed-exploitation figures are unavailable.",
    errVictims:
      "- ransomware.live was unreachable when this summary was prepared, so ransomware victim figures are unavailable.",

    methodCve: (month, pages) =>
      `- CVE figures come from the NVD API and count advisories published within ${month} (UTC). The headline total is NVD's own result count; the severity, daily and weakness breakdowns are computed from ${pages} downloaded pages.`,
    methodCveUnavailable: (month) =>
      `- CVE figures would come from the NVD API for advisories published within ${month} (UTC), but NVD was unreachable when this summary was prepared, so that section is empty.`,
    methodKev:
      "- KEV figures count entries whose date added falls inside this month, which is the date CISA confirmed exploitation, not the date the CVE was published.",
    methodRansom:
      "- Ransomware figures are leak-site claims made by the groups themselves, as collected by ransomware.live. They are unverified assertions by criminal groups rather than confirmed breaches, and they undercount victims who paid before publication.",
    methodNews:
      "- Security news coverage is deliberately excluded: the RSS feeds used elsewhere in this application carry no archive, so past months cannot be reconstructed from them.",

    unknown: "Unknown",
    sevLabel: {
      CRITICAL: SEVERITY_STYLES.CRITICAL.label,
      HIGH: SEVERITY_STYLES.HIGH.label,
      MEDIUM: SEVERITY_STYLES.MEDIUM.label,
      LOW: SEVERITY_STYLES.LOW.label,
      NONE: SEVERITY_STYLES.NONE.label,
    },
  },
};

/**
 * Intl can emit non-breaking and narrow-no-break spaces as group separators. Pasted into Word
 * they suppress line breaking and look wrong, so flatten them to ordinary spaces. Stray CR is
 * dropped here too; line endings are applied once, at the end of `finish`.
 */
const sanitize = (s: string) => s.replace(/[  ]/g, " ").replace(/\r/g, "");

/** Full precision, not `compact()` — a document needs "4,312", not "4.3K". */
const nf = (n: number, c: SummaryCopy) => sanitize(n.toLocaleString(c.numbers));

const pctOf = (part: number, whole: number) =>
  whole <= 0 ? "0%" : `${Math.round((part / whole) * 100)}%`;

/** Locale-aware and UTC-pinned; `formatDate` in lib/format.ts is en-GB only and unpinned. */
function dateIn(iso: string, c: SummaryCopy) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return c.unknown;
  return sanitize(
    d.toLocaleDateString(c.dates, {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  );
}

/** "Agustus 2026" / "August 2026". `monthLabel` in lib/month.ts is en-GB only. */
function monthLabelIn(month: string, c: SummaryCopy) {
  const { start } = monthRange(month);
  return sanitize(
    start.toLocaleDateString(c.dates, { month: "long", year: "numeric", timeZone: "UTC" }),
  );
}

/** Reuses `delta`, then states the direction in words — never with the ▲/▼ glyphs the badge uses. */
function changePhrase(current: number, previous: number | null, c: SummaryCopy) {
  const d = delta(current, previous);
  if (d === null) return c.deltaNone;
  const rounded = Math.round(d);
  if (rounded === 0) return c.deltaFlat;
  return rounded > 0 ? c.deltaUp(`${rounded}%`) : c.deltaDown(`${Math.abs(rounded)}%`);
}

/** The "(previous month: 3,905, up 10% …)" parenthetical, or its no-baseline form. */
function prevPart(current: number, previous: number | null, c: SummaryCopy) {
  if (previous === null) return c.prevNone;
  return c.prevWith(nf(previous, c), changePhrase(current, previous, c));
}

const joinCounts = (items: { label: string; count: number }[], c: SummaryCopy, max = 3) =>
  items
    .slice(0, max)
    .map((i) => `${i.label.trim()} (${nf(i.count, c)})`)
    .join(", ");

interface Section {
  heading: string;
  lines: string[];
}

function buildSummary(report: MonthlyReport, c: SummaryCopy): string {
  const monthName = monthLabelIn(report.month, c);
  const highOrWorse = report.cve.severity.CRITICAL + report.cve.severity.HIGH;
  const crewCount = new Set(report.victims.map((v) => v.group)).size;

  // --- headline narrative -------------------------------------------------
  const narrative: string[] = [];
  if (report.cveOk) {
    narrative.push(
      c.narCve(
        monthName,
        nf(report.cve.total, c),
        changePhrase(report.cve.total, report.cvePrevTotal, c),
        nf(highOrWorse, c),
        pctOf(highOrWorse, report.cve.total),
      ),
    );
  }
  if (report.kevOk) {
    narrative.push(
      report.kev.length === 0
        ? c.narKevEmpty
        : c.narKev(nf(report.kev.length, c), nf(report.kevRansomware, c)),
    );
  }
  if (report.victimsOk) {
    narrative.push(
      c.narVictims(
        nf(report.victims.length, c),
        changePhrase(report.victims.length, report.victimsPrevCount, c),
      ),
    );
  }

  // Pick the headline movement deterministically: the largest material swing among the sources
  // that actually answered. A source that failed cannot be the story of the month.
  const candidates = [
    { driver: c.verdictCve, d: delta(report.cve.total, report.cvePrevTotal), ok: report.cveOk },
    { driver: c.verdictKev, d: delta(report.kev.length, report.kevPrevCount), ok: report.kevOk },
    {
      driver: c.verdictVictims,
      d: delta(report.victims.length, report.victimsPrevCount),
      ok: report.victimsOk,
    },
  ]
    .filter((x) => x.ok && x.d !== null && Math.abs(x.d) >= VERDICT_MIN_PCT)
    .sort((a, b) => Math.abs(b.d as number) - Math.abs(a.d as number));

  if (narrative.length === 0) {
    narrative.push(c.narAllDown);
  } else {
    narrative.push(candidates.length > 0 ? c.verdict(candidates[0].driver) : c.verdictNone);
  }

  // --- sections -----------------------------------------------------------
  const sections: Section[] = [];

  const cveLines: string[] = [];
  if (!report.cveOk) {
    cveLines.push(c.errCve);
  } else {
    if (!report.cve.complete) cveLines.push(c.notePartial(nf(report.cve.pages, c)));
    cveLines.push(
      c.bTotalCve(nf(report.cve.total, c), prevPart(report.cve.total, report.cvePrevTotal, c)),
    );
    for (const sev of SEVERITY_ORDER) {
      cveLines.push(c.bSeverity(c.sevLabel[sev], nf(report.cve.severity[sev], c)));
    }
    cveLines.push(c.bHighCrit(nf(highOrWorse, c), pctOf(highOrWorse, report.cve.total)));

    const busiest = [...report.cve.daily].sort((a, b) => b.count - a.count)[0];
    if (busiest && busiest.count > 0) {
      cveLines.push(c.bBusiest(dateIn(busiest.date, c), nf(busiest.count, c)));
    }
  }
  sections.push({ heading: c.hCve, lines: cveLines });

  if (report.cveOk && report.cve.cwes.length > 0) {
    const top = report.cve.cwes.slice(0, 5);
    const lines = top.map((w) => c.bCwe(w.cwe, nf(w.count, c)));
    const sum = top.reduce((acc, w) => acc + w.count, 0);
    lines.push(c.bCweShare(nf(top.length, c), nf(sum, c), pctOf(sum, report.cve.total)));
    sections.push({ heading: c.hCwe, lines });
  }

  const kevLines: string[] = [];
  if (!report.kevOk) {
    kevLines.push(c.errKev);
  } else {
    kevLines.push(
      c.bKevAdded(nf(report.kev.length, c), prevPart(report.kev.length, report.kevPrevCount, c)),
    );
    if (report.kev.length === 0) {
      kevLines.push(c.emptyKev);
    } else {
      kevLines.push(c.bKevRansom(nf(report.kevRansomware, c)));
      if (report.kevVendors.length > 0) {
        kevLines.push(
          c.bKevVendors(
            joinCounts(
              report.kevVendors.map((v) => ({ label: v.vendor, count: v.count })),
              c,
            ),
          ),
        );
      }
      kevLines.push(c.bKevListHeading);
      const ordered = [...report.kev].sort((a, b) => a.dateAdded.localeCompare(b.dateAdded));
      for (const k of ordered.slice(0, KEV_LIST_MAX)) {
        kevLines.push(
          c.bKevEntry(
            k.cveID,
            `${k.vendorProject.trim()}, ${k.product.trim()}`,
            dateIn(k.dateAdded, c),
            k.ransomware,
          ),
        );
      }
      if (ordered.length > KEV_LIST_MAX) {
        kevLines.push(c.bKevMore(nf(ordered.length - KEV_LIST_MAX, c)));
      }
    }
    if (report.kevCatalogVersion) kevLines.push(c.bKevCatalog(report.kevCatalogVersion));
  }
  sections.push({ heading: c.hKev, lines: kevLines });

  const ransomLines: string[] = [];
  if (!report.victimsOk) {
    ransomLines.push(c.errVictims);
  } else {
    ransomLines.push(
      c.bVictims(
        nf(report.victims.length, c),
        prevPart(report.victims.length, report.victimsPrevCount, c),
      ),
    );
    ransomLines.push(c.bCrewCount(nf(crewCount, c)));
    if (report.crews.length > 0) {
      ransomLines.push(
        c.bCrews(joinCounts(report.crews.map((x) => ({ label: x.group, count: x.count })), c)),
      );
    }
    if (report.sectors.length > 0) {
      ransomLines.push(
        c.bSectors(joinCounts(report.sectors.map((x) => ({ label: x.sector, count: x.count })), c)),
      );
    }
    if (report.countries.length > 0) {
      ransomLines.push(
        c.bCountries(
          joinCounts(
            report.countries.map((x) => ({
              label: x.country ? countryName(x.country, c.region) : c.unknown,
              count: x.count,
            })),
            c,
          ),
        ),
      );
    }
  }
  sections.push({ heading: c.hRansom, lines: ransomLines });

  sections.push({
    heading: c.hMethod,
    lines: [
      report.cveOk
        ? c.methodCve(monthName, nf(report.cve.pages, c))
        : c.methodCveUnavailable(monthName),
      c.methodKev,
      c.methodRansom,
      c.methodNews,
    ],
  });

  // --- assemble -----------------------------------------------------------
  // Sections are numbered here rather than in the copy, so a skipped section (an empty CWE month)
  // never leaves a gap in the sequence.
  const out: string[] = [
    c.docTitle(monthName),
    "",
    c.preparedLine(dateIn(report.generatedAt, c)),
    c.sourcesLine,
    "",
    narrative.join(" "),
  ];

  sections.forEach((section, i) => {
    out.push("", `${i + 1}. ${section.heading}`, "", ...section.lines);
  });

  return finish(out);
}

/**
 * Word turns every newline into a paragraph mark, so collapse runs of blank lines and emit CRLF
 * once at the end — correct for Word, Notepad and Outlook, and normalised back to \n by the
 * textarea that displays it.
 */
const finish = (lines: string[]) =>
  sanitize(lines.join("\n")).replace(/\n{3,}/g, "\n\n").trim().replace(/\n/g, "\r\n");

/** Renders the report as pasteable plain text in one language. */
export function reportToText(report: MonthlyReport, locale: SummaryLocale): string {
  return buildSummary(report, COPY[locale]);
}

/** Both languages at once — what the server component hands to the client. */
export function reportToTextAll(report: MonthlyReport): Record<SummaryLocale, string> {
  return {
    id: reportToText(report, "id"),
    en: reportToText(report, "en"),
  };
}
