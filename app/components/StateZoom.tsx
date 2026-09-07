import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadStateGeo,
  loadCountyPrecincts,
  hasPrecincts,
  type StateGeo,
  type CountyPrecincts,
} from "~/lib/stateGeo";
import { countyResult } from "~/data/countyResults";
import { districtResults } from "~/data/districtResults";
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

/** "x y w h" bounding box of one or more SVG path strings. */
function bboxOf(ds: string[], pad = 6): string {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const d of ds) {
    const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    for (let i = 0; i + 1 < n.length; i += 2) {
      x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]);
      y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]);
    }
  }
  return `${x0 - pad} ${y0 - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}`;
}

export function StateZoom({ usps, stateName, raceKey, onBack }: StateZoomProps) {
  const [geo, setGeo] = useState<StateGeo | null>(null);
  const [layer, setLayer] = useState<Layer>("county");
  const [focusDistrict, setFocusDistrict] = useState<string | null>(null);
  const [focusCounty, setFocusCounty] = useState<string | null>(null);
  const [precincts, setPrecincts] = useState<CountyPrecincts | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setGeo(null);
    setFocusDistrict(null);
    setFocusCounty(null);
    loadStateGeo(usps).then((g) => live && setGeo(g));
    return () => {
      live = false;
    };
  }, [usps]);

  useEffect(() => {
    let live = true;
    setPrecincts(null);
    if (focusCounty) {
      loadCountyPrecincts(usps, focusCounty).then((p) => live && setPrecincts(p));
    }
    return () => {
      live = false;
    };
  }, [usps, focusCounty]);

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
          fill: SHADE_COLORS[marginToShade(party, res.marginPct, { allowTossup: false })],
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
  const precinctsAvailable = hasPrecincts(usps);

  // What the SVG shows right now.
  const focusedCounty = geo?.counties.find((c) => c.fips === focusCounty) ?? null;
  const focusedDistrict = districts.find((d) => d.id === focusDistrict) ?? null;
  const showPrecincts = !!focusCounty;
  const showDistricts = layer === "district" && !focusCounty && districts.length > 0;
  const showCounties = !focusCounty && (layer === "county" || layer === "precinct");

  const viewBox = focusedCounty
    ? precincts?.viewBox ?? bboxOf([focusedCounty.d])
    : focusedDistrict
    ? bboxOf([focusedDistrict.d])
    : geo?.viewBox ?? "0 0 800 600";

  const hoveredCounty =
    hovered && showCounties ? geo?.counties.find((c) => c.fips === hovered) : null;
  const hoveredDistrict =
    hovered && showDistricts ? districts.find((d) => d.id === hovered) : null;
  const hoveredPrecinct =
    hovered && showPrecincts ? precincts?.precincts.find((p) => p.id === hovered) : null;

  function countyClick(fips: string) {
    // Clicking a county always drills to its precincts.
    setFocusCounty(fips);
    setHovered(null);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={onBack}
            className="rounded-md border border-gray-300 px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            &larr; U.S.
          </button>
          {(focusCounty || focusDistrict) && (
            <button
              onClick={() => {
                setFocusCounty(null);
                setFocusDistrict(null);
              }}
              className="rounded-md border border-gray-300 px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              &larr; {stateName}
            </button>
          )}
          {focusedDistrict && !focusCounty && (
            <span className="text-gray-400 dark:text-gray-500">
              &rsaquo; {focusedDistrict.label} &mdash; pick a county
            </span>
          )}
          {focusedCounty && (
            <button
              onClick={() => setFocusCounty(null)}
              className="rounded-md border border-gray-300 px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              &larr; {focusedDistrict ? focusedDistrict.label : "counties"}
            </button>
          )}
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {focusedCounty ? `${focusedCounty.name} County` : stateName}
        </span>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs dark:border-gray-800 dark:bg-gray-900">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setLayer(l.id);
                setFocusDistrict(null);
                if (l.id !== "precinct") setFocusCounty(null);
              }}
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
            viewBox={viewBox}
            role="img"
            aria-label={`${stateName} ${focusCounty ? "precinct" : layer} map`}
            className="mx-auto h-auto max-h-[70vh] w-auto max-w-full select-none"
          >
            {showCounties &&
              geo.counties.map((c) => {
                const { fill, className } = countyFill(c.fips);
                const dim =
                  focusedDistrict != null && !countyTouchesDistrict(c, focusedDistrict);
                return (
                  <path
                    key={c.fips}
                    d={c.d}
                    fill={fill}
                    className={
                      (className ?? "") + " cursor-pointer transition-[filter] duration-100"
                    }
                    stroke="#ffffff"
                    strokeWidth={hovered === c.fips ? 2 : 0.6}
                    opacity={dim ? 0.3 : 1}
                    style={{ filter: hovered === c.fips ? "brightness(1.12)" : undefined }}
                    onMouseEnter={() => setHovered(c.fips)}
                    onMouseMove={updatePos}
                    onMouseLeave={() => setHovered((h) => (h === c.fips ? null : h))}
                    onClick={() => countyClick(c.fips)}
                  >
                    <title>{c.name}</title>
                  </path>
                );
              })}

            {showDistricts &&
              districts.map((d) => (
                <path
                  key={d.id}
                  d={d.d}
                  className={`cursor-pointer transition-colors duration-100 ${
                    hovered === d.id
                      ? "fill-indigo-400 dark:fill-indigo-500"
                      : "fill-gray-300 dark:fill-gray-600"
                  }`}
                  stroke="#ffffff"
                  strokeWidth={hovered === d.id ? 2 : 1.2}
                  onMouseEnter={() => setHovered(d.id)}
                  onMouseMove={updatePos}
                  onMouseLeave={() => setHovered((h) => (h === d.id ? null : h))}
                  onClick={() => {
                    setFocusDistrict(d.id);
                    setLayer("county");
                    setHovered(null);
                  }}
                >
                  <title>{d.label}</title>
                </path>
              ))}

            {showPrecincts &&
              precincts?.precincts.map((p) => {
                const { fill, className } = countyFill(focusCounty!.slice(0, 5));
                return (
                  <path
                    key={p.id}
                    d={p.d}
                    fill={fill}
                    className={(className ?? "") + " transition-[filter] duration-100"}
                    stroke="#ffffff"
                    strokeWidth={hovered === p.id ? 1 : 0.25}
                    style={{ filter: hovered === p.id ? "brightness(1.15)" : undefined }}
                    onMouseEnter={() => setHovered(p.id)}
                    onMouseMove={updatePos}
                    onMouseLeave={() => setHovered((h) => (h === p.id ? null : h))}
                  >
                    <title>{p.name}</title>
                  </path>
                );
              })}

            {showCounties && !focusedDistrict && (
              <path
                d={geo.bordersD}
                fill="none"
                stroke="#ffffff"
                strokeOpacity={0.5}
                strokeWidth={0.5}
                pointerEvents="none"
              />
            )}
            {focusedDistrict && !focusCounty && (
              <path
                d={focusedDistrict.d}
                fill="none"
                className="stroke-indigo-500 dark:stroke-indigo-400"
                strokeWidth={1.6}
                pointerEvents="none"
              />
            )}
            {!focusCounty && (
              <path
                d={geo.outlineD}
                fill="none"
                className="stroke-gray-500 dark:stroke-gray-400"
                strokeWidth={1.2}
                pointerEvents="none"
              />
            )}
          </svg>
        )}

        {geo && !focusCounty && layer === "county" && !hasCountyData && (
          <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
            County-level results for {raceKey.replace("-", " ")} aren&rsquo;t loaded
            yet &mdash; showing shapes only.
          </p>
        )}
        {geo && !focusCounty && (layer === "county" || layer === "precinct") && (
          <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
            {precinctsAvailable
              ? "Click a county to see its precincts."
              : "Click a county to zoom in."}
          </p>
        )}
        {geo && showDistricts && (
          <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
            {districts.length} districts (120th Congress) &mdash; click one to drill
            into its counties. House results aren&rsquo;t wired up yet.
          </p>
        )}
        {geo && focusCounty && !precincts && (
          <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
            {precinctsAvailable
              ? "Loading precincts…"
              : `No precinct geometry for ${stateName} yet.`}
          </p>
        )}
        {geo && precincts && (
          <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
            {precincts.precincts.length} precincts &mdash; shaded at the county
            result; precinct-level returns aren&rsquo;t loaded yet.
          </p>
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
          <DistrictTip
            usps={usps}
            label={hoveredDistrict.label}
            district={Number(hoveredDistrict.id)}
            x={pos.x}
            y={pos.y}
          />
        )}
        {hoveredPrecinct && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
            style={{ left: pos.x, top: pos.y - 10 }}
          >
            <div className="font-semibold">{hoveredPrecinct.name}</div>
            {hoveredPrecinct.pop != null && (
              <div className="text-gray-300 dark:text-gray-600">
                pop. {formatVotes(hoveredPrecinct.pop)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Cheap overlap test: does a county's bbox intersect a district's bbox? */
function countyTouchesDistrict(
  county: { d: string },
  district: { d: string }
): boolean {
  const box = (d: string) => {
    const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i + 1 < n.length; i += 2) {
      x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]);
      y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]);
    }
    return { x0, y0, x1, y1 };
  };
  const a = box(county.d);
  const b = box(district.d);
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

