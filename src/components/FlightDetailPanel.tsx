"use client";

import type { FlightState } from "@/lib/types";
import { X, Plane, Navigation, Gauge, ArrowUpDown, Radio, ShieldAlert, Building2, Tag } from "lucide-react";

function formatAlt(m: number | null): string {
  if (m == null) return "Unknown";
  return `${Math.round(m * 3.281).toLocaleString()} ft (${Math.round(m).toLocaleString()} m)`;
}

function formatSpeed(mps: number | null): string {
  if (mps == null) return "Unknown";
  return `${Math.round(mps * 1.944)} kt (${Math.round(mps * 3.6)} km/h)`;
}

function formatVerticalRate(mps: number | null): string {
  if (mps == null || Math.abs(mps) < 0.5) return "Level flight";
  return mps > 0 ? `Climbing at ${Math.round(mps * 197)} ft/min` : `Descending at ${Math.round(Math.abs(mps) * 197)} ft/min`;
}

function timeAgo(unixSeconds: number): string {
  const diffSec = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diffSec < 60) return `${diffSec}s ago`;
  return `${Math.floor(diffSec / 60)}m ago`;
}

export function FlightDetailPanel({ flight, onClose }: { flight: FlightState | null; onClose: () => void }) {
  if (!flight) {
    return (
      <aside className="hidden h-full w-[320px] flex-col items-center justify-center border-l border-[#1E2734] bg-[#0B0F16] px-8 text-center lg:flex">
        <Plane size={22} className="mb-3 text-[#3A4553]" />
        <p className="font-mono text-[11px] leading-relaxed text-[#5B6572]">
          Select an aircraft from the list or the globe for details.
        </p>
      </aside>
    );
  }

  const hasRichData = flight.aircraftDescription || flight.operator || flight.registration;

  return (
    <aside className="flex h-full w-full min-h-0 flex-col border-l border-[#1E2734] bg-[#0B0F16] sm:w-[320px]">
      <div className="flex items-center justify-between border-b border-[#1E2734] px-4 py-3">
        <span className="font-mono text-[10px] tracking-widest text-[#5B6572]">AIRCRAFT DETAIL</span>
        <button onClick={onClose} className="text-[#5B6572] hover:text-[#E7E9EC]" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-2">
          <Plane size={16} className="text-[#43D9C8]" style={{ transform: `rotate(${flight.heading ?? 0}deg)` }} />
          <h2 className="font-mono text-[14px] font-semibold text-[#E7E9EC]">
            {flight.callsign ?? flight.icao24.toUpperCase()}
          </h2>
        </div>

        {/* Real aircraft identity — model, operator, registration — when
            the data source provides it (airplanes.live does, OpenSky's
            basic feed doesn't). This is the "who/what is this, really"
            info a bare category label can't give you. */}
        {hasRichData ? (
          <div className="mt-2 space-y-1.5">
            {flight.aircraftDescription && (
              <p className="font-sans text-[13px] font-medium text-[#E7E9EC]">
                {flight.aircraftDescription}
                {flight.aircraftTypeCode && (
                  <span className="ml-1.5 font-mono text-[10px] text-[#5B6572]">
                    ({flight.aircraftTypeCode})
                  </span>
                )}
              </p>
            )}
            {flight.operator && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8A93A0]">
                <Building2 size={11} className="text-[#5B6572]" />
                {flight.operator}
              </div>
            )}
            {flight.registration && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8A93A0]">
                <Tag size={11} className="text-[#5B6572]" />
                Registration {flight.registration}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[#5B6572]">
            {flight.categoryLabel}
            {flight.originCountry && flight.originCountry !== "Unknown" ? ` · ${flight.originCountry}` : ""}
          </p>
        )}

        {flight.onGround && (
          <div className="mt-3 flex items-center gap-1.5 rounded-sm border border-[#FFB020]/30 bg-[#FFB020]/5 px-3 py-2">
            <ShieldAlert size={12} className="text-[#FFB020]" />
            <span className="font-mono text-[10px] text-[#FFB020]">Currently on the ground</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[11px]">
          <Stat icon={<Gauge size={12} />} label="Altitude" value={formatAlt(flight.baroAltitude)} />
          <Stat icon={<Navigation size={12} />} label="Ground speed" value={formatSpeed(flight.velocity)} />
          <Stat
            icon={<Navigation size={12} />}
            label="Heading"
            value={flight.heading != null ? `${Math.round(flight.heading)}°` : "Unknown"}
          />
          <Stat icon={<ArrowUpDown size={12} />} label="Vertical" value={formatVerticalRate(flight.verticalRate)} />
        </div>

        <div className="mt-5 space-y-3 font-mono text-[11px]">
          <div className="flex items-start gap-2">
            <Radio size={13} className="mt-0.5 shrink-0 text-[#5B6572]" />
            <div className="text-[#C4CAD2]">
              <div>ICAO24: {flight.icao24.toUpperCase()}</div>
              {flight.squawk && <div className="mt-0.5 text-[#8A93A0]">Squawk: {flight.squawk}</div>}
              {!hasRichData && flight.categoryLabel && (
                <div className="mt-0.5 text-[#8A93A0]">Category: {flight.categoryLabel}</div>
              )}
            </div>
          </div>
          <div className="text-[#5B6572]">Position last updated {timeAgo(flight.lastContact)}</div>
        </div>

        <p className="mt-5 font-mono text-[10px] leading-relaxed text-[#5B6572]">
          Position from crowdsourced ADS-B receiver networks (OpenSky Network, or airplanes.live when
          OpenSky is unreachable). Aircraft without an active transponder, or outside receiver coverage,
          won't appear here.
        </p>
      </div>
    </aside>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[#1E2734] bg-[#0F141C] p-2.5">
      <div className="flex items-center gap-1.5 text-[#5B6572]">
        {icon}
        <span className="text-[9.5px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 text-[#E7E9EC]">{value}</div>
    </div>
  );
}
