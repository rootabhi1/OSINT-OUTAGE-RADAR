"use client";

import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { NormalizedOutage } from "@/lib/types";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#FF4D4F",
  elevated: "#FFB020",
  minor: "#43D9C8",
};

// Minimal dark basemap style (no external tile key required) using OSM raster
// tiles rendered with a dark filter via canvas would be heavier; instead we
// ship a bare vector-free dark style with country outlines from a public
// demotiles source so the map works without any API key.
const DARK_STYLE = {
  version: 8 as const,
  sources: {
    "carto-dark": {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
        "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
        "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [
    { id: "background", type: "background" as const, paint: { "background-color": "#0A0D12" } },
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
  const markers = outages.flatMap((o) =>
    o.locations
      .filter((l) => typeof l.latitude === "number" && typeof l.longitude === "number")
      .map((l) => ({ outage: o, loc: l }))
  );

  return (
    <div className="relative h-full w-full">
      <Map
        initialViewState={{ longitude: 15, latitude: 20, zoom: 1.4 }}
        minZoom={0.8}
        maxZoom={8}
        mapStyle={DARK_STYLE as any}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" showCompass={false} />
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
                  className="relative inline-flex rounded-full border"
                  style={{
                    width: isSelected ? 12 : 8,
                    height: isSelected ? 12 : 8,
                    backgroundColor: color,
                    borderColor: "#0A0D12",
                  }}
                />
              </button>
            </Marker>
          );
        })}
      </Map>

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
