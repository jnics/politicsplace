import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadStateGeo,
  loadCountyPrecincts,
  hasPrecincts,
  type StateGeo,
  type CountyPrecincts,
} from "~/lib/stateGeo";
import { countyResult } from "~/data/countyResults";
import { districtResults, districtLean } from "~/data/districtResults";
import { HISTORICAL_COLORS, SHADE_COLORS } from "~/lib/shades";
import { marginToShade, formatMargin, formatVotes } from "~/lib/margin";

type Layer = "county" | "district" | "precinct";

const LAYERS: { id: Layer; label: string }[] = [
  { id: "county", label: "Counties" },
  { id: "district", label: "Districts" },
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

/** Fill for a county / precinct from its parent-race result. */
function resultFill(fips: string, raceKey: string): { fill?: string; className?: string } {
  const res = countyResult(raceKey, fips);
  if (!res?.winner) return { className: "fill-gray-200 dark:fill-gray-700" };
  const party = res.winner === "D" ? "D" : "R";
  if (res.marginPct != null) {
    return { fill: SHADE_COLORS[marginToShade(party, res.marginPct, { allowTossup: false })] };
  }
  return { fill: party === "D" ? HISTORICAL_COLORS.D : HISTORICAL_COLORS.R };
}

export function StateZoom({ usps, stateName, raceKey, onBack }: StateZoomProps) {
  const [geo, setGeo] = useState<StateGeo | null>(null);
  const [layer, setLayer] = useState<Layer>("county");
  const [focusDistrict, setFocusDistrict] = useState<string | null>(null);
  const [focusCounty, setFocusCounty] = useState<string | null>(null);
  const [precincts, setPrecincts] = useState<CountyPrecincts | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState({ k: 1, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; zx: number; zy: number } | null>(null);

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

  // Reset zoom/pan whenever the view changes.
  useEffect(() => {
    setZoom({ k: 1, x: 0, y: 0 });
  }, [layer, focusDistrict, focusCounty]);

  const updatePos = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const districts = geo?.districts ?? [];
  const precinctsAvailable = hasPrecincts(usps);

  const focusedCounty = geo?.counties.find((c) => c.fips === focusCounty) ?? null;
  const focusedDistrict = districts.find((d) => d.id === focusDistrict) ?? null;

  // Which layer's shapes are the SVG showing?
  const view: Layer = focusCounty
    ? "precinct"
    : focusDistrict
    ? "district"
    : layer;

  const baseViewBox = focusedCounty
    ? precincts?.viewBox ?? bboxOf([focusedCounty.d])
    : focusedDistrict
    ? bboxOf([focusedDistrict.d], 12)
    : geo?.viewBox ?? "0 0 800 600";

  // Apply zoom/pan by shrinking + translating the viewBox.
  const viewBox = useMemo(() => {
    const [x, y, w, h] = baseViewBox.split(" ").map(Number);
    const k = zoom.k;
    return `${x + zoom.x + (w * (1 - 1 / k)) / 2} ${
      y + zoom.y + (h * (1 - 1 / k)) / 2
    } ${w / k} ${h / k}`;
  }, [baseViewBox, zoom]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => {
      const k = Math.min(Math.max(z.k * (e.deltaY < 0 ? 1.2 : 1 / 1.2), 1), 16);
      return { ...z, k };
    });
  }
  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, zx: zoom.x, zy: zoom.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !svgRef.current) return;
    const [, , w] = baseViewBox.split(" ").map(Number);
    const scale = (w / zoom.k) / svgRef.current.clientWidth;
    setZoom((z) => ({
      ...z,
      x: drag.current!.zx - (e.clientX - drag.current!.x) * scale,
      y: drag.current!.zy - (e.clientY - drag.current!.y) * scale,
    }));
  }
  function endDrag() {
    drag.current = null;
  }

  const hoveredCounty =
    hovered && view === "county" ? geo?.counties.find((c) => c.fips === hovered) : null;
  const hoveredDistrict =
    hovered && view === "district" && !focusDistrict
      ? districts.find((d) => d.id === hovered)
      : null;
  const hoveredPrecinct =
    hovered && view === "precinct"
      ? precincts?.precincts.find((p) => p.id === hovered)
      : null;

  const districtCounties = useMemo(() => {
    if (!focusedDistrict || !geo) return new Set<string>();
    return new Set(
      geo.counties
        .filter((c) => bboxIntersect(c.d, focusedDistrict.d))
        .map((c) => c.fips)
    );
  }, [focusedDistrict, geo]);

  const zoomed = zoom.k > 1.01 || zoom.x !== 0 || zoom.y !== 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Crumb onClick={onBack}>&larr; U.S.</Crumb>
          {(focusDistrict || focusCounty) && (
            <Crumb
              onClick={() => {
                setFocusDistrict(null);
                setFocusCounty(null);
              }}
            >
              {stateName}
            </Crumb>
          )}
          {focusedDistrict && focusCounty && (
            <Crumb onClick={() => setFocusCounty(null)}>{focusedDistrict.label}</Crumb>
          )}
          {focusedDistrict && !focusCounty && (
            <span className="text-gray-500 dark:text-gray-400">
              {focusedDistrict.label}
            </span>
          )}
          {focusedCounty && !focusedDistrict && (
            <Crumb onClick={() => setFocusCounty(null)}>counties</Crumb>
          )}
          {focusedCounty && (
            <span className="text-gray-500 dark:text-gray-400">
              {focusedCounty.name} Co. precincts
            </span>
          )}
        </div>
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
                view === l.id
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
            ref={svgRef}
            viewBox={viewBox}
            role="img"
            aria-label={`${stateName} ${view} map`}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            className={`mx-auto h-auto max-h-[72vh] w-auto max-w-full touch-none select-none ${
              drag.current ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {/* COUNTY LAYER */}
            {view === "county" &&
              !focusCounty &&
              geo.counties.map((c) => {
                const { fill, className } = resultFill(c.fips, raceKey);
                const inDistrict = !focusedDistrict || districtCounties.has(c.fips);
                return (
                  <path
                    key={c.fips}
                    d={c.d}
                    fill={fill}
                    className={
                      (className ?? "") + " cursor-pointer transition-[filter] duration-100"
                    }
                    stroke={focusedDistrict ? "#111827" : "#ffffff"}
                    strokeWidth={hovered === c.fips ? 2 : focusedDistrict ? 0.9 : 0.6}
                    opacity={inDistrict ? 1 : 0.25}
                    style={{ filter: hovered === c.fips ? "brightness(1.12)" : undefined }}
                    onMouseEnter={() => setHovered(c.fips)}
                    onMouseMove={updatePos}
                    onMouseLeave={() => setHovered((h) => (h === c.fips ? null : h))}
                    onClick={() => {
                      setFocusCounty(c.fips);
                      setHovered(null);
                    }}
                  >
                    <title>{c.name}</title>
                  </path>
                );
              })}

            {/* DISTRICT LAYER */}
            {view === "district" &&
              !focusCounty &&
              districts.map((d) => {
                const lean = districtLean(usps, Number(d.id), raceKey);
                const fill = lean
                  ? SHADE_COLORS[
                      marginToShade(lean.winner, Math.abs(lean.rPct - lean.dPct), {
                        allowTossup: false,
                      })
                    ]
                  : undefined;
                const isFocus = focusDistrict === d.id;
                const faded = focusDistrict != null && !isFocus;
                return (
                  <path
                    key={d.id}
                    d={d.d}
                    fill={fill}
                    className={
                      (fill ? "" : "fill-gray-300 dark:fill-gray-600") +
                      " cursor-pointer transition-[filter,opacity] duration-100"
                    }
                    stroke="#ffffff"
                    strokeWidth={hovered === d.id || isFocus ? 2 : 1.1}
                    opacity={faded ? 0.15 : 1}
                    style={{
                      filter: hovered === d.id ? "brightness(1.1)" : undefined,
                    }}
                    onMouseEnter={() => setHovered(d.id)}
                    onMouseMove={updatePos}
                    onMouseLeave={() => setHovered((h) => (h === d.id ? null : h))}
                    onClick={() => {
                      setFocusDistrict((cur) => (cur === d.id ? null : d.id));
                      setHovered(null);
                    }}
                  >
                    <title>{d.label}</title>
                  </path>
                );
              })}

            {/* PRECINCT LAYER (a focused county) */}
            {view === "precinct" &&
              focusCounty &&
              precincts?.precincts.map((p) => {
                const { fill, className } = resultFill(focusCounty.slice(0, 5), raceKey);
                return (
                  <path
                    key={p.id}
                    d={p.d}
                    fill={fill}
                    className={(className ?? "") + " transition-[filter] duration-100"}
                    stroke="#111827"
                    strokeWidth={hovered === p.id ? 0.9 : 0.2}
                    style={{ filter: hovered === p.id ? "brightness(1.2)" : undefined }}
                    onMouseEnter={() => setHovered(p.id)}
                    onMouseMove={updatePos}
                    onMouseLeave={() => setHovered((h) => (h === p.id ? null : h))}
                  >
                    <title>{p.name}</title>
                  </path>
                );
              })}

            {/* Overlays */}
            {view === "county" && !focusCounty && !focusedDistrict && (
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
                className="stroke-gray-900 dark:stroke-white"
                strokeWidth={2}
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

        {zoomed && (
          <button
            onClick={() => setZoom({ k: 1, x: 0, y: 0 })}
            className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-700 shadow dark:bg-gray-900/90 dark:text-gray-300"
          >
            Reset zoom
          </button>
        )}

        {geo && (
          <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
            {focusCounty
              ? precincts
                ? `${precincts.precincts.length} precincts — shaded at the county result. Scroll to zoom, drag to pan.`
                : precinctsAvailable
                ? "Loading precincts…"
                : `No precinct geometry for ${stateName} yet.`
              : focusedDistrict
              ? `${focusedDistrict.label} — click a county to see its precincts.`
              : view === "district"
              ? `${districts.length} districts (2026 lines), shaded by ${raceKey.replace(
                  "-",
                  " "
                )}. Click one to isolate it.`
              : precinctsAvailable
              ? "Click a county to drill into its precincts."
              : "Click a county to zoom in."}
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
            raceKey={raceKey}
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

function Crumb({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-gray-300 px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      {children}
    </button>
  );
}

function bboxIntersect(a: string, b: string): boolean {
  const box = (d: string) => {
    const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i + 1 < n.length; i += 2) {
      x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]);
      y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]);
    }
    return { x0, y0, x1, y1 };
  };
  const p = box(a);
  const q = box(b);
  return p.x0 < q.x1 && p.x1 > q.x0 && p.y0 < q.y1 && p.y1 > q.y0;
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
  raceKey,
  x,
  y,
}: {
  usps: string;
  label: string;
  district: number;
  raceKey: string;
  x: number;
  y: number;
}) {
  const hist = districtResults(usps, district);
  const lean = districtLean(usps, district, raceKey);
  return (
    <div
      className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
      style={{ left: x, top: y - 10 }}
    >
      <div className="font-semibold">
        {usps} {label}
      </div>
      {lean && (
        <div>
          {lean.who ?? (lean.winner === "D" ? "Dem" : "Rep")}{" "}
          {formatMargin(lean.winner, Math.abs(lean.rPct - lean.dPct)).replace(
            /^[DR] /,
            lean.winner + "+"
          )}
        </div>
      )}
      {hist && Object.keys(hist).length > 1 && (
        <div className="mt-0.5 space-y-0.5 border-t border-white/15 pt-1 dark:border-black/10">
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
                {r.who ?? r.winner} {r.winner}+{Math.abs(r.rPct - r.dPct)}
              </span>
            </div>
          ))}
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
