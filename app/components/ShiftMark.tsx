// Shared shift-arrow marker for StateZoom (county/district/precinct) and
// UsMap (national, state-level) — kept in one place so both overlays scale
// and color swings identically.

/** Arrow half-length for a swing of `pts` points, given the shapes' typical
 *  size (see callers for how `unit` is derived — roughly the sqrt of
 *  viewBox-area-per-shape). Most real swings are single digits, so the scale
 *  tops out at 20 pts rather than 30 — a bigger swing still reads as bigger,
 *  it just doesn't need the full range to show. */
export function shiftArrowLen(unit: number, pts: number): number {
  const capped = Math.min(Math.abs(pts), 20);
  return Math.max(unit * 0.18, (capped / 20) * unit * 0.9);
}

/**
 * A shift marker at (cx, cy): a horizontal arrow (left = shifted D/blue,
 * right = shifted R/red) sized to the swing, for anything 0.3 points or
 * bigger. Below that, `shiftArrowLen`'s own length floor would draw the same
 * size arrow as a real few-point swing — misleading — so instead this draws
 * a short vertical tick in the same color: still visible, but unmistakably
 * "barely moved here" rather than a real directional shift.
 */
export function ShiftMark({
  cx,
  cy,
  swing,
  unit,
  scale = 1,
  tieWinner,
}: {
  cx: number;
  cy: number;
  swing: number;
  unit: number;
  /** Shrinks the whole marker (tick and arrow alike) without changing how it
   *  scales with the swing itself — precincts pass a smaller value than
   *  county/district/state, since the same absolute size that reads fine one
   *  shape per county looks big and fat once shapes are precinct-sized. */
  scale?: number;
  /** Who currently holds this shape — the tiebreaker when `swing` is exactly
   *  0 (common: margins are stored to one decimal, so "no change at all
   *  between these two years" is a real, frequent case, not just floating-
   *  point noise). Colors the tick by the current lean instead of a neutral
   *  gray, since a flat swing has no sign of its own to color by. */
  tieWinner?: "D" | "R";
}) {
  const u = unit * scale;
  const color =
    swing > 0
      ? "#1d4ed8"
      : swing < 0
      ? "#b91c1c"
      : tieWinner === "R"
      ? "#b91c1c"
      : tieWinner === "D"
      ? "#1d4ed8"
      : "#71717a";
  if (Math.abs(swing) < 0.3) {
    // 5 is a nice visible minimum for a normal-sized shape, but `unit` is now
    // sized per-shape (see countyArrowUnit/precinctArrowUnit callers), so a
    // genuinely tiny shape (a dense urban precinct, a small county) can have
    // a `u` well under 5 -- an unconditional 5-unit floor would then draw a
    // tick bigger than the shape it's sitting on. Cap it at a multiple of
    // the shape's own unit so it shrinks gracefully instead.
    const h = Math.min(Math.max(u * 0.25, 5), u * 1.5);
    return (
      <line
        x1={cx}
        y1={cy - h / 2}
        x2={cx}
        y2={cy + h / 2}
        stroke={color}
        strokeWidth={Math.max(1.5, u * 0.05)}
        strokeLinecap="round"
        className="pointer-events-none"
      />
    );
  }
  const len = shiftArrowLen(u, swing);
  const toward = swing > 0 ? -1 : 1; // left for D, right for R
  const tipX = cx + len * toward;
  const headSize = Math.min(len * 0.4, u * 0.22);
  const strokeWidth = Math.max(1.5, headSize * 0.3);
  // The shaft stops at the BACK of the arrowhead, not the tip itself —
  // ending it at the tip (the old behavior) let the line's round cap poke a
  // few px past the triangle's point, reading as a line stuck through the
  // arrow instead of one clean shape.
  const shaftEndX = tipX - toward * headSize;
  return (
    <g className="pointer-events-none">
      <line
        x1={cx}
        y1={cy}
        x2={shaftEndX}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />
      <polygon
        points={`${tipX},${cy} ${shaftEndX},${cy - headSize * 0.6} ${shaftEndX},${
          cy + headSize * 0.6
        }`}
        fill={color}
      />
    </g>
  );
}
