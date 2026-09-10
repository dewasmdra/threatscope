export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface CveItem {
  id: string;
  published: string;
  lastModified: string;
  description: string;
  severity: Severity;
  score: number | null;
  vector: string | null;
  cwe: string | null;
  source: string;
  url: string;
}

export interface KevItem {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  dueDate: string;
  ransomware: boolean;
}

export interface KevCatalog {
  catalogVersion: string;
  dateReleased: string;
  count: number;
  items: KevItem[];
}

export interface Victim {
  victim: string;
  group: string;
  country: string;
  activity: string;
  domain: string;
  discovered: string;
  attackdate: string;
  description: string;
  claimUrl: string;
}

export interface ThreatGroup {
  name: string;
  description: string;
  addedDate: string;
  altname: string | null;
  onionCount: number;
  victimCount: number;
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  summary: string;
}

export interface FetchResult<T> {
  data: T;
  ok: boolean;
  error?: string;
  fetchedAt: string;
}
