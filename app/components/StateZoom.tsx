import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadStateGeo, type StateGeo } from "~/lib/stateGeo";
import { countyResult } from "~/data/countyResults";
import { HISTORICAL_COLORS, SHADE_COLORS } from "~/lib/shades";
import { marginToShade, formatMargin, formatVotes } from "~/lib/margin";

type Layer = "county" | "district" | "precinct";

const LAYERS: { id: Layer; label: string }[] = [
  { id: "county", label: "Counties" },
  { id: "district", label: "Cong. districts" },
  { id: "precinct", label: "Precincts" },
];

export interface StateZoomProps {
  usps: string;
  stateName: string;
  /** "<year>-<office>", used to look up county results. */
  raceKey: string;
  onBack: () => void;
}

export function StateZoom({ usps, stateName, raceKey, onBack }: StateZoomProps) {
  const [geo, setGeo] = useState<StateGeo | null>(null);
  const [layer, setLayer] = useState<Layer>("county");
  const [hovered, setHovered] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setGeo(null);
    loadStateGeo(usps).then((g) => {
      if (live) setGeo(g);
    });
    return () => {
      live = false;
    };
  }, [usps]);

  const updatePos = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const countyFill = useCallback(
    (fips: string): { fill?: string; className?: string } => {
      const res = countyResult(raceKey, fips);
      if (!res || !res.winner) {
        return { className: "fill-gray-200 dark:fill-gray-700" };
      }
      const party = res.winner === "D" ? "D" : "R";
      if (res.marginPct != null) {
        return {
          fill: SHADE_COLORS[
            marginToShade(party, res.marginPct, { allowTossup: false })
          ],
        };
      }
      return { fill: party === "D" ? HISTORICAL_COLORS.D : HISTORICAL_COLORS.R };
    },
    [raceKey]
  );

  const hasCountyData = useMemo(
    () => geo?.counties.some((c) => countyResult(raceKey, c.fips)) ?? false,
    [geo, raceKey]
  );

  const hoveredCounty =
    hovered && geo ? geo.counties.find((c) => c.fips === hovered) : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          &larr; U.S. map
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {stateName}
        </span>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs dark:border-gray-800 dark:bg-gray-900">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayer(l.id)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                layer === l.id
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="relative">
        {!geo ? (
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            Loading {stateName} map&hellip;
          </div>
        ) : (
          <svg
            viewBox={geo.viewBox}
            role="img"
            aria-label={`${stateName} county map`}
            className="mx-auto h-auto max-h-[70vh] w-auto max-w-full select-none"
          >
            {geo.counties.map((c) => {
              const { fill, className } = countyFill(c.fips);
              const isHovered = hovered === c.fips;
              return (
                <path
                  key={c.fips}
                  d={c.d}
                  fill={fill}
                  className={
                    (className ?? "") + " cursor-pointer transition-[filter] duration-100"
                  }
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : 0.6}
                  style={{ filter: isHovered ? "brightness(1.12)" : undefined }}
                  onMouseEnter={() => setHovered(c.fips)}
                  onMouseMove={updatePos}
                  onMouseLeave={() => setHovered((h) => (h === c.fips ? null : h))}
                >
                  <title>{c.name}</title>
                </path>
              );
            })}
            <path
              d={geo.bordersD}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.5}
              strokeWidth={0.5}
              pointerEvents="none"
            />
            <path
              d={geo.outlineD}
              fill="none"
              className="stroke-gray-500 dark:stroke-gray-400"
              strokeWidth={1.2}
              pointerEvents="none"
            />
          </svg>
        )}

        {geo && layer === "county" && !hasCountyData && (
          <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
            County-level results for {raceKey.replace("-", " ")} aren&rsquo;t loaded
            yet &mdash; showing county shapes only.
          </p>
        )}

        {layer !== "county" && geo && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 text-center text-sm text-gray-600 backdrop-blur-sm dark:bg-gray-950/70 dark:text-gray-300">
            <div className="max-w-xs px-4">
              <p className="font-medium">
                {layer === "district" ? "Congressional districts" : "Precincts"}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Geometry and House-race data for this layer aren&rsquo;t wired up
                yet &mdash; the county layer is the working one for now.
              </p>
            </div>
          </div>
        )}

        {hoveredCounty && layer === "county" && (
          <CountyTip
            name={hoveredCounty.name}
            fips={hoveredCounty.fips}
            raceKey={raceKey}
            x={pos.x}
            y={pos.y}
          />
        )}
      </div>
    </div>
  );
}

function CountyTip({
  name,
  fips,
  raceKey,
  x,
  y,
}: {
  name: string;
  fips: string;
  raceKey: string;
  x: number;
  y: number;
}) {
  const res = countyResult(raceKey, fips);
  return (
    <div
      className="pointer-events-none absolute z-10 w-52 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
      style={{ left: x, top: y - 10 }}
    >
      <div className="font-semibold">{name} County</div>
      {!res || !res.winner ? (
        <div className="text-gray-300 dark:text-gray-600">No county data loaded</div>
      ) : (
        <>
          <div>
            Won by{" "}
            {res.winner === "D"
              ? "Democrats"
              : res.winner === "R"
              ? "Republicans"
              : res.winner}
          </div>
          {res.marginPct != null && (
            <div className="text-gray-300 dark:text-gray-600">
              {formatMargin(res.winner === "D" ? "D" : "R", res.marginPct)}
            </div>
          )}
          {res.totalVotes != null && (
            <div className="text-gray-300 dark:text-gray-600">
              {formatVotes(res.totalVotes)} votes
            </div>
          )}
        </>
      )}
    </div>
  );
}
