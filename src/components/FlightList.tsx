"use client";

import { useMemo, useState } from "react";
import type { FlightState } from "@/lib/types";
import { Plane, Search, X } from "lucide-react";

function formatAlt(m: number | null): string {
  if (m == null) return "—";
  return `${Math.round(m * 3.281).toLocaleString()} ft`;
}

function formatSpeed(mps: number | null): string {
  if (mps == null) return "—";
  return `${Math.round(mps * 1.944)} kt`;
}

export function FlightList({
  flights,
  selectedId,
  onSelect,
  totalCount,
}: {
  flights: FlightState[];
  selectedId: string | null;
  onSelect: (f: FlightState) => void;
  totalCount: number;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return flights
      .filter(
        (f) =>
          f.callsign?.toLowerCase().includes(q) ||
          f.originCountry?.toLowerCase().includes(q) ||
          f.icao24.toLowerCase().includes(q) ||
          f.categoryLabel.toLowerCase().includes(q) ||
          f.aircraftTypeCode?.toLowerCase().includes(q) ||
          f.aircraftDescription?.toLowerCase().includes(q) ||
          f.operator?.toLowerCase().includes(q) ||
          f.registration?.toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [flights, query]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-[#1E2734] bg-[#0B0F16] sm:w-[340px]">
      <div className="border-b border-[#1E2734] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Plane size={13} className="text-[#43D9C8]" />
          <span className="font-mono text-[11px] text-[#E7E9EC]">
            {totalCount.toLocaleString()} aircraft airborne now
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-sm border border-[#1E2734] bg-[#0F141C] px-2.5 py-1.5">
          <Search size={12} className="shrink-0 text-[#5B6572]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Callsign, country, ICAO24, or type…"
            className="w-full bg-transparent font-mono text-[11px] text-[#E7E9EC] placeholder:text-[#5B6572] outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[#5B6572] hover:text-[#E7E9EC]">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!query.trim() && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Plane size={20} className="text-[#3A4553]" />
            <p className="font-mono text-[11px] leading-relaxed text-[#5B6572]">
              Search for a flight, or click any aircraft on the globe directly.
            </p>
          </div>
        )}

        {query.trim() && filtered.length === 0 && (
          <div className="px-4 py-8 text-center font-mono text-[11px] text-[#5B6572]">
            No matching aircraft right now.
          </div>
        )}

        {filtered.map((f) => {
          const isSelected = f.icao24 === selectedId;
          return (
            <button
              key={f.icao24}
              onClick={() => onSelect(f)}
              className={`block w-full border-b border-[#161B24] px-3 py-2.5 text-left transition-colors ${
                isSelected ? "bg-[#131922]" : "hover:bg-[#10151D]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] font-medium text-[#E7E9EC]">
                  {f.callsign ?? f.icao24.toUpperCase()}
                </span>
                <span className="font-mono text-[9px] text-[#5B6572]">
                  {f.aircraftTypeCode ?? f.categoryLabel}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-[#8A93A0]">
                <span>{f.originCountry}</span>
                <span>
                  {formatAlt(f.baroAltitude)} · {formatSpeed(f.velocity)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
