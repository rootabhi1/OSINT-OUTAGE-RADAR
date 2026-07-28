"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import centroids from "@/lib/country-centroids.json";
import { Search, X, Satellite, Moon, MapPin, ExternalLink, Loader2 } from "lucide-react";
import type { GeocodeResult } from "@/app/api/geocode/route";

type Centroids = Record<string, [number, number, string]>;
const CENTROIDS = centroids as unknown as Centroids;
const COUNTRY_ENTRIES = Object.entries(CENTROIDS).map(([code, [lat, lng, name]]) => ({
  code,
  name,
  lat,
  lng,
}));

// CARTO's actual vector basemap (not raster tiles) — crisper at all zoom
// levels and what OSIRIS itself uses as its base style.
const DARK_STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const SATELLITE_TILES = [
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
];

const SKY_CONFIG = {
  "sky-color": "#04040A",
  "sky-horizon-blend": 0.5,
  "horizon-color": "#0a0a1a",
  "horizon-fog-blend": 0.3,
  "fog-color": "#04040A",
  "fog-ground-blend": 0.9,
};

// Matches "lat,lng" or "lat, lng" with optional decimals/negatives, e.g.
// "40.7128,-74.0060" or "-33.87, 151.21" — lets someone paste raw
// coordinates instead of only searching by name.
const COORD_PATTERN = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

export interface GlobeMarker {
  id: string;
  latitude: number;
  longitude: number;
  color: string;
  pulsing?: boolean;
  selected?: boolean;
}

function createMarkerElement(m: GlobeMarker): HTMLDivElement {
  const el = document.createElement("div");
  const size = m.selected ? 14 : 10;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "50%";
  el.style.backgroundColor = m.color;
  el.style.border = "2px solid #05070A";
  el.style.boxShadow = `0 0 6px ${m.color}`;
  el.style.cursor = "pointer";

  if (m.pulsing) {
    const ping = document.createElement("span");
    ping.style.position = "absolute";
    ping.style.inset = "-6px";
    ping.style.borderRadius = "50%";
    ping.style.backgroundColor = m.color;
    ping.style.opacity = "0.4";
    ping.style.animation = "globe-marker-ping 1.6s cubic-bezier(0,0,0.2,1) infinite";
    el.style.position = "relative";
    el.appendChild(ping);
  }
  return el;
}

