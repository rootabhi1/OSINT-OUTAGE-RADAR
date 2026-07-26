import { NextResponse } from "next/server";
import type { ThreatEvent, ThreatsResponse } from "@/lib/types";
import centroids from "@/lib/country-centroids.json";
import { getDemoThreatsResponse } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

const RADAR_BASE = "https://api.cloudflare.com/client/v4/radar";

type Centroids = Record<string, [number, number, string]>;
const CENTROIDS = centroids as unknown as Centroids;

function locationFor(code?: string | null) {
  if (!code) return null;
  const c = CENTROIDS[code];
  if (!c) return { code, name: code, latitude: undefined, longitude: undefined };
  return { code, name: c[2], latitude: c[0], longitude: c[1] };
}

async function radarGet(path: string, token: string) {
  const res = await fetch(`${RADAR_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Radar request failed (${path}): ${res.status}`);
  }
  return res.json();
}

async function fetchBgpHijacks(token: string): Promise<ThreatEvent[]> {
  const json = await radarGet(
    "/bgp/hijacks/events?per_page=15&minConfidence=4&sortBy=TIME&sortOrder=DESC&format=json",
    token
  );
  const asnInfo: Record<number, { org_name: string; country_code: string }> = {};
  for (const a of json?.result?.asn_info ?? []) asnInfo[a.asn] = a;

  const events = json?.result?.events ?? [];
  return events.map((e: any): ThreatEvent => {
    const hijackerInfo = asnInfo[e.hijacker_asn];
    return {
      id: `bgp-hijack-${e.id}`,
      kind: "bgp_hijack",
      title: `Possible hijack by AS${e.hijacker_asn}${hijackerInfo ? ` (${hijackerInfo.org_name})` : ""}`,
      description: `Affects ${e.victim_asns?.length ?? 0} network(s) and ${e.prefixes?.length ?? 0} address block(s). Confidence score ${e.confidence_score}/10+ based on ${e.tags?.length ?? 0} signal(s).`,
      detectedAt: e.min_hijack_ts ?? e.max_hijack_ts,
      confidence: e.confidence_score,
      location: locationFor(hijackerInfo?.country_code),
      asns: [
        { asn: e.hijacker_asn, name: hijackerInfo?.org_name ?? `AS${e.hijacker_asn}` },
        ...(e.victim_asns ?? []).map((asn: number) => ({
          asn,
          name: asnInfo[asn]?.org_name ?? `AS${asn}`,
        })),
      ],
    };
  });
}

async function fetchBgpLeaks(token: string): Promise<ThreatEvent[]> {
  const json = await radarGet("/bgp/leaks/events?per_page=15&format=json", token);
  const asnInfo: Record<number, { org_name: string; country_code: string }> = {};
  for (const a of json?.result?.asn_info ?? []) asnInfo[a.asn] = a;

  const events = json?.result?.events ?? [];
  return events.map((e: any): ThreatEvent => {
    const leakerInfo = asnInfo[e.leak_asn];
    return {
      id: `bgp-leak-${e.id}`,
      kind: "bgp_leak",
      title: `Route leak involving AS${e.leak_asn}${leakerInfo ? ` (${leakerInfo.org_name})` : ""}`,
      description: `${e.leak_count ?? 0} leaked announcement(s) affecting ${e.prefix_count ?? 0} address block(s), observed by ${e.peer_count ?? 0} route collector(s).`,
      detectedAt: e.min_ts ?? e.detected_ts,
      location: locationFor(leakerInfo?.country_code),
      asns: [{ asn: e.leak_asn, name: leakerInfo?.org_name ?? `AS${e.leak_asn}` }],
    };
  });
}

async function fetchAttackHotspots(
  token: string,
  layer: "layer3" | "layer7"
): Promise<ThreatEvent[]> {
  const json = await radarGet(`/attacks/${layer}/top/locations/origin?dateRange=1d&format=json`, token);
  const top = json?.result?.top_0 ?? [];
  const kind = layer === "layer3" ? "attack_l3" : "attack_l7";
  const label = layer === "layer3" ? "network-layer (DDoS)" : "web application";
  return top.slice(0, 5).map((t: any): ThreatEvent => ({
    id: `${kind}-${t.originCountryAlpha2}`,
    kind,
    title: `Rank #${t.rank} ${label} attack origin: ${t.originCountryName}`,
    description: `${t.value}% of all ${label} attack traffic Cloudflare mitigated in the last 24 hours originated from networks in this country.`,
    detectedAt: new Date().toISOString(),
    shareValue: t.value,
    location: locationFor(t.originCountryAlpha2),
    asns: [],
  }));
}

export async function GET() {
  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (!token) {
    return NextResponse.json<ThreatsResponse>(
      getDemoThreatsResponse(
        "CLOUDFLARE_API_TOKEN is not set. Showing sample data — see README to connect live data."
      )
    );
  }

  try {
    const [hijacks, leaks, l3, l7] = await Promise.all([
      fetchBgpHijacks(token).catch(() => []),
      fetchBgpLeaks(token).catch(() => []),
      fetchAttackHotspots(token, "layer3").catch(() => []),
      fetchAttackHotspots(token, "layer7").catch(() => []),
    ]);
    const combined = [...hijacks, ...leaks, ...l3, ...l7].sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
    return NextResponse.json<ThreatsResponse>({
      threats: combined,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json<ThreatsResponse>(
      getDemoThreatsResponse(
        err instanceof Error ? err.message : "Failed to reach Cloudflare Radar API."
      )
    );
  }
}
