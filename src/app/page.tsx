"use client";

import { useEffect, useState, useCallback } from "react";
import { TopBar } from "@/components/TopBar";
import { ModeTabs, type Mode } from "@/components/ModeTabs";
import { OutageList } from "@/components/OutageList";
import { OutageMap } from "@/components/OutageMap";
import { DetailPanel } from "@/components/DetailPanel";
import { ThreatList } from "@/components/ThreatList";
import { ThreatMap } from "@/components/ThreatMap";
import { ThreatDetailPanel } from "@/components/ThreatDetailPanel";
import { InvestigatePanel } from "@/components/InvestigatePanel";
import { FlightMap } from "@/components/FlightMap";
import { FlightList } from "@/components/FlightList";
import { FlightDetailPanel } from "@/components/FlightDetailPanel";
import type {
  NormalizedOutage,
  OutagesResponse,
  ThreatEvent,
  ThreatsResponse,
  FlightState,
  FlightsResponse,
} from "@/lib/types";
import { getDemoResponse, getDemoThreatsResponse } from "@/lib/demo-data";
import { AlertCircle } from "lucide-react";

const POLL_INTERVAL_MS = 60_000;
const FLIGHTS_POLL_INTERVAL_MS = 15_000; // flights genuinely move fast — refresh sooner

