export type OutageSeverity = "critical" | "elevated" | "minor";

export interface OutageLocation {
  code: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface OutageAsn {
  asn: number;
  name: string;
}

export interface NormalizedOutage {
  id: string;
  source: "outage" | "anomaly";
  eventType: string;
  description: string;
  startDate: string;
  endDate: string | null;
  scope: string;
  severity: OutageSeverity;
  locations: OutageLocation[];
  asns: OutageAsn[];
  linkedUrl: string | null;
  /** Cloudflare's classified cause, e.g. "CABLE_CUT", "POWER_OUTAGE",
   * "GOVERNMENT_DIRECTED" — only present for confirmed outages, not
   * anomalies. This is the real "why," not a guess. */
  outageCause?: string;
  /** Cloudflare's classified extent, e.g. "NATIONWIDE", "REGIONAL". */
  outageType?: string;
  /** Anomalies only: whether Cloudflare's team has manually verified this
   * signal as a real event, or it's still algorithm-only. */
  verificationStatus?: "VERIFIED" | "UNVERIFIED";
}

export interface OutagesResponse {
  outages: NormalizedOutage[];
  fetchedAt: string;
  ongoingCount: number;
  demo?: boolean;
  error?: string;
}

// --- Threats: BGP hijacks/leaks + DDoS attack hotspots ---

export type ThreatKind = "bgp_hijack" | "bgp_leak" | "attack_l3" | "attack_l7";

export interface ThreatEvent {
  id: string;
  kind: ThreatKind;
  title: string;
  description: string;
  detectedAt: string;
  confidence?: number; // BGP hijacks only: 1-3 low, 4-7 mid, 8+ high
  shareValue?: string; // attack hotspots only: % of global attack traffic
  location: OutageLocation | null;
  asns: OutageAsn[];
  /** Explicit "who did this" — e.g. "AS20485 (TRANSTELECOM), Russia" for
   * hijacks/leaks. Populated for kinds where a clear source exists. */
  sourceLabel?: string;
  /** Explicit "who was affected" — e.g. "AS398465 (PDR-SERVERS), United
   * States". Populated for kinds where a clear destination/victim exists. */
  destinationLabel?: string;
}

export interface ThreatsResponse {
  threats: ThreatEvent[];
  fetchedAt: string;
  demo?: boolean;
  error?: string;
}

// --- URL Scanner (investigate a specific URL) ---

export interface ScanTechnology {
  name: string;
  category?: string;
}

export interface ScanResult {
  status: "pending" | "done" | "failed";
  uuid: string;
  submittedUrl: string;
  finalUrl?: string;
  verdictMalicious?: boolean;
  verdictCategories?: string[];
  screenshotUrl?: string;
  ip?: string;
  asn?: number;
  asnName?: string;
  country?: string;
  tlsIssuer?: string;
  technologies?: ScanTechnology[];
  redirectChain?: string[];
  reportUrl?: string;
  error?: string;
}

