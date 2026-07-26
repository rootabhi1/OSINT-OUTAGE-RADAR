import type { NormalizedOutage, ThreatEvent } from "./types";

/**
 * Cloudflare Radar's raw fields (scope: "NATIONAL", source: "anomaly", etc.)
 * are precise but meaningless to someone without networking background.
 * These helpers translate them into plain sentences a general user can
 * actually act on or understand at a glance.
 */

export function scopeLabel(scope: string): string {
  const s = scope.toUpperCase();
  if (s.includes("NATIONAL") || s.includes("COUNTRY")) return "Entire country affected";
  if (s.includes("REGIONAL")) return "Part of the country affected";
  if (s.includes("NETWORK")) return "One internet provider affected";
  if (s.includes("LOCATION")) return "A specific area affected";
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
 * event type.
 */
export function impactLine(outage: NormalizedOutage): string {
  const place = outage.locations[0]?.name ?? "the affected area";
  const ongoing = !outage.endDate;

  if (outage.source === "anomaly") {
    return ongoing
      ? `Traffic from ${place} looks abnormal right now. This alone doesn't confirm an outage — it's a signal worth watching.`
      : `Traffic from ${place} looked abnormal for a period, then returned to normal. No outage was confirmed.`;
  }

  const scope = outage.scope.toUpperCase();
  if (scope.includes("NATIONAL") || scope.includes("COUNTRY")) {
    return ongoing
      ? `Most people in ${place} likely can't reach the internet right now.`
      : `Most people in ${place} were likely unable to reach the internet for a period. Access has since been restored.`;
  }
  if (scope.includes("REGIONAL")) {
    return ongoing
      ? `Internet access is likely disrupted in part of ${place} right now, not the whole country.`
      : `Internet access was likely disrupted in part of ${place} for a period. It has since recovered.`;
  }
  if (scope.includes("NETWORK")) {
    return ongoing
      ? `Customers of one specific internet provider in ${place} likely can't get online — others in the same country are probably unaffected.`
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
