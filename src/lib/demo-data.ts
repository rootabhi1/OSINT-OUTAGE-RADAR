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

  // Tuple: [code, name, eventType, scope, description, severity, startHoursAgo, endHoursAgo]
  // startHoursAgo must be >= endHoursAgo; endHoursAgo = 0 means still ongoing.
  const demo: Array<[string, string, string, string, string, string, number, number]> = [
    ["IR", "Iran", "OUTAGE", "NATIONAL", "National connectivity drop coinciding with reported network restrictions.", "critical", 3, 0],
    ["PK", "Pakistan", "OUTAGE", "REGIONAL", "Regional disruption affecting mobile network operators.", "elevated", 90, 14],
    ["CU", "Cuba", "OUTAGE", "NATIONAL", "Nationwide connectivity loss following reported grid failure.", "critical", 26, 0],
    ["FR", "France", "TRAFFIC_ANOMALY", "NETWORK", "Traffic anomaly detected on a regional transit provider.", "minor", 55, 5],
    ["BR", "Brazil", "TRAFFIC_ANOMALY", "LOCATION", "Localized drop in HTTP request volume, cause unconfirmed.", "minor", 20, 8],
    ["MM", "Myanmar", "OUTAGE", "REGIONAL", "Intermittent regional outages reported over several days.", "elevated", 40, 6],
  ];

  return demo.map(([code, name, eventType, scope, description, severity, startH, endH], i) => {
    const c = CENTROIDS[code];
    return {
      id: `demo-${i}`,
      source: eventType === "TRAFFIC_ANOMALY" ? "anomaly" : "outage",
      eventType,
      description,
      startDate: hoursAgo(startH),
      endDate: endH === 0 ? null : hoursAgo(endH),
      scope,
      severity: severity as NormalizedOutage["severity"],
      locations: [{ code, name, latitude: c?.[0], longitude: c?.[1] }],
      asns: [],
      linkedUrl: null,
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
