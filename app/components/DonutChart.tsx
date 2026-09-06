export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  /** Large text in the centre of the ring. */
  centerPrimary: string;
  /** Smaller text under the primary line. */
  centerSecondary?: string;
  /**
   * Draw a marker tick on the ring at this fraction of the total (0-1), e.g.
   * 270/538 for the electoral-college majority or 51/100 for a Senate majority.
   */
  majorityFraction?: number;
  majorityLabel?: string;
  size?: number;
  thickness?: number;
  /** Show the swatch + value list under the ring (default true). */
  showLegend?: boolean;
}

/**
 * A compact SVG donut. Segments are drawn with the classic stroke-dasharray
 * technique (a single <circle> per segment, offset around the ring) so there is
 * no arc-path math to get wrong. Segments start at 12 o'clock and go clockwise.
 */
export function DonutChart({
  segments,
  centerPrimary,
  centerSecondary,
  majorityFraction,
  majorityLabel,
  size = 176,
  thickness = 22,
  showLegend = true,
}: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const gap = total > 0 ? Math.min(2, circumference / 400) : 0;

  let offset = 0;
  const rings = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = s.value / total;
      const len = Math.max(frac * circumference - gap, 0);
      const node = (
        <circle
          key={s.label}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={thickness}
          strokeDasharray={`${len} ${circumference - len}`}
          strokeDashoffset={-offset}
          transform={`rotate(-90 ${cx} ${cy})`}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-bold leading-tight text-gray-900 dark:text-gray-50">
            {centerPrimary}
          </span>
          {centerSecondary && (
            <span className="mt-0.5 text-[11px] leading-tight text-gray-500 dark:text-gray-400">
              {centerSecondary}
            </span>
          )}
        </div>
      </div>
      {majorityLabel && (
        <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
          {majorityLabel}
        </p>
      )}
      <div
        className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs"
        hidden={!showLegend}
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-sm border border-black/10"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {s.value} {s.label}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
