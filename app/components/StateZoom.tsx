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

  const districts = geo?.districts ?? [];
  const showDistricts = layer === "district" && districts.length > 0;

  const hoveredCounty =
    hovered && geo && layer === "county"
      ? geo.counties.find((c) => c.fips === hovered)
      : null;
  const hoveredDistrict = showDistricts
    ? districts.find((d) => d.id === hovered)
    : null;

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
            aria-label={`${stateName} ${layer} map`}
            className="mx-auto h-auto max-h-[70vh] w-auto max-w-full select-none"
          >
            {layer === "county" &&
              geo.counties.map((c) => {
                const { fill, className } = countyFill(c.fips);
                const isHovered = hovered === c.fips;
                return (
                  <path
                    key={c.fips}
                    d={c.d}
                    fill={fill}
                    className={
                      (className ?? "") +
                      " cursor-pointer transition-[filter] duration-100"
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

            {showDistricts &&
              districts.map((d) => {
                const isHovered = hovered === d.id;
                return (
                  <path
                    key={d.id}
                    d={d.d}
                    className={`cursor-pointer transition-colors duration-100 ${
                      isHovered
                        ? "fill-indigo-400 dark:fill-indigo-500"
                        : "fill-gray-300 dark:fill-gray-600"
                    }`}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2 : 1.2}
                    onMouseEnter={() => setHovered(d.id)}
                    onMouseMove={updatePos}
                    onMouseLeave={() => setHovered((h) => (h === d.id ? null : h))}
                  >
                    <title>{d.label}</title>
                  </path>
                );
              })}

            {layer === "county" && (
              <path
                d={geo.bordersD}
                fill="none"
                stroke="#ffffff"
                strokeOpacity={0.5}
                strokeWidth={0.5}
                pointerEvents="none"
              />
            )}
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

        {geo && showDistricts && (
          <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
            {districts.length} congressional districts (119th Congress). House-race
            results for this layer aren&rsquo;t wired up yet.
          </p>
        )}

        {geo && layer === "precinct" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 text-center text-sm text-gray-600 backdrop-blur-sm dark:bg-gray-950/70 dark:text-gray-300">
            <div className="max-w-xs px-4">
              <p className="font-medium">Precincts</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Precinct geometry (thousands per state) isn&rsquo;t bundled yet
                &mdash; it&rsquo;ll load per county when House data lands.
              </p>
            </div>
          </div>
        )}

        {geo && layer === "district" && districts.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 text-center text-sm text-gray-600 backdrop-blur-sm dark:bg-gray-950/70 dark:text-gray-300">
            <div className="max-w-xs px-4">
              <p className="font-medium">Congressional districts</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Re-run <code>pnpm geo:extract {geo.usps}</code> to pull district
                shapes for this state.
              </p>
            </div>
          </div>
        )}

        {hoveredCounty && (
          <CountyTip
            name={hoveredCounty.name}
            fips={hoveredCounty.fips}
            raceKey={raceKey}
            x={pos.x}
            y={pos.y}
          />
        )}

        {hoveredDistrict && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
            style={{ left: pos.x, top: pos.y - 10 }}
          >
            {stateName} {hoveredDistrict.label}
          </div>
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
            {res.marginPct != null && (
              <span className="text-gray-300 dark:text-gray-600">
                {" "}
                ({formatMargin(res.winner === "D" ? "D" : "R", res.marginPct)})
              </span>
            )}
          </div>
          {res.rPct != null && res.dPct != null && (
            <div className="flex items-baseline justify-between gap-2 pt-0.5">
              <span className="text-blue-300 dark:text-blue-700">D {res.dPct}%</span>
              <span className="text-red-300 dark:text-red-700">R {res.rPct}%</span>
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
