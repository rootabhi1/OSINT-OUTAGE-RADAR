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
