"use client";

import { useEffect, useState } from "react";
import { RadioTower } from "lucide-react";

export function TopBar({
  total,
  ongoing,
  demo,
  lastUpdated,
}: {
  total: number;
  ongoing: number;
  demo: boolean;
  lastUpdated: string | null;
}) {
  const [utc, setUtc] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setUtc(now.toISOString().slice(11, 19) + " Z");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-[#1E2734] bg-[#0A0D12]/95 px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#FFB020]/40 bg-[#FFB020]/10">
          <RadioTower size={16} className="text-[#FFB020]" strokeWidth={2} />
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FFB020]/20" />
        </div>
        <div>
          <h1 className="font-mono text-[13px] font-semibold tracking-[0.18em] text-[#E7E9EC]">
            SIGNAL&nbsp;LOSS
          </h1>
          <p className="font-mono text-[10px] tracking-[0.14em] text-[#5B6572]">
            CRITICAL INFRASTRUCTURE OUTAGE RADAR
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-6 font-mono text-[11px] text-[#8A93A0] sm:flex">
        <div className="flex flex-col items-end">
          <span className="text-[#5B6572]">TRACKED</span>
          <span className="text-[#E7E9EC]">{total.toString().padStart(3, "0")}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[#5B6572]">ONGOING</span>
          <span className={ongoing > 0 ? "text-[#FF4D4F]" : "text-[#E7E9EC]"}>
            {ongoing.toString().padStart(3, "0")}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[#5B6572]">UTC</span>
          <span className="text-[#43D9C8]">{utc || "--:--:-- Z"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {demo && (
          <span className="rounded-sm border border-[#FFB020]/40 px-2 py-1 font-mono text-[10px] tracking-wide text-[#FFB020]">
            SAMPLE DATA
          </span>
        )}
        <span className="hidden font-mono text-[10px] text-[#5B6572] md:inline">
          {lastUpdated ? `SYNCED ${new Date(lastUpdated).toISOString().slice(11, 19)} Z` : "SYNCING…"}
        </span>
      </div>
    </header>
  );
}
