"use client";

import type { ThreatEvent } from "@/lib/types";
import { threatImpactLine, threatConfidenceLabel } from "@/lib/interpret";
import { Waypoints, GitBranch, Radar } from "lucide-react";

const KIND_STYLE: Record<string, string> = {
  bgp_hijack: "text-[#FF4D4F] border-[#FF4D4F]/30 bg-[#FF4D4F]/5",
  bgp_leak: "text-[#FFB020] border-[#FFB020]/30 bg-[#FFB020]/5",
  attack_l3: "text-[#B084FF] border-[#B084FF]/30 bg-[#B084FF]/5",
  attack_l7: "text-[#B084FF] border-[#B084FF]/30 bg-[#B084FF]/5",
};

const KIND_ICON: Record<string, any> = {
  bgp_hijack: Waypoints,
  bgp_leak: GitBranch,
  attack_l3: Radar,
  attack_l7: Radar,
};

const KIND_LABEL: Record<string, string> = {
  bgp_hijack: "BGP HIJACK",
  bgp_leak: "ROUTE LEAK",
  attack_l3: "DDOS ORIGIN",
  attack_l7: "WEB ATTACK ORIGIN",
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ThreatList({
  threats,
  selectedId,
  onSelect,
}: {
  threats: ThreatEvent[];
  selectedId: string | null;
  onSelect: (t: ThreatEvent) => void;
}) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-[#1E2734] bg-[#0B0F16] sm:w-[340px]">
      <div className="flex items-center border-b border-[#1E2734] px-3 py-2">
        <span className="font-mono text-[10px] tracking-wide text-[#5B6572]">
          BGP HIJACKS · ROUTE LEAKS · ATTACK ORIGINS
        </span>
        <span className="ml-auto font-mono text-[10px] text-[#5B6572]">{threats.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {threats.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Radar size={20} className="text-[#3A4553]" />
            <p className="font-mono text-[11px] text-[#5B6572]">No threat events right now.</p>
          </div>
        )}
        {threats.map((t) => {
          const isSelected = t.id === selectedId;
          const Icon = KIND_ICON[t.kind] ?? Radar;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className={`block w-full border-b border-[#161B24] px-3 py-3 text-left transition-colors ${
                isSelected ? "bg-[#131922]" : "hover:bg-[#10151D]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Icon size={12} className={KIND_STYLE[t.kind].split(" ")[0]} />
                  <span className="font-mono text-[12px] font-medium text-[#E7E9EC]">
                    {t.location?.name ?? "Unknown location"}
                  </span>
                </div>
                <span
                  className={`rounded-sm border px-1.5 py-0.5 font-mono text-[9px] tracking-wide ${KIND_STYLE[t.kind]}`}
                >
                  {KIND_LABEL[t.kind]}
                </span>
              </div>

              <p className="mt-1 line-clamp-2 font-sans text-[11px] leading-relaxed text-[#C4CAD2]">
                {threatImpactLine(t)}
              </p>

              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[9px] text-[#5B6572]">
                  {threatConfidenceLabel(t).label}
                </span>
                <span className="font-mono text-[9px] text-[#5B6572]">{timeAgo(t.detectedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
