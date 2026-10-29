import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const GAP = 12; // px between the cursor and the card
const EDGE = 8; // px kept clear of the window's edges

/** A button at the bottom of the card, for a card pinned by a tap on a touch
 *  screen (see useTapToPin): "Open Ohio →" does what a click on the shape
 *  does. Maps provide it around their card; null (the default) means a plain
 *  hover card with no button, as on desktop. */
export const TooltipActionContext = createContext<{ label: string; onClick: () => void } | null>(null);

/**
 * The hover card for every map. It's `position: fixed` against the browser
 * window rather than the map, so it can never add a scrollbar. It measures
 * itself and is placed:
 *   - beside the cursor (right, or left when the right side is short), so
 *     the state or county under the cursor stays in view;
 *   - centred on the cursor vertically, slid up or down to stay on screen;
 *   - capped to the window's height, scrolling inside if it's taller still.
 * Hidden for its first frame until measured, so it never flashes off-screen.
 *
 * `x` / `y` are the cursor's clientX / clientY.
 */
export function MapTooltip({
  x,
  y,
  className = "w-60",
  children,
}: {
  x: number;
  y: number;
  /** Width classes, e.g. "w-52" or "w-[36rem]". */
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const action = useContext(TooltipActionContext);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    // Beside the cursor, not over it, so the shape being hovered stays
    // visible: to the right, or to the left when the right side is short.
    const right = x + GAP;
    const leftSide = x - GAP - w;
    const left =
      right + w <= vw - EDGE
        ? right
        : leftSide >= EDGE
        ? leftSide
        : // too wide for either side -- pin it inside the window
          Math.max(EDGE, Math.min(right, vw - w - EDGE));
    // Vertically centred on the cursor, kept inside the window.
    const top = Math.min(Math.max(y - h / 2, EDGE), Math.max(EDGE, vh - h - EDGE));
    // Only update on a real move -- children are a new object every render,
    // so an unconditional set here would re-render forever.
    setPlace((p) => (p && p.left === left && p.top === top ? p : { left, top }));
  }, [x, y, children, action]);

  return (
    <div
      ref={ref}
      className={`${action ? "pointer-events-auto" : "pointer-events-none"} fixed z-50 overflow-y-auto rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg dark:bg-gray-100 dark:text-gray-900 ${className}`}
      style={{
        left: place?.left ?? x,
        top: place?.top ?? y,
        maxWidth: `calc(100vw - ${EDGE * 2}px)`,
        maxHeight: `calc(100vh - ${EDGE * 2}px)`,
        visibility: place ? "visible" : "hidden",
      }}
    >
      {children}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 w-full rounded-md bg-white/15 px-2 py-1.5 text-xs font-semibold dark:bg-gray-900/10"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