export default function Home() {
  const [mode, setMode] = useState<Mode>("outages");

  const [outageData, setOutageData] = useState<OutagesResponse | null>(null);
  const [selectedOutage, setSelectedOutage] = useState<NormalizedOutage | null>(null);
  const [filter, setFilter] = useState<"all" | "ongoing" | "resolved">("all");
  const [outagesLoading, setOutagesLoading] = useState(true);

  const [threatData, setThreatData] = useState<ThreatsResponse | null>(null);
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(null);
  const [threatsLoading, setThreatsLoading] = useState(true);

  const [flightData, setFlightData] = useState<FlightsResponse | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<FlightState | null>(null);
  const [flightsLoading, setFlightsLoading] = useState(true);

  const fetchOutages = useCallback(async () => {
    try {
      const res = await fetch("/api/outages");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json: OutagesResponse = await res.json();
      setOutageData(json);
    } catch {
      setOutageData((prev) =>
        prev ?? getDemoResponse("Static preview build — connect a live deployment for real-time data.")
      );
    } finally {
      setOutagesLoading(false);
    }
  }, []);

  const fetchThreats = useCallback(async () => {
    try {
      const res = await fetch("/api/threats");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json: ThreatsResponse = await res.json();
      setThreatData(json);
    } catch {
      setThreatData((prev) =>
        prev ?? getDemoThreatsResponse("Static preview build — connect a live deployment for real-time data.")
      );
    } finally {
      setThreatsLoading(false);
    }
  }, []);

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch("/api/flights");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json: FlightsResponse = await res.json();
      setFlightData(json);
      // Keep the selected aircraft's info current as new positions arrive.
      setSelectedFlight((prev) => (prev ? json.flights.find((f) => f.icao24 === prev.icao24) ?? prev : prev));
    } catch {
      // keep last known good data on a transient failure
    } finally {
      setFlightsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutages();
    fetchThreats();
    fetchFlights();
    const id1 = setInterval(fetchOutages, POLL_INTERVAL_MS);
    const id2 = setInterval(fetchThreats, POLL_INTERVAL_MS);
    const id3 = setInterval(fetchFlights, FLIGHTS_POLL_INTERVAL_MS);
    return () => {
      clearInterval(id1);
      clearInterval(id2);
      clearInterval(id3);
    };
  }, [fetchOutages, fetchThreats, fetchFlights]);

  const outages = outageData?.outages ?? [];
  const threats = threatData?.threats ?? [];
  const flights = flightData?.flights ?? [];

  const banner =
    mode === "threats"
      ? threatData?.demo && threatData.error
      : mode === "outages"
        ? outageData?.demo && outageData.error
        : mode === "flights"
          ? flightData?.error
          : null;

  const topBarProps =
    mode === "threats"
      ? { total: threats.length, ongoing: threats.length, demo: !!threatData?.demo, lastUpdated: threatData?.fetchedAt ?? null }
      : mode === "flights"
        ? { total: flights.length, ongoing: flights.length, demo: !!flightData?.demo, lastUpdated: flightData?.fetchedAt ?? null }
        : { total: outages.length, ongoing: outageData?.ongoingCount ?? 0, demo: !!outageData?.demo, lastUpdated: outageData?.fetchedAt ?? null };

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#0A0D12] text-[#E7E9EC]">
      <TopBar {...topBarProps} />
      <ModeTabs mode={mode} onChange={setMode} />

      {banner && (
        <div className="flex items-center gap-2 border-b border-[#FFB020]/20 bg-[#FFB020]/5 px-4 py-1.5 font-mono text-[10.5px] text-[#FFB020]">
          <AlertCircle size={12} />
          {mode === "threats" ? threatData?.error : mode === "flights" ? flightData?.error : outageData?.error}
        </div>
      )}

      {mode === "outages" && (
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden sm:block sm:h-full">
            <OutageList
              outages={outages}
              selectedId={selectedOutage?.id ?? null}
              onSelect={setSelectedOutage}
              filter={filter}
              onFilterChange={setFilter}
            />
          </div>
          <div className="relative flex-1">
            {outagesLoading && !outageData && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0D12]">
                <p className="animate-pulse font-mono text-[11px] tracking-widest text-[#5B6572]">
                  ESTABLISHING FEED…
                </p>
              </div>
            )}
            <OutageMap outages={outages} selectedId={selectedOutage?.id ?? null} onSelect={setSelectedOutage} />
          </div>
          <DetailPanel outage={selectedOutage} onClose={() => setSelectedOutage(null)} />
          <div className="block h-52 border-t border-[#1E2734] sm:hidden">
            <OutageList
              outages={outages}
              selectedId={selectedOutage?.id ?? null}
              onSelect={setSelectedOutage}
              filter={filter}
              onFilterChange={setFilter}
            />
          </div>
        </div>
      )}

      {mode === "threats" && (
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden sm:block sm:h-full">
            <ThreatList
              threats={threats}
              selectedId={selectedThreat?.id ?? null}
              onSelect={setSelectedThreat}
            />
          </div>
          <div className="relative flex-1">
            {threatsLoading && !threatData && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0D12]">
                <p className="animate-pulse font-mono text-[11px] tracking-widest text-[#5B6572]">
                  ESTABLISHING FEED…
                </p>
              </div>
            )}
            <ThreatMap threats={threats} selectedId={selectedThreat?.id ?? null} onSelect={setSelectedThreat} />
          </div>
          <ThreatDetailPanel threat={selectedThreat} onClose={() => setSelectedThreat(null)} />
          <div className="block h-52 border-t border-[#1E2734] sm:hidden">
            <ThreatList
              threats={threats}
              selectedId={selectedThreat?.id ?? null}
              onSelect={setSelectedThreat}
            />
          </div>
        </div>
      )}

      {mode === "flights" && (
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden sm:block sm:h-full">
            <FlightList
              flights={flights}
              selectedId={selectedFlight?.icao24 ?? null}
              onSelect={setSelectedFlight}
              totalCount={flights.length}
            />
          </div>
          <div className="relative flex-1">
            {flightsLoading && !flightData && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0D12]">
                <p className="animate-pulse font-mono text-[11px] tracking-widest text-[#5B6572]">
                  ACQUIRING LIVE TRAFFIC…
                </p>
              </div>
            )}
            <FlightMap flights={flights} selectedId={selectedFlight?.icao24 ?? null} onSelect={setSelectedFlight} />
          </div>
          <FlightDetailPanel flight={selectedFlight} onClose={() => setSelectedFlight(null)} />
          <div className="block h-52 border-t border-[#1E2734] sm:hidden">
            <FlightList
              flights={flights}
              selectedId={selectedFlight?.icao24 ?? null}
              onSelect={setSelectedFlight}
              totalCount={flights.length}
            />
          </div>
        </div>
      )}

      {mode === "investigate" && (
        <div className="flex-1 overflow-hidden">
          <InvestigatePanel />
        </div>
      )}
    </main>
  );
}
