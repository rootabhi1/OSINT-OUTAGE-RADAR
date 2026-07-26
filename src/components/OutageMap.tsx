"use client";

import { useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { NormalizedOutage } from "@/lib/types";
import centroids from "@/lib/country-centroids.json";
import { Search, X, Satellite, Moon } from "lucide-react";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#FF4D4F",
  elevated: "#FFB020",
  minor: "#43D9C8",
};

type Centroids = Record<string, [number, number, string]>;
const CENTROIDS = centroids as unknown as Centroids;
const COUNTRY_ENTRIES = Object.entries(CENTROIDS).map(([code, [lat, lng, name]]) => ({
  code,
  name,
  lat,
  lng,
}));

// Shared globe + atmosphere config so both basemaps get the same rotating,
// space-like presentation. "projection" and "sky" are style-spec properties
// MapLibre GL JS v4+ reads directly.
const GLOBE_PROJECTION = { type: "globe" as const };
const SKY = {
  "sky-color": "#05070A",
  "sky-horizon-blend": 0.6,
  "horizon-color": "#0F1620",
  "horizon-fog-blend": 0.6,
  "fog-color": "#0A0D12",
  "fog-ground-blend": 0.7,
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.85, 5, 0.3, 10, 0],
};

// Esri's free World Imagery service — real satellite/aerial photography, no
// API key required. Paired with their boundary+label reference layer on top
// so country names and borders stay legible over the photography, the way
// OSIRIS's globe reads even at a glance.
const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    "esri-imagery": {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
    "esri-boundaries": {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri",
    },
  },
  projection: GLOBE_PROJECTION,
  sky: SKY,
  layers: [
    { id: "background", type: "background" as const, paint: { "background-color": "#05070A" } },
    { id: "esri-imagery-layer", type: "raster" as const, source: "esri-imagery" },
    {
      id: "esri-boundaries-layer",
      type: "raster" as const,
      source: "esri-boundaries",
      paint: { "raster-opacity": 0.85 },
    },
  ],
};

// CartoDB's free dark basemap as an alternate, lower-glare view.
const DARK_STYLE = {
  version: 8 as const,
  sources: {
    "carto-dark": {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  projection: GLOBE_PROJECTION,
  sky: SKY,
  layers: [
    { id: "background", type: "background" as const, paint: { "background-color": "#05070A" } },
    { id: "carto-dark-layer", type: "raster" as const, source: "carto-dark" },
  ],
};

export function OutageMap({
  outages,
  selectedId,
  onSelect,
}: {
  outages: NormalizedOutage[];
  selectedId: string | null;
  onSelect: (o: NormalizedOutage) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [basemap, setBasemap] = useState<"satellite" | "dark">("satellite");

  const markers = outages.flatMap((o) =>
    o.locations
      .filter((l) => typeof l.latitude === "number" && typeof l.longitude === "number")
      .map((l) => ({ outage: o, loc: l }))
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return COUNTRY_ENTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  function goToCountry(entry: { code: string; name: string; lat: number; lng: number }) {
    mapRef.current?.flyTo({ center: [entry.lng, entry.lat], zoom: 4, duration: 1400 });
    setOpen(false);
    setQuery(entry.name);
    const match = outages.find((o) => o.locations.some((l) => l.code === entry.code));
    if (match) onSelect(match);
  }

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 15, latitude: 20, zoom: 1.2 }}
        minZoom={0}
        maxZoom={12}
        mapStyle={(basemap === "satellite" ? SATELLITE_STYLE : DARK_STYLE) as any}
        style={{ width: "100%", height: "100%" }}
        scrollZoom
        doubleClickZoom
        touchZoomRotate
        dragRotate
      >
        <NavigationControl position="top-right" showCompass visualizePitch />
        {markers.map(({ outage, loc }, i) => {
          const color = SEVERITY_COLOR[outage.severity];
          const isSelected = outage.id === selectedId;
          const isLive = !outage.endDate;
          return (
            <Marker
              key={`${outage.id}-${loc.code}-${i}`}
              longitude={loc.longitude!}
              latitude={loc.latitude!}
              anchor="center"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(outage);
                }}
                className="relative flex items-center justify-center"
                style={{ width: isSelected ? 22 : 16, height: isSelected ? 22 : 16 }}
                aria-label={`Outage: ${loc.name}`}
              >
                {isLive && (
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span
                  className="relative inline-flex rounded-full border-2"
                  style={{
                    width: isSelected ? 14 : 10,
                    height: isSelected ? 14 : 10,
                    backgroundColor: color,
                    borderColor: "#05070A",
                    boxShadow: `0 0 6px ${color}`,
                  }}
                />
              </button>
            </Marker>
          );
        })}
      </Map>

      {/* Country search */}
      <div className="absolute left-3 top-3 z-10 w-64">
        <div className="flex items-center gap-2 rounded-sm border border-[#1E2734] bg-[#0B0F16]/95 px-2.5 py-2">
          <Search size={13} className="shrink-0 text-[#5B6572]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search a country…"
            className="w-full bg-transparent font-mono text-[11.5px] text-[#E7E9EC] placeholder:text-[#5B6572] outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setOpen(false);
              }}
              className="shrink-0 text-[#5B6572] hover:text-[#E7E9EC]"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {open && results.length > 0 && (
          <div className="mt-1 max-h-56 overflow-y-auto rounded-sm border border-[#1E2734] bg-[#0B0F16]/95">
            {results.map((r) => {
              const hasOutage = outages.some((o) => o.locations.some((l) => l.code === r.code));
              return (
                <button
                  key={r.code}
                  onClick={() => goToCountry(r)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left font-mono text-[11px] text-[#C4CAD2] hover:bg-[#10151D]"
                >
                  <span>{r.name}</span>
                  {hasOutage && <span className="h-1.5 w-1.5 rounded-full bg-[#FF4D4F]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

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
        <LegendDot color={SEVERITY_COLOR.critical} label="Critical" />
        <LegendDot color={SEVERITY_COLOR.elevated} label="Elevated" />
        <LegendDot color={SEVERITY_COLOR.minor} label="Anomaly" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
