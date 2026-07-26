"use client";

import { useState, useRef, useEffect } from "react";
import type { ScanResult } from "@/lib/types";
import { Search, AlertCircle, ShieldCheck, ShieldAlert, ExternalLink, Loader2 } from "lucide-react";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60_000;

export function InvestigatePanel() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  async function submit() {
    if (!url.trim()) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Scan submission failed.");
        setSubmitting(false);
        return;
      }

      const uuid = json.uuid;
      setResult({ status: "pending", uuid, submittedUrl: url.trim() });

      const startedAt = Date.now();
      pollRef.current = setInterval(async () => {
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          if (pollRef.current) clearInterval(pollRef.current);
          setError("Scan is taking longer than expected. It may still finish — try again shortly.");
          setSubmitting(false);
          return;
        }
        try {
          const pollRes = await fetch(`/api/scan?uuid=${uuid}`);
          const pollJson: ScanResult = await pollRes.json();
          if (pollJson.status === "done" || pollJson.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setSubmitting(false);
            setResult(pollJson);
          }
        } catch {
          // transient — keep polling until timeout
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit scan.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#0B0F16]">
      <div className="border-b border-[#1E2734] px-5 py-4">
        <h2 className="font-mono text-[13px] font-semibold text-[#E7E9EC]">Investigate a URL</h2>
        <p className="mt-1 font-sans text-[12px] leading-relaxed text-[#8A93A0]">
          Cloudflare visits the page in an isolated browser and reports what it finds — security
          verdict, hosting details, and a live screenshot. Scans are submitted as{" "}
          <span className="text-[#8A93A0]">unlisted</span> (not publicly searchable).
        </p>
        <div className="mt-4 flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="https://example.com"
            className="flex-1 rounded-sm border border-[#2A3543] bg-[#0F141C] px-3 py-2 font-mono text-[12px] text-[#E7E9EC] placeholder:text-[#5B6572] outline-none focus:border-[#43D9C8]"
          />
          <button
            onClick={submit}
            disabled={submitting || !url.trim()}
            className="flex items-center gap-1.5 rounded-sm bg-[#FFB020] px-4 py-2 font-mono text-[11px] font-semibold text-[#14100a] disabled:opacity-40"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {submitting ? "SCANNING…" : "SCAN"}
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 py-4">
        {error && (
          <div className="flex items-start gap-2 rounded-sm border border-[#FF4D4F]/30 bg-[#FF4D4F]/5 px-3 py-2.5 font-mono text-[11px] text-[#FF4D4F]">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {!error && !result && (
          <p className="font-mono text-[11px] text-[#5B6572]">
            Enter a URL above to see its security verdict, hosting info, and a screenshot.
          </p>
        )}

        {result?.status === "pending" && (
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#8A93A0]">
            <Loader2 size={13} className="animate-spin text-[#FFB020]" />
            Scanning {result.submittedUrl}… this usually takes 10&ndash;30 seconds.
          </div>
        )}

        {result?.status === "done" && (
          <div className="space-y-4">
            <div
              className={`flex items-center gap-2 rounded-sm border px-3 py-2.5 font-mono text-[12px] ${
                result.verdictMalicious
                  ? "border-[#FF4D4F]/30 bg-[#FF4D4F]/5 text-[#FF4D4F]"
                  : "border-[#43D9C8]/30 bg-[#43D9C8]/5 text-[#43D9C8]"
              }`}
            >
              {result.verdictMalicious ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
              {result.verdictMalicious
                ? "Flagged as potentially malicious"
                : "No malicious indicators detected"}
            </div>

            {result.screenshotUrl && (
              <img
                src={result.screenshotUrl}
                alt="Page screenshot"
                className="w-full rounded-sm border border-[#1E2734]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}

            <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
              <InfoRow label="Final URL" value={result.finalUrl ?? result.submittedUrl} />
              <InfoRow label="IP address" value={result.ip ?? "—"} />
              <InfoRow
                label="Network"
                value={result.asn ? `AS${result.asn}${result.asnName ? ` (${result.asnName})` : ""}` : "—"}
              />
              <InfoRow label="Country" value={result.country ?? "—"} />
            </div>

            {result.technologies && result.technologies.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-[#5B6572]">
                  Technologies detected
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {result.technologies.map((t, i) => (
                    <span
                      key={i}
                      className="rounded-sm border border-[#1E2734] bg-[#0F141C] px-2 py-1 font-mono text-[10px] text-[#C4CAD2]"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.reportUrl && (
              <a
                href={result.reportUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 font-mono text-[11px] text-[#43D9C8] hover:underline"
              >
                Full report on Cloudflare Radar <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}

        {result?.status === "failed" && (
          <div className="flex items-start gap-2 rounded-sm border border-[#FF4D4F]/30 bg-[#FF4D4F]/5 px-3 py-2.5 font-mono text-[11px] text-[#FF4D4F]">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            {result.error ?? "Scan failed."}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-[#5B6572]">{label}</p>
      <p className="mt-0.5 truncate text-[#E7E9EC]" title={value}>
        {value}
      </p>
    </div>
  );
}