export function GlobeMap({
  markers,
  onSelectMarker,
  countryCodesWithEvents,
  onSelectCountry,
  legend,
}: {
  markers: GlobeMarker[];
  onSelectMarker: (id: string) => void;
  countryCodesWithEvents: Set<string>;
  onSelectCountry: (code: string, lat: number, lng: number) => void;
  legend: { color: string; label: string }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerObjsRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [basemap, setBasemap] = useState<"satellite" | "dark">("satellite");
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number; label: string } | null>(
    null
  );

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE_URL,
      center: [15, 20],
      zoom: 1.2,
      minZoom: 1,
      maxZoom: 19,
      maxPitch: 60,
    });
    mapRef.current = map;

    map.on("load", () => {
      // Globe projection + atmosphere, set imperatively — embedding these
      // in the style JSON instead (as a prior version of this component
      // did) is what caused flyTo/pan to crash on this map engine version.
      try {
        (map as any).setProjection({ type: "globe" });
        (map as any).setSky?.(SKY_CONFIG);
      } catch {
        // Non-fatal: globe/sky are visual enhancements, map still works flat.
      }

      map.addSource("satellite-tiles", {
        type: "raster",
        tiles: SATELLITE_TILES,
        tileSize: 256,
        // Esri's free imagery mosaic doesn't have full coverage at the
        // very lowest zoom levels in every region ("Map data not yet
        // available" placeholder tiles) — staying above zoom 2 avoids the
        // zoom range where that's most common. See:
        // community.esri.com/t5/arcgis-online-questions/map-data-not-yet-available/td-p/1065960
        minzoom: 2,
        attribution: "Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      });
      map.addLayer({
        id: "satellite-layer",
        type: "raster",
        source: "satellite-tiles",
        paint: { "raster-opacity": 1 },
        layout: { visibility: "visible" },
      });

      // Place-name / country-border overlay so satellite view isn't just
      // bare imagery with no labels — this was present in an earlier
      // version and got dropped in the rewrite to raw maplibregl.
      map.addSource("satellite-labels", {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        minzoom: 2,
        attribution: "Esri",
      });
      map.addLayer({
        id: "satellite-labels-layer",
        type: "raster",
        source: "satellite-labels",
        paint: { "raster-opacity": 0.9 },
        layout: { visibility: "visible" },
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Toggle satellite (+ its label overlay) visibility — cheap, no full
  // style reload/flicker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const visibility = basemap === "satellite" ? "visible" : "none";
    if (map.getLayer("satellite-layer")) {
      map.setLayoutProperty("satellite-layer", "visibility", visibility);
    }
    if (map.getLayer("satellite-labels-layer")) {
      map.setLayoutProperty("satellite-labels-layer", "visibility", visibility);
    }
  }, [basemap, mapReady]);

  // Sync markers imperatively.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const existing = markerObjsRef.current;
    const nextIds = new Set(markers.map((m) => m.id));

    for (const [id, markerObj] of existing) {
      if (!nextIds.has(id)) {
        markerObj.remove();
        existing.delete(id);
      }
    }

    for (const m of markers) {
      const el = createMarkerElement(m);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectMarker(m.id);
      });
      existing.get(m.id)?.remove();
      const markerObj = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([m.longitude, m.latitude])
        .addTo(map);
      existing.set(m.id, markerObj);
    }
  }, [markers, mapReady, onSelectMarker]);

  const coordMatch = useMemo(() => {
    const m = query.match(COORD_PATTERN);
    if (!m) return null;
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  }, [query]);

  const countryResults = useMemo(() => {
    if (!query.trim() || coordMatch) return [];
    const q = query.trim().toLowerCase();
    return COUNTRY_ENTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5);
  }, [query, coordMatch]);

  // Debounced address/city search via our /api/geocode proxy — only fires
  // once typing pauses, and only for queries that aren't a country match
  // or raw coordinates already.
  useEffect(() => {
    if (coordMatch || query.trim().length < 3 || countryResults.length > 0) {
      setGeocodeResults([]);
      return;
    }
    const q = query.trim();
    setGeocoding(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setGeocodeResults(json.results ?? []);
      } catch {
        setGeocodeResults([]);
      } finally {
        setGeocoding(false);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      setGeocoding(false);
    };
  }, [query, coordMatch, countryResults.length]);

  function flyToPoint(lat: number, lng: number, label: string, zoom = 6) {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1400 });
    setLastLocation({ lat, lng, label });
    setOpen(false);
  }

  function goToCountry(entry: { code: string; name: string; lat: number; lng: number }) {
    flyToPoint(entry.lat, entry.lng, entry.name, 4);
    setQuery(entry.name);
    onSelectCountry(entry.code, entry.lat, entry.lng);
  }

  return (
    <div className="relative h-full w-full">
      <style>{`
        @keyframes globe-marker-ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
      <div ref={containerRef} className="h-full w-full" />

      {/* Search: country, city/address, or raw "lat,lng" coordinates */}
      <div className="absolute left-3 top-3 z-10 w-72">
        <div className="flex items-center gap-2 rounded-sm border border-[#1E2734] bg-[#0B0F16]/95 px-2.5 py-2">
          {geocoding ? (
            <Loader2 size={13} className="shrink-0 animate-spin text-[#5B6572]" />
          ) : (
            <Search size={13} className="shrink-0 text-[#5B6572]" />
          )}
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Country, city, address, or lat,lng…"
            className="w-full bg-transparent font-mono text-[11.5px] text-[#E7E9EC] placeholder:text-[#5B6572] outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setOpen(false);
                setGeocodeResults([]);
              }}
              className="shrink-0 text-[#5B6572] hover:text-[#E7E9EC]"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {open && coordMatch && (
          <div className="mt-1 rounded-sm border border-[#1E2734] bg-[#0B0F16]/95">
            <button
              onClick={() =>
                flyToPoint(coordMatch.lat, coordMatch.lng, `${coordMatch.lat}, ${coordMatch.lng}`, 8)
              }
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-mono text-[11px] text-[#C4CAD2] hover:bg-[#10151D]"
            >
              <MapPin size={12} className="shrink-0 text-[#43D9C8]" />
              Go to {coordMatch.lat.toFixed(4)}, {coordMatch.lng.toFixed(4)}
            </button>
          </div>
        )}

        {open && !coordMatch && (countryResults.length > 0 || geocodeResults.length > 0) && (
          <div className="mt-1 max-h-64 overflow-y-auto rounded-sm border border-[#1E2734] bg-[#0B0F16]/95">
            {countryResults.map((r) => (
              <button
                key={r.code}
                onClick={() => goToCountry(r)}
                className="flex w-full items-center justify-between px-3 py-2 text-left font-mono text-[11px] text-[#C4CAD2] hover:bg-[#10151D]"
              >
                <span>{r.name}</span>
                {countryCodesWithEvents.has(r.code) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF4D4F]" />
                )}
              </button>
            ))}
            {geocodeResults.map((r, i) => (
              <button
                key={`${r.lat}-${r.lng}-${i}`}
                onClick={() => flyToPoint(r.lat, r.lng, r.name, 11)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[#10151D]"
              >
                <MapPin size={11} className="mt-0.5 shrink-0 text-[#5B6572]" />
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[11px] text-[#C4CAD2]">{r.name}</span>
                  <span className="block truncate font-mono text-[9.5px] text-[#5B6572]">
                    {r.displayName}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {lastLocation && (
        <a
          href={`https://www.google.com/maps/@${lastLocation.lat},${lastLocation.lng},16z/data=!3m1!1e3`}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-sm border border-[#1E2734] bg-[#0B0F16]/95 px-2.5 py-1.5 font-mono text-[10px] text-[#8A93A0] hover:text-[#43D9C8]"
        >
          <ExternalLink size={10} />
          {lastLocation.label} in Google Maps satellite
        </a>
      )}

      {/* Basemap toggle */}
      <div className="absolute right-3 top-14 z-10 flex flex-col overflow-hidden rounded-sm border border-[#1E2734]">
        <button
          onClick={() => setBasemap("satellite")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] tracking-wide ${
            basemap === "satellite" ? "bg-[#1E2734] text-[#E7E9EC]" : "bg-[#0B0F16] text-[#5B6572]"
          }`}
          title="Satellite imagery"
        >
          <Satellite size={11} /> SAT
        </button>
        <button
          onClick={() => setBasemap("dark")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] tracking-wide ${
            basemap === "dark" ? "bg-[#1E2734] text-[#E7E9EC]" : "bg-[#0B0F16] text-[#5B6572]"
          }`}
          title="Dark map"
        >
          <Moon size={11} /> DARK
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-sm border border-[#1E2734] bg-[#0B0F16]/90 px-3 py-1.5 font-mono text-[10px] text-[#8A93A0]">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
