import { NextResponse } from "next/server";
import dns from "node:dns";
import type { FlightState, FlightsResponse } from "@/lib/types";

// Render (and several similar platforms) will attempt an IPv6 connection
// first by default, then fail with a bare "fetch failed" if that route
// isn't actually reachable from the platform's network — even when IPv4 to
// the same host works fine. Forcing IPv4-first here is the standard fix.
dns.setDefaultResultOrder("ipv4first");

export const dynamic = "force-dynamic";

const STATES_URL = "https://opensky-network.org/api/states/all";
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

// Free, keyless fallback (airplanes.live) used only if OpenSky is
// unreachable — real live ADS-B data, just queried as points+radius rather
// than one global call, since that's what this API actually offers.
// https://airplanes.live/api-guide/
const AIRPLANES_LIVE_BASE = "https://api.airplanes.live/v2";
const COVERAGE_HUBS: { name: string; lat: number; lon: number }[] = [
  { name: "New York", lat: 40.7, lon: -74.0 },
  { name: "London", lat: 51.5, lon: -0.1 },
  { name: "Frankfurt", lat: 50.0, lon: 8.5 },
  { name: "Dubai", lat: 25.2, lon: 55.3 },
  { name: "Singapore", lat: 1.35, lon: 103.8 },
  { name: "Tokyo", lat: 35.6, lon: 139.7 },
  { name: "Sydney", lat: -33.9, lon: 151.2 },
  { name: "Sao Paulo", lat: -23.5, lon: -46.6 },
  { name: "Johannesburg", lat: -26.2, lon: 28.0 },
  { name: "Moscow", lat: 55.7, lon: 37.6 },
  { name: "Delhi", lat: 28.6, lon: 77.2 },
  { name: "Los Angeles", lat: 34.0, lon: -118.2 },
  { name: "Chicago", lat: 41.8, lon: -87.6 },
  { name: "Beijing", lat: 39.9, lon: 116.4 },
  { name: "Toronto", lat: 43.6, lon: -79.4 },
];

// OpenSky's ADS-B "aircraft category" field — this is what lets us cover
// every kind of aircraft (not just airliners) rather than guessing.
// Reference: https://openskynetwork.github.io/opensky-api/rest.html
const CATEGORY_LABELS: Record<number, string> = {
  0: "Unknown",
  1: "Unknown",
  2: "Light aircraft",
  3: "Small aircraft",
  4: "Large aircraft",
  5: "High-vortex large (e.g. 757)",
  6: "Heavy aircraft",
  7: "High-performance / aerobatic",
  8: "Rotorcraft / helicopter",
  9: "Glider / sailplane",
  10: "Lighter-than-air (airship/balloon)",
  11: "Parachutist / skydiver",
  12: "Ultralight",
  13: "Reserved",
  14: "UAV / drone",
  15: "Space vehicle",
  16: "Emergency vehicle (surface)",
  17: "Service vehicle (surface)",
  18: "Point obstacle",
  19: "Cluster obstacle",
  20: "Line obstacle",
};

// airplanes.live/ADSBExchange use the raw DO-260B emitter category codes
// (A0-A7, B0-B7, C0-C7) instead of OpenSky's simplified 0-20 numbering —
// map them onto the same numeric scheme above so both sources render
// identically in the UI.
const ADSB_CATEGORY_TO_NUMERIC: Record<string, number> = {
  A1: 2, A2: 3, A3: 4, A4: 5, A5: 6, A6: 7, A7: 8,
  B1: 9, B2: 10, B3: 11, B4: 12, B6: 14, B7: 15,
  C1: 16, C2: 17, C3: 18, C4: 19, C5: 20,
};

// --- Server-side response cache, independent of how often clients poll us,
// so we don't burn through rate limits just because multiple browser tabs
// are open. ---
let cachedResponse: FlightsResponse | null = null;
let cachedAt = 0;
const CACHE_MS = 15_000;

// --- OAuth2 client-credentials token cache (optional — only used if
// OPENSKY_CLIENT_ID/SECRET are set). Anonymous access works without this,
// just with a smaller daily credit budget. ---
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getOpenSkyToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`OpenSky token request failed: ${res.status}`);
  const json = await res.json();
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 1800) * 1000,
  };
  return cachedToken.value;
}

function parseOpenSkyState(raw: any[]): FlightState | null {
  const [
    icao24,
    callsign,
    originCountry,
    , // time_position
    lastContact,
    longitude,
    latitude,
    baroAltitude,
    onGround,
    velocity,
    heading,
    verticalRate,
    , // sensors
    geoAltitude,
    squawk,
    , // spi
    , // position_source
    category,
  ] = raw;

  if (typeof latitude !== "number" || typeof longitude !== "number") return null;

  return {
    icao24,
    callsign: callsign ? String(callsign).trim() || null : null,
    originCountry,
    longitude,
    latitude,
    baroAltitude,
    onGround: !!onGround,
    velocity,
    heading,
    verticalRate,
    geoAltitude,
    squawk,
    category: category ?? 0,
    categoryLabel: CATEGORY_LABELS[category ?? 0] ?? "Unknown",
    lastContact,
  };
}

