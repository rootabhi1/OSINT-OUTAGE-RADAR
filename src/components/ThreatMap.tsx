"use client";

import type { ThreatEvent } from "@/lib/types";
import { GlobeMap, type GlobeMarker } from "./GlobeMap";

const KIND_COLOR: Record<string, string> = {
  bgp_hijack: "#FF4D4F",
  bgp_leak: "#FFB020",
  attack_l3: "#B084FF",
  attack_l7: "#B084FF",
};

export function ThreatMap({
  threats,
  selectedId,
  onSelect,
}: {
  threats: ThreatEvent[];
  selectedId: string | null;
  onSelect: (t: ThreatEvent) => void;
}) {
  const markers: GlobeMarker[] = threats
    .filter((t) => typeof t.location?.latitude === "number" && typeof t.location?.longitude === "number")
    .map((t) => ({
      id: t.id,
      latitude: t.location!.latitude!,
      longitude: t.location!.longitude!,
      color: KIND_COLOR[t.kind],
      pulsing: t.kind === "bgp_hijack",
      selected: t.id === selectedId,
    }));

  const countryCodesWithEvents = new Set(
    threats.map((t) => t.location?.code).filter((c): c is string => !!c)
  );

  return (
    <GlobeMap
      markers={markers}
      onSelectMarker={(id) => {
        const match = threats.find((t) => t.id === id);
        if (match) onSelect(match);
      }}
      countryCodesWithEvents={countryCodesWithEvents}
      onSelectCountry={(code) => {
        const match = threats.find((t) => t.location?.code === code);
        if (match) onSelect(match);
      }}
      legend={[
        { color: KIND_COLOR.bgp_hijack, label: "Hijack" },
        { color: KIND_COLOR.bgp_leak, label: "Leak" },
        { color: KIND_COLOR.attack_l3, label: "Attack origin" },
      ]}
    />
  );
}
