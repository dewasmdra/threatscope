import { getCveWindow, getCveTotal, type CveWindow } from "@/lib/sources/nvd";
import { getKev, kevInMonth, topKevVendors } from "@/lib/sources/kev";
import {
  getVictimsByMonth,
  activeGroups,
  targetedSectors,
  targetedCountries,
} from "@/lib/sources/ransomware";
import type { KevItem, Victim } from "@/lib/types";
import { monthRange, previousMonth, monthLabel } from "@/lib/month";

export {
  monthRange,
  isValidMonth,
  previousMonth,
  monthLabel,
  latestCompleteMonth,
  recentMonths,
} from "@/lib/month";

export interface MonthlyReport {
  month: string;
  label: string;
  generatedAt: string;

  cve: CveWindow;
  cveOk: boolean;
  cvePrevTotal: number | null;

  kev: KevItem[];
  kevPrevCount: number;
  kevRansomware: number;
  kevVendors: { vendor: string; count: number }[];
  kevOk: boolean;
  kevCatalogVersion: string;

  victims: Victim[];
  victimsPrevCount: number;
  crews: { group: string; count: number }[];
  sectors: { sector: string; count: number }[];
  countries: { country: string; count: number }[];
  victimsOk: boolean;
}

/** Percentage change, or null when there is no baseline to compare against. */
export function delta(current: number, previous: number | null) {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export async function buildMonthlyReport(month: string): Promise<MonthlyReport> {
  const { year, mon, start, end } = monthRange(month);
  const prev = monthRange(previousMonth(month));

  // The month itself needs a full walk for severity/daily/CWE breakdowns; the
  // comparison month only needs headline totals, which cost one request each.
  const [cveRes, kevRes, victimRes, prevVictimRes] = await Promise.all([
    getCveWindow(start, end, 200),
    getKev(),
    getVictimsByMonth(year, mon),
    getVictimsByMonth(prev.year, prev.mon),
  ]);

  const cvePrevTotal = await getCveTotal(prev.start, prev.end);

  const kevThisMonth = kevInMonth(kevRes.data.items, month);
  const kevPrevMonth = kevInMonth(kevRes.data.items, previousMonth(month));
  const victims = victimRes.data;

  return {
    month,
    label: monthLabel(month),
    generatedAt: new Date().toISOString(),

    cve: cveRes.data,
    cveOk: cveRes.ok,
    cvePrevTotal,

    kev: kevThisMonth,
    kevPrevCount: kevPrevMonth.length,
    kevRansomware: kevThisMonth.filter((k) => k.ransomware).length,
    kevVendors: topKevVendors(kevThisMonth, 8),
    kevOk: kevRes.ok,
    kevCatalogVersion: kevRes.data.catalogVersion,

    victims,
    victimsPrevCount: prevVictimRes.data.length,
    crews: activeGroups(victims, 10),
    sectors: targetedSectors(victims, 8),
    countries: targetedCountries(victims, 8),
    victimsOk: victimRes.ok,
  };
}

/** Flattens the report into CSV rows — one metric per row, traceable to its source. */
export function reportToCsv(report: MonthlyReport) {
  const rows: (string | number)[][] = [
    ["section", "metric", "value", "source"],
    ["overview", "month", report.month, "-"],
    ["overview", "generated_at", report.generatedAt, "-"],
    ["cve", "total_published", report.cve.total, "NVD"],
    ["cve", "previous_month_total", report.cvePrevTotal ?? "n/a", "NVD"],
    ["cve", "window_complete", String(report.cve.complete), "NVD"],
  ];

  for (const [sev, count] of Object.entries(report.cve.severity)) {
    rows.push(["cve_severity", sev.toLowerCase(), count, "NVD"]);
  }
  for (const d of report.cve.daily) {
    rows.push(["cve_daily", d.date, d.count, "NVD"]);
  }
  for (const c of report.cve.cwes) {
    rows.push(["cve_cwe", c.cwe, c.count, "NVD"]);
  }

  rows.push(["kev", "added_this_month", report.kev.length, "CISA KEV"]);
  rows.push(["kev", "added_previous_month", report.kevPrevCount, "CISA KEV"]);
  rows.push(["kev", "ransomware_linked", report.kevRansomware, "CISA KEV"]);
  for (const v of report.kevVendors) {
    rows.push(["kev_vendor", v.vendor, v.count, "CISA KEV"]);
  }
  for (const k of report.kev) {
    rows.push(["kev_entry", k.cveID, `${k.vendorProject} ${k.product}`, "CISA KEV"]);
  }

  rows.push(["ransomware", "victims_this_month", report.victims.length, "ransomware.live"]);
  rows.push(["ransomware", "victims_previous_month", report.victimsPrevCount, "ransomware.live"]);
  for (const c of report.crews) {
    rows.push(["ransomware_crew", c.group, c.count, "ransomware.live"]);
  }
  for (const s of report.sectors) {
    rows.push(["ransomware_sector", s.sector, s.count, "ransomware.live"]);
  }
  for (const c of report.countries) {
    rows.push(["ransomware_country", c.country, c.count, "ransomware.live"]);
  }

  const escape = (cell: string | number) => {
    const text = String(cell);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map((r) => r.map(escape).join(",")).join("\n");
}
