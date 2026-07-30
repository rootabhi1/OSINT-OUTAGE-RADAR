import { NextRequest, NextResponse } from "next/server";
import type { GeocodeResult } from "@/lib/types";

export const dynamic = "force-dynamic";

// OpenStreetMap Nominatim: free geocoding, no API key, but their usage
// policy (operations.osmfoundation.org/policies/nominatim/) requires a
// descriptive User-Agent and no heavy client-side/CORS use — so this is
// proxied through our own server rather than called directly from the
// browser, and kept to a single lightweight request per search.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=jsonv2&limit=5&addressdetails=0`;
    const res = await fetch(url, {
      headers: {
        // Required by Nominatim's usage policy — identifies the app, not a
        // generic browser UA, and includes a contact-free project reference.
        "User-Agent": "signal-loss-outage-radar/1.0 (+https://github.com/rootabhi1/OSINT-OUTAGE-RADAR)",
        "Accept-Language": "en",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ results: [], error: `Geocoding service returned ${res.status}` });
    }

    const json = await res.json();
    const results: GeocodeResult[] = (Array.isArray(json) ? json : []).map((r: any) => ({
      name: r.name || r.display_name?.split(",")[0] || q,
      displayName: r.display_name ?? q,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      type: r.type ?? r.class ?? "place",
    }));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { results: [], error: err instanceof Error ? err.message : "Geocoding request failed." },
      { status: 502 }
    );
  }
}
