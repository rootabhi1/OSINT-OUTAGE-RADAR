import type { NormalizedOutage, OutagesResponse, ThreatEvent, ThreatsResponse } from "./types";
import centroids from "./country-centroids.json";

type Centroids = Record<string, [number, number, string]>;
const CENTROIDS = centroids as unknown as Centroids;

/**
 * Deterministic-ish sample data used in two places:
 *  1. The API route (src/app/api/outages/route.ts), when no
 *     CLOUDFLARE_API_TOKEN is set or the live request fails.
 *  2. The page component directly, as a client-side fallback when
 *     `/api/outages` doesn't exist at all — which is the case on a static
 *     export (e.g. GitHub Pages), where there is no server to run API
 *     routes on.
 * Keeping it here (rather than duplicated) means both paths always show the
 * same demo events.
 */
export function getDemoOutages(): NormalizedOutage[] {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

  // Tuple: [code, name, eventType, outageType, description/scope, severity, startHoursAgo, endHoursAgo, outageCause?, verificationStatus?]
  // startHoursAgo must be >= endHoursAgo; endHoursAgo = 0 means still ongoing.
  const demo: Array<
    [string, string, string, string, string, string, number, number, string | undefined, ("VERIFIED" | "UNVERIFIED" | undefined)]
  > = [
    ["IR", "Iran", "OUTAGE", "NATIONWIDE", "Nationwide", "critical", 3, 0, "GOVERNMENT_DIRECTED", undefined],
    ["PK", "Pakistan", "OUTAGE", "REGIONAL", "Multiple cities in Punjab", "elevated", 90, 14, "TECHNICAL_PROBLEMS", undefined],
    ["CU", "Cuba", "OUTAGE", "NATIONWIDE", "Nationwide", "critical", 26, 0, "POWER_OUTAGE", undefined],
    ["FR", "France", "TRAFFIC_ANOMALY", "NETWORK", "", "minor", 55, 5, undefined, "UNVERIFIED"],
    ["BR", "Brazil", "TRAFFIC_ANOMALY", "LOCATION", "", "minor", 20, 8, undefined, "VERIFIED"],
    ["MM", "Myanmar", "OUTAGE", "REGIONAL", "Yangon and Mandalay regions", "elevated", 40, 6, "GOVERNMENT_DIRECTED", undefined],
  ];

  return demo.map(([code, name, eventType, outageType, scope, severity, startH, endH, outageCause, verificationStatus], i) => {
    const c = CENTROIDS[code];
    const isAnomaly = eventType === "TRAFFIC_ANOMALY";
    const asns = isAnomaly ? [{ asn: 64500 + i, name: `SAMPLE-ISP-${i}` }] : [];
    const description = isAnomaly
      ? `${verificationStatus === "VERIFIED" ? "Verified" : "Unverified"} traffic anomaly affecting AS${asns[0].asn} (${asns[0].name}) in ${name}.`
      : scope || name;
    return {
      id: `demo-${i}`,
      source: isAnomaly ? "anomaly" : "outage",
      eventType,
      description,
      startDate: hoursAgo(startH),
      endDate: endH === 0 ? null : hoursAgo(endH),
      scope: scope || name,
      severity: severity as NormalizedOutage["severity"],
      locations: [{ code, name, latitude: c?.[0], longitude: c?.[1] }],
      asns,
      linkedUrl: null,
      outageCause,
      outageType: isAnomaly ? undefined : outageType,
      verificationStatus,
    };
  });
}

export function getDemoResponse(reason: string): OutagesResponse {
  const outages = getDemoOutages();
  return {
    outages,
    fetchedAt: new Date().toISOString(),
    ongoingCount: outages.filter((o) => !o.endDate).length,
    demo: true,
    error: reason,
  };
}

export function getDemoThreats(): ThreatEvent[] {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

  // Tuple: [kind, code, name, title, description, hoursAgo, extra]
  const demo: Array<{
    kind: ThreatEvent["kind"];
    code: string;
    name: string;
    title: string;
    description: string;
    hoursAgo: number;
    confidence?: number;
    shareValue?: string;
    asns?: { asn: number; name: string }[];
    sourceLabel?: string;
    destinationLabel?: string;
  }> = [
    {
      kind: "bgp_hijack",
      code: "RU",
      name: "Russia",
      title: "Possible hijack of AS20485 prefixes",
      description:
        "A network in Russia briefly announced IP address ranges normally originated elsewhere, which can reroute or intercept traffic.",
      hoursAgo: 2,
      confidence: 9,
      asns: [{ asn: 20485, name: "TRANSTELECOM" }],
      sourceLabel: "AS20485 (TRANSTELECOM), Russia",
      destinationLabel: "AS15169 (GOOGLE); AS16509 (AMAZON-02)",
    },
    {
      kind: "bgp_leak",
      code: "US",
      name: "United States",
      title: "Route leak involving AS398465",
      description:
        "A network unintentionally re-advertised routes it received from one provider to another, temporarily creating an inefficient or unstable path for that traffic.",
      hoursAgo: 9,
      asns: [{ asn: 398465, name: "PDR-SERVERS" }],
      sourceLabel: "AS398465 (PDR-SERVERS), United States",
    },
    {
      kind: "bgp_hijack",
      code: "BR",
      name: "Brazil",
      title: "Low-confidence origin change for a Brazilian prefix",
      description:
        "A small set of IP ranges briefly showed a different origin network than usual. Low-confidence signals like this are common and often resolve as configuration changes, not attacks.",
      hoursAgo: 15,
      confidence: 3,
      asns: [{ asn: 28573, name: "CLARO S.A" }],
      sourceLabel: "AS28573 (CLARO S.A), Brazil",
    },
    {
      kind: "attack_l3",
      code: "CN",
      name: "China",
      title: "Top network-layer (DDoS) attack origin today",
      description:
        "The largest share of network-layer attack traffic Cloudflare mitigated today originated from networks in this country.",
      hoursAgo: 1,
      shareValue: "18.4",
      sourceLabel: "China",
    },
    {
      kind: "attack_l7",
      code: "US",
      name: "United States",
      title: "Top web application attack origin today",
      description:
        "The largest share of HTTP-based attack traffic Cloudflare mitigated today originated from networks in this country.",
      hoursAgo: 1,
      shareValue: "14.1",
    },
    {
      kind: "attack_l3",
      code: "IN",
      name: "India",
      title: "Second-largest network-layer attack origin today",
      description:
        "A significant share of network-layer attack traffic Cloudflare mitigated today originated from networks in this country.",
      hoursAgo: 1,
      shareValue: "11.7",
    },
  ];

  return demo.map((d, i) => {
    const c = CENTROIDS[d.code];
    return {
      id: `demo-threat-${i}`,
      kind: d.kind,
      title: d.title,
      description: d.description,
      detectedAt: hoursAgo(d.hoursAgo),
      confidence: d.confidence,
      shareValue: d.shareValue,
      location: { code: d.code, name: d.name, latitude: c?.[0], longitude: c?.[1] },
      asns: d.asns ?? [],
      sourceLabel: d.sourceLabel,
      destinationLabel: d.destinationLabel,
    };
  });
}

export function getDemoThreatsResponse(reason: string): ThreatsResponse {
  return {
    threats: getDemoThreats(),
    fetchedAt: new Date().toISOString(),
    demo: true,
    error: reason,
  };
}
