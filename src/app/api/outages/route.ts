import { NextResponse } from "next/server";
import type { NormalizedOutage, OutagesResponse, OutageLocation } from "@/lib/types";
import centroids from "@/lib/country-centroids.json";
import { getDemoResponse } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

const RADAR_BASE = "https://api.cloudflare.com/client/v4/radar";

type Centroids = Record<string, [number, number, string]>;
const CENTROIDS = centroids as unknown as Centroids;

function locationsWithCoords(raw: unknown): OutageLocation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((loc: any) => {
      const code: string = loc?.code ?? loc?.location ?? "";
      const name: string = loc?.name ?? CENTROIDS[code]?.[2] ?? code;
      const centroid = CENTROIDS[code];
      return {
        code,
        name,
        latitude: centroid?.[0],
        longitude: centroid?.[1],
      };
    })
    .filter((l: OutageLocation) => l.code);
}

function severityFor(eventType: string, scope: string, ongoing: boolean): "critical" | "elevated" | "minor" {
  const t = `${eventType} ${scope}`.toLowerCase();
  if (t.includes("outage") && (t.includes("national") || t.includes("country"))) return "critical";
  if (t.includes("outage")) return ongoing ? "critical" : "elevated";
  return "minor";
}

async function fetchOutages(token: string): Promise<NormalizedOutage[]> {
  const res = await fetch(
    `${RADAR_BASE}/annotations/outages?limit=100&dateRange=14d&format=json`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Radar outages request failed: ${res.status}`);
  }
  const json = await res.json();
  const list = json?.result?.annotations ?? json?.result?.outages ?? [];
  return list.map((item: any): NormalizedOutage => {
    const ongoing = !item.endDate;
    return {
      id: String(item.id ?? item.uuid ?? `${item.startDate}-${item.eventType}`),
      source: "outage",
      eventType: item.eventType ?? item.outageType ?? "OUTAGE",
      description: item.description ?? "No further detail provided by Cloudflare Radar.",
      startDate: item.startDate,
      endDate: item.endDate ?? null,
      scope: item.scope ?? "UNKNOWN",
      severity: severityFor(item.eventType ?? "", item.scope ?? "", ongoing),
      locations: locationsWithCoords(item.locations),
      asns: Array.isArray(item.asns)
        ? item.asns.map((a: any) => ({ asn: a.asn, name: a.name ?? `AS${a.asn}` }))
        : [],
      linkedUrl: item.linkedUrl ?? item.linkedURL ?? null,
    };
  });
}

async function fetchAnomalies(token: string): Promise<NormalizedOutage[]> {
  const res = await fetch(
    `${RADAR_BASE}/traffic_anomalies?limit=50&dateRange=7d&format=json`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Radar anomalies request failed: ${res.status}`);
  }
  const json = await res.json();
  const list = json?.result?.trafficAnomalies ?? json?.result?.annotations ?? [];
  return list.map((item: any): NormalizedOutage => ({
    id: String(item.uuid ?? item.id ?? `${item.startDate}-anomaly`),
    source: "anomaly",
    eventType: item.type ?? "TRAFFIC_ANOMALY",
    description:
      item.description ??
      "Automatically detected traffic anomaly; may indicate an unconfirmed outage.",
    startDate: item.startDate,
    endDate: item.endDate ?? null,
    scope: item.asnDetails?.name ? "NETWORK" : item.locationDetails?.name ? "LOCATION" : "UNKNOWN",
    severity: "minor",
    locations: item.locationDetails
      ? locationsWithCoords([{ code: item.locationDetails.code, name: item.locationDetails.name }])
      : [],
    asns: item.asnDetails ? [{ asn: item.asnDetails.asn, name: item.asnDetails.name }] : [],
    linkedUrl: null,
  }));
}

export async function GET() {
  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (!token) {
    return NextResponse.json<OutagesResponse>(
      getDemoResponse("CLOUDFLARE_API_TOKEN is not set. Showing sample data — see README to connect live data.")
    );
  }

  try {
    const [outages, anomalies] = await Promise.all([
      fetchOutages(token),
      fetchAnomalies(token).catch(() => []),
    ]);
    const combined = [...outages, ...anomalies].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    return NextResponse.json<OutagesResponse>({
      outages: combined,
      fetchedAt: new Date().toISOString(),
      ongoingCount: combined.filter((o) => !o.endDate).length,
    });
  } catch (err) {
    return NextResponse.json<OutagesResponse>(
      getDemoResponse(err instanceof Error ? err.message : "Failed to reach Cloudflare Radar API.")
    );
  }
}
