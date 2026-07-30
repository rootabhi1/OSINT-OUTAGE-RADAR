"use client";

import type { NormalizedOutage } from "@/lib/types";
import { SignalTrace } from "./SignalTrace";
import { impactLine } from "@/lib/interpret";
import { primaryLabel } from "@/lib/interpret";
import { AlertTriangle, Activity, Radio } from "lucide-react";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-[#FF4D4F] border-[#FF4D4F]/30 bg-[#FF4D4F]/5",
  elevated: "text-[#FFB020] border-[#FFB020]/30 bg-[#FFB020]/5",
  minor: "text-[#43D9C8] border-[#43D9C8]/30 bg-[#43D9C8]/5",
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function OutageList({
  outages,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
}: {
  outages: NormalizedOutage[];
  selectedId: string | null;
  onSelect: (o: NormalizedOutage) => void;
  filter: "all" | "ongoing" | "resolved";
  onFilterChange: (f: "all" | "ongoing" | "resolved") => void;
}) {
  const filtered = outages.filter((o) => {
    if (filter === "ongoing") return !o.endDate;
    if (filter === "resolved") return !!o.endDate;
    return true;
  });

  return (
    <aside className="flex h-full w-full flex-col border-r border-[#1E2734] bg-[#0B0F16] sm:w-[340px]">
      <div className="flex items-center gap-1 border-b border-[#1E2734] px-3 py-2">
        {(["all", "ongoing", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`rounded-sm px-2.5 py-1 font-mono text-[10px] tracking-wide transition-colors ${
              filter === f
                ? "bg-[#1E2734] text-[#E7E9EC]"
                : "text-[#5B6572] hover:text-[#8A93A0]"
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-[#5B6572]">{filtered.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Radio size={20} className="text-[#3A4553]" />
            <p className="font-mono text-[11px] text-[#5B6572]">
              No events match this filter right now.
            </p>
          </div>
        )}
        {filtered.map((o) => {
          const isSelected = o.id === selectedId;
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o)}
              className={`block w-full border-b border-[#161B24] px-3 py-3 text-left transition-colors ${
                isSelected ? "bg-[#131922]" : "hover:bg-[#10151D]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {o.source === "outage" ? (
                    <AlertTriangle size={12} className={SEVERITY_STYLES[o.severity].split(" ")[0]} />
                  ) : (
                    <Activity size={12} className={SEVERITY_STYLES[o.severity].split(" ")[0]} />
                  )}
                  <span className="font-mono text-[12px] font-medium text-[#E7E9EC]">
                    {primaryLabel(o)}
                  </span>
                </div>
                <span
                  className={`rounded-sm border px-1.5 py-0.5 font-mono text-[9px] tracking-wide ${SEVERITY_STYLES[o.severity]}`}
                >
                  {o.endDate ? "RESOLVED" : "LIVE"}
                </span>
              </div>

              <p className="mt-1 line-clamp-2 font-sans text-[11px] leading-relaxed text-[#C4CAD2]">
                {impactLine(o)}
              </p>

              <div className="mt-2 flex items-center justify-between">
                <SignalTrace severity={o.severity} resolved={!!o.endDate} width={100} height={20} />
                <span className="font-mono text-[9px] text-[#5B6572]">{timeAgo(o.startDate)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
