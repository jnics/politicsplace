import { useState } from "react";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  /** State codes this segment represents, for highlighting on the map. */
  states?: string[];
}

export interface DonutChartProps {
  segments: DonutSegment[];
  /** Large text in the centre of the ring. */
  centerPrimary: string;
  /** Smaller text under the primary line. */
  centerSecondary?: string;
  /**
   * Small proportional bar drawn inside the ring, e.g. the D / toss-up / R
   * split of the chamber. Rendered under the centre text.
   */
  centerBar?: DonutSegment[];
  /**
   * Draw a marker tick on the ring at this fraction of the total (0-1), e.g.
   * 270/538 for the electoral-college majority or 51/100 for a Senate majority.
   */
  majorityFraction?: number;
  majorityLabel?: string;
  size?: number;
  thickness?: number;
  /** Called as the pointer moves on/off a segment (null = off). */
  onSegmentHover?: (segment: DonutSegment | null) => void;
}

/**
 * A compact SVG donut. Segments are drawn with the classic stroke-dasharray
 * technique (a single <circle> per segment, offset around the ring) so there is
 * no arc-path math to get wrong. Segments start at 12 o'clock and go clockwise.
 * Hovering a segment shows its count/share and reports it to `onSegmentHover`.
 */
export function DonutChart({
  segments,
  centerPrimary,
  centerSecondary,
  centerBar,
  majorityFraction,
  majorityLabel,
  size = 176,
  thickness = 22,
  onSegmentHover,
}: DonutChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const gap = total > 0 ? Math.min(2, circumference / 400) : 0;

  const visible = segments
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.value > 0);

  function setHover(next: number | null) {
    setHovered(next);
    onSegmentHover?.(next === null ? null : segments[next]);
  }

  let offset = 0;
  const rings = visible.map(({ s, i }) => {
    const frac = s.value / total;
    const len = Math.max(frac * circumference - gap, 0);
    const dim = hovered !== null && hovered !== i;
    const node = (
      <circle
        key={s.label}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth={hovered === i ? thickness + 5 : thickness}
        strokeDasharray={`${len} ${circumference - len}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        opacity={dim ? 0.35 : 1}
        style={{ cursor: "pointer", transition: "opacity 120ms, stroke-width 120ms" }}
        onMouseEnter={() => setHover(i)}
        onMouseLeave={() => setHover(null)}
      />
    );
    offset += frac * circumference;
    return node;
  });

  // Majority tick: a short radial line straddling the ring.
  let majorityTick: React.ReactNode = null;
  if (majorityFraction !== undefined && total > 0) {
    const angle = majorityFraction * 2 * Math.PI - Math.PI / 2;
    const inner = r - thickness / 2 - 2;
    const outer = r + thickness / 2 + 2;
    majorityTick = (
      <line
        x1={cx + inner * Math.cos(angle)}
        y1={cy + inner * Math.sin(angle)}
        x2={cx + outer * Math.cos(angle)}
        y2={cy + outer * Math.sin(angle)}
        className="stroke-gray-900 dark:stroke-white"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    );
  }

  const hoveredSeg = hovered !== null ? segments[hovered] : null;
  const barTotal = centerBar?.reduce((sum, s) => sum + s.value, 0) ?? 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            strokeWidth={thickness}
            className="stroke-gray-200 dark:stroke-gray-800"
          />
          {rings}
          {majorityTick}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="text-lg font-bold leading-tight text-gray-900 dark:text-gray-50">
            {centerPrimary}
          </span>
          {centerBar && barTotal > 0 && (
            <div className="mt-1 flex h-1.5 w-16 overflow-hidden rounded-full">
              {centerBar
                .filter((s) => s.value > 0)
                .map((s) => (
                  <span
                    key={s.label}
                    style={{ width: `${(s.value / barTotal) * 100}%`, backgroundColor: s.color }}
                  />
                ))}
            </div>
          )}
          {centerSecondary && (
            <span className="mt-1 text-[11px] leading-tight text-gray-500 dark:text-gray-400">
              {centerSecondary}
            </span>
          )}
        </div>

        {hoveredSeg && (
          <div className="pointer-events-none absolute left-1/2 top-full z-10 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle"
              style={{ backgroundColor: hoveredSeg.color }}
            />
            {hoveredSeg.label}: <span className="font-semibold">{hoveredSeg.value}</span>
            {total > 0 && (
              <span className="opacity-70">
                {" "}
                ({Math.round((hoveredSeg.value / total) * 100)}%)
              </span>
            )}
          </div>
        )}
      </div>
      {majorityLabel && (
        <p className="mt-4 text-[11px] text-gray-500 dark:text-gray-400">{majorityLabel}</p>
      )}
    </div>
  );
}