function parseAirplanesLiveAircraft(raw: any): FlightState | null {
  if (typeof raw.lat !== "number" || typeof raw.lon !== "number") return null;
  const onGround = raw.alt_baro === "ground";
  const numericCategory = raw.category ? ADSB_CATEGORY_TO_NUMERIC[raw.category] ?? 0 : 0;
  return {
    icao24: raw.hex,
    callsign: raw.flight ? String(raw.flight).trim() || null : null,
    originCountry: raw.ownOp || "Unknown",
    longitude: raw.lon,
    latitude: raw.lat,
    baroAltitude: onGround ? 0 : (raw.alt_baro ?? null),
    onGround,
    velocity: typeof raw.gs === "number" ? raw.gs / 1.944 : null, // knots -> m/s
    heading: raw.track ?? null,
    verticalRate: typeof raw.baro_rate === "number" ? raw.baro_rate / 196.85 : null, // ft/min -> m/s
    geoAltitude: raw.alt_geom ?? null,
    squawk: raw.squawk ?? null,
    category: numericCategory,
    categoryLabel: CATEGORY_LABELS[numericCategory] ?? "Unknown",
    lastContact: Math.floor(Date.now() / 1000) - Math.round(raw.seen ?? 0),
    aircraftTypeCode: raw.t || undefined,
    aircraftDescription: raw.desc || undefined,
    operator: raw.ownOp || undefined,
    registration: raw.r || undefined,
  };
}

async function fetchAirplanesLive(): Promise<FlightState[]> {
  const requests = [
    fetch(`${AIRPLANES_LIVE_BASE}/mil`, { cache: "no-store" }).catch(() => null),
    ...COVERAGE_HUBS.map((h) =>
      fetch(`${AIRPLANES_LIVE_BASE}/point/${h.lat}/${h.lon}/250`, { cache: "no-store" }).catch(
        () => null
      )
    ),
  ];
  const responses = await Promise.all(requests);
  const seen = new Map<string, FlightState>();
  for (const res of responses) {
    if (!res || !res.ok) continue;
    const json = await res.json().catch(() => null);
    for (const raw of json?.ac ?? []) {
      const parsed = parseAirplanesLiveAircraft(raw);
      if (parsed) seen.set(parsed.icao24, parsed);
    }
  }
  return Array.from(seen.values());
}

function demoFlights(reason: string): FlightsResponse {
  // A handful of illustrative, clearly-fake positions covering different
  // categories, roughly mid-flight over open ocean/land so nothing implies
  // a real aircraft's real position. Last-resort only — used when both
  // OpenSky and the airplanes.live fallback fail.
  const now = Math.floor(Date.now() / 1000);
  const demo: FlightState[] = [
    { icao24: "demo1", callsign: "DEMO101", originCountry: "United States", longitude: -40, latitude: 45, baroAltitude: 11000, onGround: false, velocity: 240, heading: 70, verticalRate: 0, geoAltitude: 11200, squawk: "2200", category: 6, categoryLabel: CATEGORY_LABELS[6], lastContact: now },
    { icao24: "demo2", callsign: "DEMO202", originCountry: "Germany", longitude: 10, latitude: 50, baroAltitude: 9800, onGround: false, velocity: 210, heading: 200, verticalRate: -2, geoAltitude: 9900, squawk: "1000", category: 4, categoryLabel: CATEGORY_LABELS[4], lastContact: now },
    { icao24: "demo3", callsign: null, originCountry: "Brazil", longitude: -60, latitude: -15, baroAltitude: 3500, onGround: false, velocity: 60, heading: 310, verticalRate: 1, geoAltitude: 3600, squawk: null, category: 8, categoryLabel: CATEGORY_LABELS[8], lastContact: now },
    { icao24: "demo4", callsign: "GLDR44", originCountry: "France", longitude: 2, latitude: 46, baroAltitude: 1800, onGround: false, velocity: 25, heading: 90, verticalRate: 0, geoAltitude: 1850, squawk: null, category: 9, categoryLabel: CATEGORY_LABELS[9], lastContact: now },
  ];
  return { flights: demo, fetchedAt: new Date().toISOString(), observedAt: now, demo: true, error: reason };
}

function openSkyErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as any).cause;
    const causeDetail = cause?.code || cause?.message;
    return causeDetail ? `${err.message} (${causeDetail})` : err.message;
  }
  return "Failed to reach OpenSky Network.";
}

export async function GET() {
  if (cachedResponse && Date.now() - cachedAt < CACHE_MS) {
    return NextResponse.json(cachedResponse);
  }

  let openSkyError: string | null = null;

  // 1. Try OpenSky first — best coverage when it's reachable.
  try {
    const token = await getOpenSkyToken().catch(() => null);
    const res = await fetch(STATES_URL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const flights: FlightState[] = (json.states ?? [])
        .map(parseOpenSkyState)
        .filter((f: FlightState | null): f is FlightState => f !== null);

      const response: FlightsResponse = {
        flights,
        fetchedAt: new Date().toISOString(),
        observedAt: json.time ?? null,
      };
      cachedResponse = response;
      cachedAt = Date.now();
      return NextResponse.json(response);
    }
    openSkyError =
      res.status === 429
        ? "OpenSky rate limit hit."
        : `OpenSky request failed: ${res.status}`;
  } catch (err) {
    openSkyError = openSkyErrorMessage(err);
  }

  // 2. OpenSky failed — fall back to airplanes.live (still real data, just
  // regional-hub coverage rather than truly global in one call).
  try {
    const flights = await fetchAirplanesLive();
    if (flights.length > 0) {
      const response: FlightsResponse = {
        flights,
        fetchedAt: new Date().toISOString(),
        observedAt: Math.floor(Date.now() / 1000),
        error: `OpenSky unreachable (${openSkyError}) — showing real data from airplanes.live instead, covering major aviation hub regions rather than the full globe.`,
      };
      cachedResponse = response;
      cachedAt = Date.now();
      return NextResponse.json(response);
    }
  } catch {
    // fall through to demo data below
  }

  // 3. Both real sources failed — clearly-labeled sample data as a last resort.
  const fallback = demoFlights(
    `Both OpenSky (${openSkyError}) and the airplanes.live fallback failed. Showing sample data.`
  );
  cachedResponse = fallback;
  cachedAt = Date.now();
  return NextResponse.json(fallback);
}
