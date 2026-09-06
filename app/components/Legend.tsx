import { SHADE_ORDER, SHADE_LABELS, SHADE_COLORS, type Shade } from "~/lib/shades";

/**
 * A row of selectable color swatches (no text) used as the "paint" tool for
 * the 2026 predictor: pick a color here, then click states on the map to
 * apply it. The currently selected color gets a ring; each swatch still
 * carries its label as a native title/aria-label for accessibility, it's
 * just not printed on the page.
 */
export function ShadePalette({
  selected,
  onSelect,
}: {
  selected: Shade;
  onSelect: (shade: Shade) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Prediction color">
      {SHADE_ORDER.map((shade) => (
        <button
          key={shade}
          type="button"
          role="radio"
          aria-checked={selected === shade}
          title={SHADE_LABELS[shade]}
          aria-label={SHADE_LABELS[shade]}
          onClick={() => onSelect(shade)}
          className={`h-7 w-7 rounded-md border transition-transform ${
            selected === shade
              ? "scale-110 border-gray-900 ring-2 ring-gray-900 ring-offset-2 dark:border-white dark:ring-white dark:ring-offset-gray-900"
              : "border-black/10 hover:scale-105"
          }`}
          style={{ backgroundColor: SHADE_COLORS[shade] }}
        />
      ))}
    </div>
  );
}

/**
 * Non-interactive gradient strip showing the same 7-color spectrum used for
 * predictions, for historical maps that are now shaded by actual margin
 * (a blowout looks different from a squeaker). Deliberately just the ramp
 * plus "Dem"/"Rep" endpoint labels -- no per-shade text needed here.
 */
export function ShadeGradientLegend() {
  return (
    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
      <span>Dem</span>
      <div className="flex h-3 flex-1 overflow-hidden rounded-full">
        {SHADE_ORDER.map((shade) => (
          <span
            key={shade}
            className="h-full flex-1"
            style={{ backgroundColor: SHADE_COLORS[shade] }}
            title={SHADE_LABELS[shade]}
          />
        ))}
      </div>
      <span>Rep</span>
    </div>
  );
}
