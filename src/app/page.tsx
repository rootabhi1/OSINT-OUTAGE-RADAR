"use client";

import { useEffect, useState, useCallback } from "react";
import { TopBar } from "@/components/TopBar";
import { OutageList } from "@/components/OutageList";
import { OutageMap } from "@/components/OutageMap";
import { DetailPanel } from "@/components/DetailPanel";
import type { NormalizedOutage, OutagesResponse } from "@/lib/types";
import { getDemoResponse } from "@/lib/demo-data";
import { AlertCircle } from "lucide-react";

const POLL_INTERVAL_MS = 60_000;

export default function Home() {
  const [data, setData] = useState<OutagesResponse | null>(null);
  const [selected, setSelected] = useState<NormalizedOutage | null>(null);
  const [filter, setFilter] = useState<"all" | "ongoing" | "resolved">("all");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/outages");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json: OutagesResponse = await res.json();
      setData(json);
    } catch {
      // No API route to hit at all — this is expected on a static export
      // (e.g. GitHub Pages), which has no server to run /api/outages on.
      // Fall back to the same bundled sample data the API route would have
      // returned, so the static demo still looks fully populated.
      setData((prev) =>
        prev ?? getDemoResponse("Static preview build — connect a live deployment for real-time data.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  const outages = data?.outages ?? [];

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#0A0D12] text-[#E7E9EC]">
      <TopBar
        total={outages.length}
        ongoing={data?.ongoingCount ?? 0}
        demo={!!data?.demo}
        lastUpdated={data?.fetchedAt ?? null}
      />

      {data?.demo && data.error && (
        <div className="flex items-center gap-2 border-b border-[#FFB020]/20 bg-[#FFB020]/5 px-4 py-1.5 font-mono text-[10.5px] text-[#FFB020]">
          <AlertCircle size={12} />
          {data.error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden sm:block sm:h-full">
          <OutageList
            outages={outages}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>

        <div className="relative flex-1">
          {loading && !data && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0D12]">
              <p className="animate-pulse font-mono text-[11px] tracking-widest text-[#5B6572]">
                ESTABLISHING FEED…
              </p>
            </div>
          )}
          <OutageMap outages={outages} selectedId={selected?.id ?? null} onSelect={setSelected} />
        </div>

        <DetailPanel outage={selected} onClose={() => setSelected(null)} />
      </div>

      {/* Mobile list — shown below map on small screens */}
      <div className="block h-52 border-t border-[#1E2734] sm:hidden">
        <OutageList
          outages={outages}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>
    </main>
  );
}
