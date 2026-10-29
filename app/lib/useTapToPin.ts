import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Touch screens have no hover, so on a map a tap would drill in before the
 * info card was ever seen. This keeps a "pinned" shape for touch input only:
 * the first tap on a shape pins its card, a second tap (or the card's action
 * button) does what a click does, and a tap outside the map unpins it.
 *
 * Mouse input is untouched -- `touch.current` is false for a mouse, so hover
 * and click behave exactly as before. Put `onPointerDownCapture` on the map's
 * container so `touch` is set before the shape's click fires.
 */
export function useTapToPin(containerRef: RefObject<HTMLElement | null>) {
  const touch = useRef(false);
  const [pinned, setPinned] = useState<string | null>(null);

  useEffect(() => {
    if (!pinned) return;
    const away = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setPinned(null);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [pinned, containerRef]);

  const onPointerDownCapture = (e: React.PointerEvent) => {
    touch.current = e.pointerType !== "mouse";
  };

  return { touch, pinned, setPinned, onPointerDownCapture };
}
