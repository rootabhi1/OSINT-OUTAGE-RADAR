"use client";

import type { NormalizedOutage } from "@/lib/types";
import { SignalTrace } from "./SignalTrace";
import { X, MapPin, Server, Clock, ExternalLink, ShieldAlert } from "lucide-react";

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical outage",
  elevated: "Elevated disruption",
  minor: "Traffic anomaly",
};

function formatDate(iso: string) {
  return new Date(iso).toUTCString().replace("GMT", "UTC");
}

function duration(start: string, end: string | null) {
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  const mins = Math.floor((endMs - startMs) / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} hr ${mins % 60} min`;
  return `${Math.floor(hrs / 24)} days`;
}

export function DetailPanel({
  outage,
  onClose,
}: {
  outage: NormalizedOutage | null;
  onClose: () => void;
}) {
  if (!outage) {
    return (
      <aside className="hidden h-full w-[320px] flex-col items-center justify-center border-l border-[#1E2734] bg-[#0B0F16] px-8 text-center lg:flex">
        <ShieldAlert size={22} className="mb-3 text-[#3A4553]" />
        <p className="font-mono text-[11px] leading-relaxed text-[#5B6572]">
          Select an event from the feed or map to inspect its signal trace and affected
          infrastructure.
        </p>
      </aside>
    );
  }

  const live = !outage.endDate;

  return (
    <aside className="flex h-full w-full flex-col border-l border-[#1E2734] bg-[#0B0F16] sm:w-[320px]">
      <div className="flex items-center justify-between border-b border-[#1E2734] px-4 py-3">
        <span className="font-mono text-[10px] tracking-widest text-[#5B6572]">
          EVENT DETAIL
        </span>
        <button onClick={onClose} className="text-[#5B6572] hover:text-[#E7E9EC]" aria-label="Close detail panel">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${live ? "animate-pulse" : ""}`}
            style={{
              backgroundColor:
                outage.severity === "critical" ? "#FF4D4F" : outage.severity === "elevated" ? "#FFB020" : "#43D9C8",
            }}
          />
          <h2 className="font-mono text-[13px] font-semibold text-[#E7E9EC]">
            {SEVERITY_LABEL[outage.severity]}
          </h2>
        </div>

        <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[#5B6572]">
          {outage.eventType.replaceAll("_", " ")} · {outage.scope.replaceAll("_", " ")}
        </p>

        <div className="mt-4 rounded-sm border border-[#1E2734] bg-[#0F141C] p-3">
          <SignalTrace severity={outage.severity} resolved={!live} width={260} height={48} />
        </div>

        <p className="mt-4 font-sans text-[12.5px] leading-relaxed text-[#C4CAD2]">
          {outage.description}
        </p>

        <div className="mt-5 space-y-3 font-mono text-[11px]">
          <div className="flex items-start gap-2">
            <MapPin size={13} className="mt-0.5 shrink-0 text-[#5B6572]" />
            <span className="text-[#C4CAD2]">
              {outage.locations.length > 0
                ? outage.locations.map((l) => l.name).join(", ")
                : "Location not specified"}
            </span>
          </div>
          {outage.asns.length > 0 && (
            <div className="flex items-start gap-2">
              <Server size={13} className="mt-0.5 shrink-0 text-[#5B6572]" />
              <span className="text-[#C4CAD2]">
                {outage.asns.map((a) => `AS${a.asn} ${a.name}`).join(", ")}
              </span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Clock size={13} className="mt-0.5 shrink-0 text-[#5B6572]" />
            <div className="text-[#C4CAD2]">
              <div>Started {formatDate(outage.startDate)}</div>
              <div className="mt-0.5 text-[#8A93A0]">
                {live ? `Ongoing · ${duration(outage.startDate, null)} so far` : `Duration: ${duration(outage.startDate, outage.endDate)}`}
              </div>
            </div>
          </div>
        </div>

        {outage.linkedUrl && (
          <a
            href={outage.linkedUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center gap-1.5 font-mono text-[11px] text-[#43D9C8] hover:underline"
          >
            View source report <ExternalLink size={11} />
          </a>
        )}
      </div>
    </aside>
  );
}
