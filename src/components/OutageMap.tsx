"use client";

import type { NormalizedOutage } from "@/lib/types";
import { GlobeMap, type GlobeMarker } from "./GlobeMap";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#FF4D4F",
  elevated: "#FFB020",
  minor: "#43D9C8",
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
  const markers: GlobeMarker[] = outages.flatMap((o) =>
    o.locations
      .filter((l) => typeof l.latitude === "number" && typeof l.longitude === "number")
      .map((l) => ({
        id: o.id,
        latitude: l.latitude!,
        longitude: l.longitude!,
        color: SEVERITY_COLOR[o.severity],
        pulsing: !o.endDate,
        selected: o.id === selectedId,
      }))
  );

  const countryCodesWithEvents = new Set(
    outages.flatMap((o) => o.locations.map((l) => l.code))
  );

  return (
    <GlobeMap
      markers={markers}
      onSelectMarker={(id) => {
        const match = outages.find((o) => o.id === id);
        if (match) onSelect(match);
      }}
      countryCodesWithEvents={countryCodesWithEvents}
      onSelectCountry={(code) => {
        const match = outages.find((o) => o.locations.some((l) => l.code === code));
        if (match) onSelect(match);
      }}
      legend={[
        { color: SEVERITY_COLOR.critical, label: "Critical" },
        { color: SEVERITY_COLOR.elevated, label: "Elevated" },
        { color: SEVERITY_COLOR.minor, label: "Anomaly" },
      ]}
    />
  );
}
