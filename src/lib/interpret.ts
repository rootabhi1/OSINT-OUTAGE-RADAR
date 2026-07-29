import type { NormalizedOutage, ThreatEvent } from "./types";

const OUTAGE_CAUSE_LABELS: Record<string, string> = {
  CABLE_CUT: "an undersea or terrestrial cable cut",
  POWER_OUTAGE: "a power grid failure",
  GOVERNMENT_DIRECTED: "a government-directed shutdown",
  WEATHER: "severe weather or a natural disaster",
  NATURAL_DISASTER: "a natural disaster",
  MAINTENANCE: "scheduled network maintenance",
  FILTERING: "network filtering or blocking",
  BLOCKING: "network filtering or blocking",
  TECHNICAL_PROBLEMS: "a technical/infrastructure fault",
  MILITARY_ACTION: "military action",
  UNKNOWN: "an unconfirmed cause",
};

export function outageCauseLabel(cause?: string): string | null {
  if (!cause) return null;
  return OUTAGE_CAUSE_LABELS[cause.toUpperCase()] ?? cause.toLowerCase().replaceAll("_", " ");
}

/**
 * Cloudflare Radar's raw fields (scope: "NATIONAL", source: "anomaly", etc.)
 * are precise but meaningless to someone without networking background.
 * These helpers translate them into plain sentences a general user can
 * actually act on or understand at a glance.
 */

export function scopeLabel(outage: NormalizedOutage): string {
  if (outage.source === "anomaly") {
    if (outage.eventType === "AS") return "One network affected";
    if (outage.eventType === "ORIGIN") return "One origin/service affected";
    return "One location affected";
  }
  const s = (outage.outageType ?? "").toUpperCase();
  if (s.includes("NATIONWIDE") || s.includes("NATIONAL") || s.includes("COUNTRY")) return "Entire country affected";
  if (s.includes("REGIONAL") || s.includes("LOCAL")) return "Part of the country affected";
  return "Scope unclear";
}

export function confidenceLabel(outage: NormalizedOutage): {
  label: string;
  tone: "confirmed" | "unconfirmed";
} {
  if (outage.source === "outage") {
    return { label: "Confirmed by Cloudflare's analysts", tone: "confirmed" };
  }
  return {
    label: "Automatically detected — not yet human-confirmed",
    tone: "unconfirmed",
  };
}

/**
 * A single, plain-English sentence explaining what this event actually
 * means for someone trying to understand internet access in that place —
 * distinct from the raw `description`, which is often just restating the
 * event type. Uses Cloudflare's real classification fields (outageType,
 * outageCause) rather than guessing from free-text scope.
 */
export function impactLine(outage: NormalizedOutage): string {
  const place = outage.locations[0]?.name ?? "the affected area";
  const ongoing = !outage.endDate;
  const cause = outageCauseLabel(outage.outageCause);
  const causePhrase = cause ? `, attributed to ${cause}` : "";

  if (outage.source === "anomaly") {
    const verified = outage.verificationStatus === "VERIFIED";
    return ongoing
      ? `Traffic from ${place} looks abnormal right now${verified ? " and Cloudflare's team has confirmed this" : ""}. ${
          verified ? "" : "This alone doesn't confirm an outage — it's an algorithmic signal worth watching."
        }`.trim()
      : `Traffic from ${place} looked abnormal for a period, then returned to normal.${
          verified ? " Cloudflare's team confirmed this as a real event." : " No outage was confirmed."
        }`;
  }

  const type = (outage.outageType ?? "").toUpperCase();
  if (type.includes("NATIONWIDE") || type.includes("NATIONAL") || type.includes("COUNTRY")) {
    return ongoing
      ? `Most people in ${place} likely can't reach the internet right now${causePhrase}.`
      : `Most people in ${place} were likely unable to reach the internet for a period${causePhrase}. Access has since been restored.`;
  }
  if (type.includes("REGIONAL") || type.includes("LOCAL")) {
    return ongoing
      ? `Internet access is likely disrupted in part of ${place} right now${causePhrase}, not the whole country.`
      : `Internet access was likely disrupted in part of ${place} for a period${causePhrase}. It has since recovered.`;
  }
  if (outage.asns.length > 0) {
    return ongoing
      ? `Customers of ${outage.asns[0].name} in ${place} likely can't get online${causePhrase} — others in the same country are probably unaffected.`
      : `Customers of one specific internet provider in ${place} were likely affected for a period. Service has since recovered.`;
  }
  return ongoing
    ? `An outage is ongoing in ${place}; exact reach is unclear from available data.`
    : `An outage occurred in ${place} and has since resolved; exact reach was unclear from available data.`;
}

export function threatConfidenceLabel(t: ThreatEvent): { label: string; tone: "confirmed" | "unconfirmed" } {
  if (t.kind === "bgp_hijack") {
    const c = t.confidence ?? 0;
    if (c >= 8) return { label: "High confidence — likely a real hijack", tone: "confirmed" };
    if (c >= 4) return { label: "Medium confidence — worth watching", tone: "unconfirmed" };
    return { label: "Low confidence — often a false alarm", tone: "unconfirmed" };
  }
  if (t.kind === "bgp_leak") {
    return { label: "Automatically detected route leak", tone: "unconfirmed" };
  }
  return { label: "Aggregated attack traffic share, not a discrete event", tone: "unconfirmed" };
}

export function threatImpactLine(t: ThreatEvent): string {
  const place = t.location?.name ?? "an unspecified location";
  switch (t.kind) {
    case "bgp_hijack":
      return `Internet traffic meant for one network may have been briefly rerouted through a network in ${place} — which can mean anything from a misconfiguration to interception.`;
    case "bgp_leak":
      return `A network in ${place} accidentally re-broadcast routes it shouldn't have, which can cause temporary slowdowns or instability for traffic passing through it.`;
    case "attack_l3":
      return `${place} was a top source of network-level DDoS attack traffic in the last 24 hours (${t.shareValue}% of the global total).`;
    case "attack_l7":
      return `${place} was a top source of web-application attack traffic in the last 24 hours (${t.shareValue}% of the global total).`;
    default:
      return t.description;
  }
}
