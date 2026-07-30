"use client";

import type { FlightState } from "@/lib/types";
import { GlobeMap, type FlightPoint } from "./GlobeMap";

// Colors chosen by broad aircraft category so "all flight types" reads
// visually distinct on the globe, not just a wall of identical dots.
const CATEGORY_COLOR: Record<number, string> = {
  4: "#43D9C8", // large
  5: "#43D9C8",
  6: "#43D9C8", // heavy
  2: "#7DE87D", // light aircraft
  3: "#7DE87D",
  12: "#7DE87D", // ultralight
  8: "#FFB020", // rotorcraft
  9: "#B084FF", // glider
  10: "#B084FF", // lighter-than-air
  14: "#FF4D4F", // UAV/drone
};
const DEFAULT_COLOR = "#8A93A0";

export function FlightMap({
  flights,
  selectedId,
  onSelect,
}: {
  flights: FlightState[];
  selectedId: string | null;
  onSelect: (f: FlightState) => void;
}) {
  const points: FlightPoint[] = flights.map((f) => ({
    id: f.icao24,
    latitude: f.latitude,
    longitude: f.longitude,
    heading: f.heading ?? 0,
    color: CATEGORY_COLOR[f.category] ?? DEFAULT_COLOR,
  }));

  return (
    <GlobeMap
      markers={[]}
      onSelectMarker={() => {}}
      countryCodesWithEvents={new Set()}
      onSelectCountry={() => {}}
      flights={points}
      selectedFlightId={selectedId}
      onSelectFlight={(id) => {
        const match = flights.find((f) => f.icao24 === id);
        if (match) onSelect(match);
      }}
      legend={[
        { color: "#43D9C8", label: "Large/heavy" },
        { color: "#7DE87D", label: "Light" },
        { color: "#FFB020", label: "Helicopter" },
        { color: "#B084FF", label: "Glider/airship" },
        { color: "#FF4D4F", label: "UAV" },
      ]}
    />
  );
}
