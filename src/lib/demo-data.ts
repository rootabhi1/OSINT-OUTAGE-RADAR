import type { NormalizedOutage, OutagesResponse } from "./types";
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
