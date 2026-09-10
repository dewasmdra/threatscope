/**
 * Calendar-month helpers. Dependency-free on purpose: `middleware.ts` runs on the Edge
 * runtime and imports `isValidMonth` from here, so nothing server-only may leak in.
 */

/** `YYYY-MM` → the UTC range covering that calendar month. */
export function monthRange(month: string) {
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon, 0, 23, 59, 59));
  return { year, mon, start, end };
}

export function isValidMonth(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return false;
  const { start } = monthRange(month);
  return start >= new Date("2000-01-01") && start <= new Date();
}

export function previousMonth(month: string) {
  const { year, mon } = monthRange(month);
  const d = new Date(Date.UTC(year, mon - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  const { start } = monthRange(month);
  return start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** The most recent month that has fully elapsed — the default report period. */
export function latestCompleteMonth() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function recentMonths(count = 12) {
  const months: string[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}
