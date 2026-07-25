const SEVERITY_COLOR: Record<string, string> = {
  critical: "#FF4D4F",
  elevated: "#FFB020",
  minor: "#43D9C8",
};

/**
 * Draws a steady waveform that collapses into a flat or noisy line at the
 * point signal was lost, then — if the outage has resolved — recovers back
 * into a clean waveform. This is the dashboard's signature visual: an outage
 * isn't a dot on a map, it's a dropped transmission.
 */
export function SignalTrace({
  severity,
  resolved,
  width = 120,
  height = 28,
}: {
  severity: "critical" | "elevated" | "minor";
  resolved: boolean;
  width?: number;
  height?: number;
}) {
  const color = SEVERITY_COLOR[severity] ?? SEVERITY_COLOR.minor;
  const dropAt = resolved ? width * 0.38 : width * 0.55;
  const recoverAt = width * 0.82;
  const mid = height / 2;
  const amp = height * 0.32;

  const points: string[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    let y: number;
    if (x < dropAt) {
      y = mid + Math.sin((x / width) * Math.PI * 6) * amp;
    } else if (!resolved || x < recoverAt) {
      // flat/noisy dead segment
      const noise = severity === "critical" ? (i % 2 === 0 ? 1 : -1) * amp * 0.15 : 0;
      y = mid + noise;
    } else {
      const t = (x - recoverAt) / (width - recoverAt);
      y = mid + Math.sin((x / width) * Math.PI * 6) * amp * t;
    }
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      <line
        x1={dropAt}
        y1={2}
        x2={dropAt}
        y2={height - 2}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="2,2"
        opacity={0.35}
      />
    </svg>
  );
}