const RACE_LABEL: Record<string, string> = {
  "2016-president": "2016 Pres.",
  "2020-president": "2020 Pres.",
  "2024-president": "2024 Pres.",
  "2016-senate": "2016 Sen.",
  "2018-senate": "2018 Sen.",
  "2022-senate": "2022 Sen.",
  "2024-senate": "2024 Sen.",
};

function DistrictTip({
  usps,
  label,
  district,
  x,
  y,
}: {
  usps: string;
  label: string;
  district: number;
  x: number;
  y: number;
}) {
  const hist = districtResults(usps, district);
  return (
    <div
      className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
      style={{ left: x, top: y - 10 }}
    >
      <div className="font-semibold">
        {usps} {label}
      </div>
      {hist ? (
        <div className="mt-0.5 space-y-0.5 border-t border-white/15 pt-1 dark:border-black/10">
          <div className="text-gray-300 dark:text-gray-600">
            How the current lines voted
          </div>
          {Object.entries(hist).map(([key, r]) => (
            <div key={key} className="flex items-baseline justify-between gap-2">
              <span className="text-gray-300 dark:text-gray-600">
                {RACE_LABEL[key] ?? key}
              </span>
              <span
                className={
                  r.winner === "D"
                    ? "text-blue-300 dark:text-blue-700"
                    : "text-red-300 dark:text-red-700"
                }
              >
                {r.who ?? r.winner} {r.winner === "D" ? "D" : "R"}+
                {Math.abs(r.rPct - r.dPct)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-300 dark:text-gray-600">
          No district history loaded
        </div>
      )}
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
            <div className="space-y-0.5 pt-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-blue-300 dark:text-blue-700">D {res.dPct}%</span>
                <span className="tabular-nums text-gray-300 dark:text-gray-600">
                  {res.dVotes != null
                    ? formatVotes(res.dVotes)
                    : res.totalVotes != null
                    ? formatVotes(Math.round((res.totalVotes * res.dPct) / 100))
                    : ""}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-red-300 dark:text-red-700">R {res.rPct}%</span>
                <span className="tabular-nums text-gray-300 dark:text-gray-600">
                  {res.rVotes != null
                    ? formatVotes(res.rVotes)
                    : res.totalVotes != null
                    ? formatVotes(Math.round((res.totalVotes * res.rPct) / 100))
                    : ""}
                </span>
              </div>
            </div>
          )}
          {res.totalVotes != null && (
            <div className="text-gray-300 dark:text-gray-600">
              {formatVotes(res.totalVotes)} total
            </div>
          )}
        </>
      )}
    </div>
  );
}
