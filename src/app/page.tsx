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
import type { NormalizedOutage, OutagesResponse, ThreatEvent, ThreatsResponse } from "@/lib/types";
import { getDemoResponse, getDemoThreatsResponse } from "@/lib/demo-data";
import { AlertCircle } from "lucide-react";

const POLL_INTERVAL_MS = 60_000;

export default function Home() {
  const [mode, setMode] = useState<Mode>("outages");

  const [outageData, setOutageData] = useState<OutagesResponse | null>(null);
  const [selectedOutage, setSelectedOutage] = useState<NormalizedOutage | null>(null);
  const [filter, setFilter] = useState<"all" | "ongoing" | "resolved">("all");
  const [outagesLoading, setOutagesLoading] = useState(true);

  const [threatData, setThreatData] = useState<ThreatsResponse | null>(null);
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(null);
  const [threatsLoading, setThreatsLoading] = useState(true);

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

  useEffect(() => {
    fetchOutages();
    fetchThreats();
    const id1 = setInterval(fetchOutages, POLL_INTERVAL_MS);
    const id2 = setInterval(fetchThreats, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id1);
      clearInterval(id2);
    };
  }, [fetchOutages, fetchThreats]);

  const outages = outageData?.outages ?? [];
  const threats = threatData?.threats ?? [];

  const banner =
    mode === "threats"
      ? threatData?.demo && threatData.error
      : mode === "outages"
        ? outageData?.demo && outageData.error
        : null;

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#0A0D12] text-[#E7E9EC]">
      <TopBar
        total={mode === "threats" ? threats.length : outages.length}
        ongoing={mode === "threats" ? threats.length : (outageData?.ongoingCount ?? 0)}
        demo={mode === "threats" ? !!threatData?.demo : !!outageData?.demo}
        lastUpdated={mode === "threats" ? (threatData?.fetchedAt ?? null) : (outageData?.fetchedAt ?? null)}
      />
      <ModeTabs mode={mode} onChange={setMode} />

      {banner && (
        <div className="flex items-center gap-2 border-b border-[#FFB020]/20 bg-[#FFB020]/5 px-4 py-1.5 font-mono text-[10.5px] text-[#FFB020]">
          <AlertCircle size={12} />
          {mode === "threats" ? threatData?.error : outageData?.error}
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

      {mode === "investigate" && (
        <div className="flex-1 overflow-hidden">
          <InvestigatePanel />
        </div>
      )}
    </main>
  );
}
