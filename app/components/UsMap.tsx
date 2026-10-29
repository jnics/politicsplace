import { useState, useRef, useCallback, useMemo } from "react";
import { STATE_PATHS, US_MAP_VIEWBOX } from "~/data/statePaths";
import { pathPoints, centroidOf } from "~/lib/svgGeometry";
import { ShiftMark } from "~/components/ShiftMark";
import { MapTooltip, TooltipActionContext } from "~/components/MapTooltip";
import { useTapToPin } from "~/lib/useTapToPin";

export interface UsMapProps {
  /** Fill color for each state, keyed by uppercase USPS code. */
  fills: Record<string, string>;
  /** States that respond to clicks (get a pointer cursor + hover highlight). */
  interactiveStates?: Set<string>;
  /** Called when an interactive state is clicked. direction is -1 on right-click. */
  onStateClick?: (id: string, direction: 1 | -1) => void;
  /**
   * Called to zoom into a state: on a single click for non-interactive states,
   * and on a double-click for any state (so interactive states can keep
   * single-click for painting).
   */
  onStateSelect?: (id: string) => void;
  /** Tooltip body for a given state id -- return null to suppress the tooltip. */
  tooltip?: (id: string) => React.ReactNode;
  /** States to omit entirely from the map (e.g. none, by default all 51 render). */
  hiddenStates?: Set<string>;
  /**
   * When set, these states are spotlit (kept at full strength with a dark
   * outline) and every other state is dimmed. Used for donut-segment hover.
   */
  highlightStates?: Set<string> | null;
  /** Extra <defs> content (e.g. <pattern> elements for split-result states). */
  defs?: React.ReactNode;
  /** Turnout overlay: a translucent circle per state, area ∝ `votes`. */
  overlayCircles?: Record<string, { votes: number; color: string }>;
  /** Shift overlay: a left/right arrow per state, length ∝ `pts`. `winner`
   *  colors a zero-swing state's tick by who currently holds it, rather than
   *  a neutral gray — a swing of exactly 0 has no sign of its own. */
  overlayArrows?: Record<string, { pts: number; color: string; winner?: "D" | "R" }>;
  /** Width class for the hover card -- wider cards with tabular rows stay
   *  shorter. Defaults to "w-60". */
  tooltipWidth?: string;
  className?: string;
}

/** Same idea as StateZoom's per-county/district arrow + circle scaling, just
 *  against the national viewBox and 50 states instead of one state's shapes. */
function useOverlayScale() {
  return useMemo(() => {
    const [, , w, h] = US_MAP_VIEWBOX.split(" ").map(Number);
    return Math.sqrt((w * h) / 50);
  }, []);
}

export function UsMap({
  fills,
  interactiveStates,
  onStateClick,
  onStateSelect,
  tooltip,
  hiddenStates,
  highlightStates,
  defs,
  overlayCircles,
  overlayArrows,
  tooltipWidth = "w-60",
  className,
}: UsMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tap = useTapToPin(containerRef);
  // A tap-pinned state's card stays up after the finger lifts.
  const shown = tap.pinned ?? hovered;
  const unit = useOverlayScale();
  const circleMax = overlayCircles
    ? Math.max(...Object.values(overlayCircles).map((c) => c.votes))
    : 0;

  // Window coordinates -- MapTooltip is fixed to the viewport.
  const updatePos = useCallback((e: React.MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className ?? ""}`}
      onPointerDownCapture={tap.onPointerDownCapture}
    >
      <svg
        viewBox={US_MAP_VIEWBOX}
        role="img"
        aria-label="Map of the United States"
        className="w-full h-auto select-none"
      >
        {defs && <defs>{defs}</defs>}
        {STATE_PATHS.filter((s) => !hiddenStates?.has(s.id)).map((state) => {
          const isInteractive = interactiveStates?.has(state.id) ?? false;
          const isSelectable = !isInteractive && onStateSelect != null;
          const fill = fills[state.id] ?? "#ffffff";
          const isHovered = shown === state.id;
          const spotlit = highlightStates?.has(state.id) ?? false;
          const dimmed = highlightStates != null && !spotlit;
          return (
            <path
              key={state.id}
              d={state.d}
              fill={fill}
              stroke="#000000"
              strokeWidth={spotlit ? 2 : isHovered ? 2 : 1}
              className={
                "transition-opacity duration-150 " +
                (isInteractive || isSelectable ? "cursor-pointer" : "cursor-default")
              }
              opacity={dimmed ? 0.3 : 1}
              style={{
                filter:
                  isHovered || spotlit
                    ? "brightness(1.12) saturate(1.05)"
                    : undefined,
              }}
              onMouseEnter={() => setHovered(state.id)}
              onMouseMove={updatePos}
              onMouseLeave={() => setHovered((h) => (h === state.id ? null : h))}
              onClick={(e) => {
                // Touch: a tap pins the state's card. A paintable state is
                // painted on every tap (opened from the card's button); any
                // other state opens on a second tap. Mouse clicks skip this.
                if (tap.touch.current && (isInteractive || tap.pinned !== state.id)) {
                  tap.setPinned(state.id);
                  setPos({ x: e.clientX, y: e.clientY });
                  if (isInteractive) onStateClick?.(state.id, 1);
                  return;
                }
                tap.setPinned(null);
                if (isInteractive) onStateClick?.(state.id, 1);
                else onStateSelect?.(state.id);
              }}
              onDoubleClick={() => {
                // On touch, taps already open the state.
                if (!tap.touch.current) onStateSelect?.(state.id);
              }}
              onContextMenu={(e) => {
                if (isInteractive) {
                  e.preventDefault();
                  onStateClick?.(state.id, -1);
                }
              }}
            >
              <title>{state.name}</title>
            </path>
          );
        })}

        {overlayCircles &&
          circleMax > 0 &&
          STATE_PATHS.filter((s) => !hiddenStates?.has(s.id) && overlayCircles[s.id]).map(
            (state) => {
              const { votes, color } = overlayCircles[state.id];
              const [cx, cy] = centroidOf(pathPoints(state.d));
              const r = Math.max(
                unit * 0.05,
                Math.sqrt(votes / circleMax) * unit * 0.42
              );
              return (
                <circle
                  key={`turnout-${state.id}`}
                  cx={cx} cy={cy} r={r}
                  fill={color} fillOpacity={0.35}
                  stroke={color} strokeWidth={1}
                  className="pointer-events-none"
                />
              );
            }
          )}

        {overlayArrows &&
          STATE_PATHS.filter((s) => !hiddenStates?.has(s.id) && overlayArrows[s.id]).map(
            (state) => {
              const { pts, winner } = overlayArrows[state.id];
              const [cx, cy] = centroidOf(pathPoints(state.d));
              return (
                <ShiftMark
                  key={`shift-${state.id}`}
                  cx={cx}
                  cy={cy}
                  swing={pts}
                  unit={unit}
                  tieWinner={winner}
                />
              );
            }
          )}
      </svg>

      {shown && tooltip?.(shown) && (
        <TooltipActionContext.Provider
          value={
            tap.pinned && onStateSelect
              ? {
                  label: `Open ${STATE_PATHS.find((s) => s.id === tap.pinned)?.name ?? tap.pinned} →`,
                  onClick: () => {
                    const id = tap.pinned!;
                    tap.setPinned(null);
                    onStateSelect(id);
                  },
                }
              : null
          }
        >
          <MapTooltip x={pos.x} y={pos.y} className={tooltipWidth}>
            {tooltip(shown)}
          </MapTooltip>
        </TooltipActionContext.Provider>
      )}
    </div>
  );
}
