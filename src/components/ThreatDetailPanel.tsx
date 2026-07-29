"use client";

import type { ThreatEvent } from "@/lib/types";
import { threatImpactLine, threatConfidenceLabel } from "@/lib/interpret";
import { X, MapPin, Server, Clock, ShieldAlert, CircleHelp, CircleCheck } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toUTCString().replace("GMT", "UTC");
}

const KIND_TITLE: Record<string, string> = {
  bgp_hijack: "Possible BGP hijack",
  bgp_leak: "BGP route leak",
  attack_l3: "Network-layer attack origin",
  attack_l7: "Web application attack origin",
};

const KIND_COLOR: Record<string, string> = {
  bgp_hijack: "#FF4D4F",
  bgp_leak: "#FFB020",
  attack_l3: "#B084FF",
  attack_l7: "#B084FF",
};

export function ThreatDetailPanel({ threat, onClose }: { threat: ThreatEvent | null; onClose: () => void }) {
  if (!threat) {
    return (
      <aside className="hidden h-full w-[320px] flex-col items-center justify-center border-l border-[#1E2734] bg-[#0B0F16] px-8 text-center lg:flex">
        <ShieldAlert size={22} className="mb-3 text-[#3A4553]" />
        <p className="font-mono text-[11px] leading-relaxed text-[#5B6572]">
          Select a threat from the feed or map for details.
        </p>
      </aside>
    );
  }

  const confidence = threatConfidenceLabel(threat);
  const color = KIND_COLOR[threat.kind];

  return (
    <aside className="flex h-full w-full flex-col border-l border-[#1E2734] bg-[#0B0F16] sm:w-[320px]">
      <div className="flex items-center justify-between border-b border-[#1E2734] px-4 py-3">
        <span className="font-mono text-[10px] tracking-widest text-[#5B6572]">THREAT DETAIL</span>
        <button onClick={onClose} className="text-[#5B6572] hover:text-[#E7E9EC]" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <h2 className="font-mono text-[13px] font-semibold text-[#E7E9EC]">{KIND_TITLE[threat.kind]}</h2>
        </div>

        <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-[#5B6572]">Technical</p>
        <p className="mt-1 font-sans text-[12px] leading-relaxed text-[#8A93A0]">{threat.title}</p>

        <div className="mt-3 rounded-sm border border-[#1E2734] bg-[#0F141C] p-3">
          <p className="font-sans text-[13px] leading-relaxed text-[#E7E9EC]">{threatImpactLine(threat)}</p>
        </div>

        {(threat.sourceLabel || threat.destinationLabel) && (
          <div className="mt-3 space-y-2 rounded-sm border border-[#1E2734] bg-[#0F141C] p-3 font-mono text-[11px]">
            {threat.sourceLabel && (
              <div className="flex items-start gap-2">
                <span className="w-16 shrink-0 text-[#5B6572]">SOURCE</span>
                <span className="text-[#E7E9EC]">{threat.sourceLabel}</span>
              </div>
            )}
            {threat.destinationLabel && (
              <div className="flex items-start gap-2">
                <span className="w-16 shrink-0 text-[#5B6572]">
                  {threat.kind.startsWith("attack") ? "TARGET" : "AFFECTED"}
                </span>
                <span className="text-[#E7E9EC]">{threat.destinationLabel}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          {confidence.tone === "confirmed" ? (
            <CircleCheck size={12} className="text-[#43D9C8]" />
          ) : (
            <CircleHelp size={12} className="text-[#FFB020]" />
          )}
          <span
            className={`font-mono text-[10px] ${confidence.tone === "confirmed" ? "text-[#43D9C8]" : "text-[#FFB020]"}`}
          >
            {confidence.label}
          </span>
        </div>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-wide text-[#5B6572]">
          Cloudflare's description
        </p>
        <p className="mt-1 font-sans text-[12px] leading-relaxed text-[#8A93A0]">{threat.description}</p>

        <div className="mt-5 space-y-3 font-mono text-[11px]">
          <div className="flex items-start gap-2">
            <MapPin size={13} className="mt-0.5 shrink-0 text-[#5B6572]" />
            <span className="text-[#C4CAD2]">{threat.location?.name ?? "Location not specified"}</span>
          </div>
          {threat.asns.length > 0 && (
            <div className="flex items-start gap-2">
              <Server size={13} className="mt-0.5 shrink-0 text-[#5B6572]" />
              <span className="text-[#C4CAD2]">
                {threat.asns.map((a) => `AS${a.asn} ${a.name}`).join(", ")}
              </span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Clock size={13} className="mt-0.5 shrink-0 text-[#5B6572]" />
            <span className="text-[#C4CAD2]">Detected {formatDate(threat.detectedAt)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
