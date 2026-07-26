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

