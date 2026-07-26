"use client";

import { AlertTriangle, Radar, Search } from "lucide-react";

export type Mode = "outages" | "threats" | "investigate";

const TABS: { mode: Mode; label: string; icon: any }[] = [
  { mode: "outages", label: "OUTAGES", icon: AlertTriangle },
  { mode: "threats", label: "THREATS", icon: Radar },
  { mode: "investigate", label: "INVESTIGATE", icon: Search },
];

export function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex border-b border-[#1E2734] bg-[#0A0D12]">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = mode === t.mode;
        return (
          <button
            key={t.mode}
            onClick={() => onChange(t.mode)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 font-mono text-[10.5px] tracking-wide transition-colors ${
              active
                ? "border-[#FFB020] text-[#E7E9EC]"
                : "border-transparent text-[#5B6572] hover:text-[#8A93A0]"
            }`}
          >
            <Icon size={12} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
