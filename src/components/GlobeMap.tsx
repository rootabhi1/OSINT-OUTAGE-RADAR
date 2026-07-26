"use client";

import { useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import centroids from "@/lib/country-centroids.json";
import { Search, X, Satellite, Moon } from "lucide-react";

type Centroids = Record<string, [number, number, string]>;
const CENTROIDS = centroids as unknown as Centroids;
const COUNTRY_ENTRIES = Object.entries(CENTROIDS).map(([code, [lat, lng, name]]) => ({
  code,
  name,
  lat,
  lng,
}));

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

export interface GlobeMarker {
  id: string;
  latitude: number;
  longitude: number;
  color: string;
  pulsing?: boolean;
  selected?: boolean;
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
  const mapRef = useRef<MapRef>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [basemap, setBasemap] = useState<"satellite" | "dark">("satellite");

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return COUNTRY_ENTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  function goToCountry(entry: { code: string; name: string; lat: number; lng: number }) {
    mapRef.current?.flyTo({ center: [entry.lng, entry.lat], zoom: 4, duration: 1400 });
    setOpen(false);
    setQuery(entry.name);
    onSelectCountry(entry.code, entry.lat, entry.lng);
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
        {markers.map((m) => (
          <Marker key={m.id} longitude={m.longitude} latitude={m.latitude} anchor="center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectMarker(m.id);
              }}
              className="relative flex items-center justify-center"
              style={{ width: m.selected ? 22 : 16, height: m.selected ? 22 : 16 }}
              aria-label="Map event"
            >
              {m.pulsing && (
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
                  style={{ backgroundColor: m.color }}
                />
              )}
              <span
                className="relative inline-flex rounded-full border-2"
                style={{
                  width: m.selected ? 14 : 10,
                  height: m.selected ? 14 : 10,
                  backgroundColor: m.color,
                  borderColor: "#05070A",
                  boxShadow: `0 0 6px ${m.color}`,
                }}
              />
            </button>
          </Marker>
        ))}
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
            {results.map((r) => (
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
