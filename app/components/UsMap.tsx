import { useState, useRef, useCallback } from "react";
import { STATE_PATHS, US_MAP_VIEWBOX } from "~/data/statePaths";

export interface UsMapProps {
  /** Fill color for each state, keyed by uppercase USPS code. */
  fills: Record<string, string>;
  /** States that respond to clicks (get a pointer cursor + hover highlight). */
  interactiveStates?: Set<string>;
  /** Called when an interactive state is clicked. direction is -1 on right-click. */
  onStateClick?: (id: string, direction: 1 | -1) => void;
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
  className?: string;
}

export function UsMap({
  fills,
  interactiveStates,
  onStateClick,
  tooltip,
  hiddenStates,
  highlightStates,
  defs,
  className,
}: UsMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePos = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <svg
        viewBox={US_MAP_VIEWBOX}
        role="img"
        aria-label="Map of the United States"
        className="w-full h-auto select-none"
      >
        {defs && <defs>{defs}</defs>}
        {STATE_PATHS.filter((s) => !hiddenStates?.has(s.id)).map((state) => {
          const isInteractive = interactiveStates?.has(state.id) ?? false;
          const fill = fills[state.id] ?? "#e4e4e7";
          const isHovered = hovered === state.id;
          const spotlit = highlightStates?.has(state.id) ?? false;
          const dimmed = highlightStates != null && !spotlit;
          return (
            <path
              key={state.id}
              d={state.d}
              fill={fill}
              stroke={spotlit ? "#111827" : "#ffffff"}
              strokeWidth={spotlit ? 2 : isHovered ? 2 : 1}
              className={
                "transition-opacity duration-150 " +
                (isInteractive ? "cursor-pointer" : "cursor-default")
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
              onClick={() => {
                if (isInteractive) onStateClick?.(state.id, 1);
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
      </svg>

      {hovered && tooltip?.(hovered) && (
        <div
          className="pointer-events-none absolute z-10 w-60 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
          style={{ left: pos.x, top: pos.y - 10 }}
        >
          {tooltip(hovered)}
        </div>
      )}
    </div>
  );
}
