import type { Severity } from "./types";

export function relativeTime(input: string) {
  const ts = Date.parse(input);
  if (Number.isNaN(ts)) return "unknown";
  const diff = Date.now() - ts;
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function formatDate(input: string) {
  const ts = Date.parse(input);
  if (Number.isNaN(ts)) return "—";
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const SEVERITY_STYLES: Record<Severity, { label: string; className: string; hex: string }> = {
  CRITICAL: { label: "Critical", className: "sev-critical", hex: "#f43f5e" },
  HIGH: { label: "High", className: "sev-high", hex: "#fb923c" },
  MEDIUM: { label: "Medium", className: "sev-medium", hex: "#facc15" },
  LOW: { label: "Low", className: "sev-low", hex: "#34d399" },
  NONE: { label: "Unscored", className: "sev-none", hex: "#64748b" },
};

export function countryName(code: string) {
  if (!code) return "Unknown";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function compact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(n);
}
