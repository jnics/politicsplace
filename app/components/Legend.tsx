import { SHADE_ORDER, SHADE_LABELS, SHADE_COLORS } from "~/lib/shades";

export function ShadeLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {SHADE_ORDER.map((shade) => (
        <div key={shade} className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-sm border border-black/10"
            style={{ backgroundColor: SHADE_COLORS[shade] }}
          />
          <span className="text-gray-600 dark:text-gray-400">
            {SHADE_LABELS[shade]}
          </span>
        </div>
      ))}
    </div>
  );
}

export interface LegendSwatch {
  color: string;
  label: string;
}

export function SimpleLegend({ items }: { items: LegendSwatch[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-sm border border-black/10"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
