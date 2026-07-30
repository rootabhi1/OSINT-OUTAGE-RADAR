import { NextResponse } from "next/server";
import type { FlightState, FlightsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATES_URL = "https://opensky-network.org/api/states/all";
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

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

// --- Server-side response cache, independent of how often clients poll us,
// so we don't burn through OpenSky's per-day credit budget just because
// multiple browser tabs are open. ---
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

function parseState(raw: any[]): FlightState | null {
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

function demoFlights(reason: string): FlightsResponse {
  // A handful of illustrative, clearly-fake positions covering different
  // categories, roughly mid-flight over open ocean/land so nothing implies
  // a real aircraft's real position.
  const now = Math.floor(Date.now() / 1000);
  const demo: FlightState[] = [
    { icao24: "demo1", callsign: "DEMO101", originCountry: "United States", longitude: -40, latitude: 45, baroAltitude: 11000, onGround: false, velocity: 240, heading: 70, verticalRate: 0, geoAltitude: 11200, squawk: "2200", category: 6, categoryLabel: CATEGORY_LABELS[6], lastContact: now },
    { icao24: "demo2", callsign: "DEMO202", originCountry: "Germany", longitude: 10, latitude: 50, baroAltitude: 9800, onGround: false, velocity: 210, heading: 200, verticalRate: -2, geoAltitude: 9900, squawk: "1000", category: 4, categoryLabel: CATEGORY_LABELS[4], lastContact: now },
    { icao24: "demo3", callsign: null, originCountry: "Brazil", longitude: -60, latitude: -15, baroAltitude: 3500, onGround: false, velocity: 60, heading: 310, verticalRate: 1, geoAltitude: 3600, squawk: null, category: 8, categoryLabel: CATEGORY_LABELS[8], lastContact: now },
    { icao24: "demo4", callsign: "GLDR44", originCountry: "France", longitude: 2, latitude: 46, baroAltitude: 1800, onGround: false, velocity: 25, heading: 90, verticalRate: 0, geoAltitude: 1850, squawk: null, category: 9, categoryLabel: CATEGORY_LABELS[9], lastContact: now },
  ];
  return { flights: demo, fetchedAt: new Date().toISOString(), observedAt: now, demo: true, error: reason };
}

export async function GET() {
  if (cachedResponse && Date.now() - cachedAt < CACHE_MS) {
    return NextResponse.json(cachedResponse);
  }

  try {
    const token = await getOpenSkyToken().catch(() => null);
    const res = await fetch(STATES_URL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });

    if (res.status === 429) {
      const fallback = demoFlights(
        "OpenSky's rate limit was hit. Showing sample aircraft until it resets — this happens more on anonymous access; add OPENSKY_CLIENT_ID/SECRET for a bigger daily budget."
      );
      cachedResponse = fallback;
      cachedAt = Date.now();
      return NextResponse.json(fallback);
    }
    if (!res.ok) {
      throw new Error(`OpenSky request failed: ${res.status}`);
    }

    const json = await res.json();
    const flights: FlightState[] = (json.states ?? [])
      .map(parseState)
      .filter((f: FlightState | null): f is FlightState => f !== null);

    const response: FlightsResponse = {
      flights,
      fetchedAt: new Date().toISOString(),
      observedAt: json.time ?? null,
    };
    cachedResponse = response;
    cachedAt = Date.now();
    return NextResponse.json(response);
  } catch (err) {
    const fallback = demoFlights(
      err instanceof Error ? err.message : "Failed to reach OpenSky Network."
    );
    cachedResponse = fallback;
    cachedAt = Date.now();
    return NextResponse.json(fallback);
  }
}
