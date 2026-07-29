import { NextResponse } from "next/server";
import type { NormalizedOutage, OutagesResponse, OutageLocation } from "@/lib/types";
import centroids from "@/lib/country-centroids.json";
import { getDemoResponse } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

const RADAR_BASE = "https://api.cloudflare.com/client/v4/radar";

type Centroids = Record<string, [number, number, string]>;
const CENTROIDS = centroids as unknown as Centroids;

function withCoords(code: string, name?: string): OutageLocation {
  const centroid = CENTROIDS[code];
  return {
    code,
    name: name ?? centroid?.[2] ?? code,
    latitude: centroid?.[0],
    longitude: centroid?.[1],
  };
}

// Cloudflare classifies confirmed outages by real cause — surfacing this
// verbatim (mapped to plain language) is the actual "detail analysis" a
// generic "traffic was abnormal" description can't provide.
function severityForOutageType(outageType?: string): "critical" | "elevated" | "minor" {
  const t = (outageType ?? "").toUpperCase();
  if (t.includes("NATIONWIDE") || t.includes("NATIONAL") || t.includes("COUNTRY")) return "critical";
  if (t.includes("REGIONAL") || t.includes("LOCAL")) return "elevated";
  return "elevated";
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
  const list = json?.result?.annotations ?? [];

  return list.map((item: any): NormalizedOutage => {
    // locationsDetails is the {code,name} array — `locations` (no
    // "Details") is just a bare array of ISO codes, and was the source of
    // every outage/anomaly showing "Unknown location": reading .code off a
    // plain string always returns undefined.
    const locationsDetails: Array<{ code: string; name: string }> =
      item.locationsDetails ?? [];
    const locations =
      locationsDetails.length > 0
        ? locationsDetails.map((l) => withCoords(l.code, l.name))
        : (item.locations ?? []).map((code: string) => withCoords(code));

    const asnsDetails: Array<{ asn: string | number; name: string }> = item.asnsDetails ?? [];
    const asns = asnsDetails.length
      ? asnsDetails.map((a) => ({ asn: Number(a.asn), name: a.name }))
      : (item.asns ?? []).map((asn: number) => ({ asn, name: `AS${asn}` }));

    const outageCause: string | undefined = item.outage?.outageCause;
    const outageType: string | undefined = item.outage?.outageType;

    return {
      id: String(item.id ?? `${item.startDate}-${item.eventType}`),
      source: "outage",
      eventType: item.eventType ?? "OUTAGE",
      description: item.description || item.scope || "No further detail provided by Cloudflare Radar.",
      startDate: item.startDate,
      endDate: item.endDate ?? null,
      scope: item.scope ?? "Unspecified area",
      severity: severityForOutageType(outageType),
      locations,
      asns,
      linkedUrl: item.linkedUrl ?? null,
      outageCause,
      outageType,
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
  const list = json?.result?.trafficAnomalies ?? [];

  return list.map((item: any): NormalizedOutage => {
    // locationDetails/asnDetails are singular objects here (not arrays,
    // unlike the outages endpoint above) — {code,name} and {asn,name}.
    const loc = item.locationDetails;
    const asn = item.asnDetails;
    const status: "VERIFIED" | "UNVERIFIED" = item.status === "VERIFIED" ? "VERIFIED" : "UNVERIFIED";

    const locations = loc ? [withCoords(loc.code, loc.name)] : [];
    const asns = asn ? [{ asn: Number(asn.asn), name: asn.name }] : [];

    const subject = asn?.name ? `AS${asn.asn} (${asn.name})` : loc?.name ?? "an unspecified network";
    const description = `${status === "VERIFIED" ? "Verified" : "Unverified"} traffic anomaly affecting ${subject}${
      loc?.name && asn?.name ? ` in ${loc.name}` : ""
    }.`;

    return {
      id: String(item.uuid ?? `${item.startDate}-anomaly`),
      source: "anomaly",
      eventType: item.type ?? "TRAFFIC_ANOMALY",
      description,
      startDate: item.startDate,
      endDate: item.endDate ?? null,
      scope: item.type === "AS" ? "One network" : item.type === "ORIGIN" ? "One origin/service" : "One location",
      severity: "minor",
      locations,
      asns,
      linkedUrl: null,
      verificationStatus: status,
    };
  });
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
