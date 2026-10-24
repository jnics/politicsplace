import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  loadStateGeo,
  loadCountyPrecincts,
  loadDistrictPrecincts,
  loadDistrictCounty,
  hasPrecincts,
  type StateGeo,
  type CountyPrecincts,
  type PrecinctShape,
  type DistrictCountyResults,
} from "~/lib/stateGeo";
import { ShadePalette } from "~/components/Legend";
import { ShiftMark } from "~/components/ShiftMark";
import { pathPoints, centroidOf, polygonArea } from "~/lib/svgGeometry";
import { countyResult, COUNTY_RESULTS } from "~/data/countyResults";
import { STATE_FIPS } from "~/data/stateFips";
import {
  districtResults,
  districtLean,
  districtHouse,
  districtHouseYears,
  districtOldVsNew,
} from "~/data/districtResults";
import { HISTORICAL_COLORS, SHADE_COLORS, SHADE_LABELS, type Shade } from "~/lib/shades";
import { marginToShade, formatMargin, formatVotes } from "~/lib/margin";
import { MapTooltip } from "~/components/MapTooltip";

type Layer = "county" | "district" | "precinct";

/** Max magnification for the drill-in map's zoom slider / pan. */
const MAX_ZOOM = 2.5;

const LAYERS: { id: Layer; label: string }[] = [
  { id: "county", label: "Counties" },
  { id: "district", label: "Districts" },
  { id: "precinct", label: "Precincts" },
];

export interface ZoomContext {
  /** What the map is currently focused on. */
  label: string;
  dPct: number;
  rPct: number;
  /** Optional D/R unit counts (e.g. counties won), for the donut legend. */
  dUnits?: number;
  rUnits?: number;
  unit?: string;
}

export interface StateZoomProps {
  usps: string;
  stateName: string;
  /** "<year>-<office>", used to look up county results. */
  raceKey: string;
  onBack: () => void;
  /** Reports the currently-focused area so the sidebar donut can follow. */
  onContext?: (ctx: ZoomContext | null) => void;
  /** Reports which layer (county / district / precinct) is on screen. */
  onViewChange?: (view: Layer) => void;
  /** When set, spotlight shapes that party won and mute the rest (donut hover). */
  spotlightParty?: "D" | "R" | null;
  /** Where the Shift / Turnout / Plain map pills render (the sidebar, above
   *  the donut). Without it they float over the map's top-left corner. */
  overlaySlot?: HTMLElement | null;
  /**
   * Prediction painting (2026). When `painting` is on, the shading race is only a
   * backdrop: left-click a shape paints it with `selectedShade`, right-click
   * clears it. Which shape you paint follows the layer selector — Counties paints
   * counties, Precincts paints precincts (after you drill into a county).
   */
  painting?: boolean;
  selectedShade?: Shade;
  onSelectShade?: (shade: Shade) => void;
  countyPicks?: Record<string, Shade>;
  precinctPicks?: Record<string, Shade>;
  /** District prediction picks, keyed `"<usps>-<districtId>"`. */
  districtPicks?: Record<string, Shade>;
  onPaintCounty?: (fips: string, shade: Shade | null) => void;
  onPaintPrecinct?: (id: string, shade: Shade | null) => void;
  onPaintDistrict?: (key: string, shade: Shade | null) => void;
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

/** Turnout-weighted D% / R% across a state's counties for a race. `houseAgg`
 *  (precinct-summed per-county House votes, see `countyHouseAgg`) is used
 *  instead of `countyResult` for House race keys, which have no single
 *  county-level result. */
function stateAggregate(
  geo: StateGeo,
  raceKey: string,
  houseAgg?: Record<string, [number, number, number]> | null
): { dPct: number; rPct: number } | null {
  let d = 0, r = 0, total = 0;
  for (const c of geo.counties) {
    if (houseAgg) {
      const v = houseAgg[c.fips];
      if (!v) continue;
      d += v[0]; r += v[1]; total += v[0] + v[1] + v[2];
      continue;
    }
    const res = countyResult(raceKey, c.fips);
    if (res?.rPct == null || res.dPct == null || res.totalVotes == null) continue;
    d += (res.totalVotes * res.dPct) / 100;
    r += (res.totalVotes * res.rPct) / 100;
    total += res.totalVotes;
  }
  if (total === 0) return null;
  return {
    dPct: +((d / total) * 100).toFixed(1),
    rPct: +((r / total) * 100).toFixed(1),
  };
}

/** The one race we have precinct-level vote counts for (see stateGeo PrecinctShape). */
const PRECINCT_RACE = "2020-president";

function officeAndYearOf(raceKey: string): { year: number; office: string } {
  const [y, ...rest] = raceKey.split("-");
  return { year: Number(y), office: rest.join("-") };
}

/** The most recent EARLIER election of the same office we have county- (or,
 *  for House, district-) level data for — the shift overlay's baseline. Null
 *  when there's nothing earlier to compare `raceKey` against. */
function previousRaceKey(
  usps: string,
  fipsPrefix: string,
  raceKey: string
): string | null {
  const { year, office } = officeAndYearOf(raceKey);
  const years =
    office === "house"
      ? districtHouseYears(usps).map(Number)
      : Object.keys(COUNTY_RESULTS)
          .filter((k) => k.endsWith(`-${office}`))
          .filter((k) =>
            Object.keys(COUNTY_RESULTS[k]).some((f) => f.startsWith(fipsPrefix))
          )
          .map((k) => Number(k.split("-")[0]));
  const prior = years.filter((y) => y < year).sort((a, b) => b - a)[0];
  return prior != null ? `${prior}-${office}` : null;
}

/** One precinct's own 2020 vote — counts, shares, winner, margin — or null. */
function precinctVote(pr?: [number, number, number]) {
  if (!pr) return null;
  const [d, r, o] = pr;
  const total = d + r + o;
  if (total === 0) return null;
  const dPct = (d / total) * 100;
  const rPct = (r / total) * 100;
  return {
    d, r, o, total,
    dPct, rPct,
    winner: (d >= r ? "D" : "R") as "D" | "R",
    marginPct: Math.abs(dPct - rPct),
  };
}

/** Fill for a county / precinct from its parent-race result. */
function resultFill(fips: string, raceKey: string): { fill?: string; className?: string } {
  const res = countyResult(raceKey, fips);
  // No data for this county/race: white, matching the national map's own
  // "nothing here" default — neutral, not blue or red.
  if (!res?.winner) return { fill: "#ffffff" };
  const party = res.winner === "D" ? "D" : "R";
  if (res.marginPct != null) {
    return { fill: SHADE_COLORS[marginToShade(party, res.marginPct, { allowTossup: false })] };
  }
  return { fill: party === "D" ? HISTORICAL_COLORS.D : HISTORICAL_COLORS.R };
}

export function StateZoom({
  usps,
  stateName,
  raceKey,
  onBack,
  onContext,
  onViewChange,
  spotlightParty,
  overlaySlot,
  painting = false,
  selectedShade = "tossup",
  onSelectShade,
  countyPicks,
  precinctPicks,
  districtPicks,
  onPaintCounty,
  onPaintPrecinct,
  onPaintDistrict,
}: StateZoomProps) {
  const [geo, setGeo] = useState<StateGeo | null>(null);
  const [layer, setLayer] = useState<Layer>("county");
  const [focusDistrict, setFocusDistrict] = useState<string | null>(null);
  const [focusCounty, setFocusCounty] = useState<string | null>(null);
  const [precincts, setPrecincts] = useState<CountyPrecincts | null>(null);
  /** For the focused district: { countyFips -> [precinct VTD ids in the district] }. */
  const [districtMap, setDistrictMap] = useState<Record<string, string[]> | null>(
    null
  );
  const [districtCounty, setDistrictCounty] =
    useState<DistrictCountyResults | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState({ k: 1, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; zx: number; zy: number } | null>(null);
  /** True once the pointer moved far enough that the gesture is a pan, not a
   *  click — checked in every shape's onClick so panning never drills/paints. */
  const panned = useRef(false);

  useEffect(() => {
    let live = true;
    setGeo(null);
    setFocusDistrict(null);
    setFocusCounty(null);
    setDistrictCounty(null);
    loadStateGeo(usps).then((g) => live && setGeo(g));
    loadDistrictCounty(usps).then((d) => live && setDistrictCounty(d));
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

  // Which precincts (by county) actually make up the focused district. Small
  // lookup only — precinct geometry is still loaded per county on click.
  useEffect(() => {
    let live = true;
    setDistrictMap(null);
    if (!focusDistrict) return;
    loadDistrictPrecincts(usps).then((a) => {
      if (live && a?.[focusDistrict]) setDistrictMap(a[focusDistrict]);
    });
    return () => {
      live = false;
    };
  }, [usps, focusDistrict]);

  /** VTD ids in the focused district for the county currently drilled into. */
  const inDistrictIds = useMemo(() => {
    const ids = focusCounty ? districtMap?.[focusCounty] : undefined;
    return ids && ids.length ? new Set(ids) : null;
  }, [districtMap, focusCounty]);

  // Reset zoom/pan whenever the view changes.
  useEffect(() => {
    setZoom({ k: 1, x: 0, y: 0 });
  }, [layer, focusDistrict, focusCounty]);

  const updatePos = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    // Window coordinates -- MapTooltip is fixed to the viewport.
    if (rect) setPos({ x: e.clientX, y: e.clientY });
  }, []);

  const districts = geo?.districts ?? [];
  const precinctsAvailable = hasPrecincts(usps);

  /** {d,r,o} counties -> a shade-ready {winner,dPct,rPct}. */
  const sumShade = useCallback(
    (byFips?: Record<string, [number, number, number]>) => {
      if (!byFips) return undefined;
      let d = 0, r = 0, o = 0;
      for (const v of Object.values(byFips)) { d += v[0]; r += v[1]; o += v[2]; }
      const tot = d + r + o;
      if (tot === 0) return undefined;
      const dPct = +((d / tot) * 100).toFixed(1);
      const rPct = +((r / tot) * 100).toFixed(1);
      return { winner: (d >= r ? "D" : "R") as "D" | "R", dPct, rPct };
    },
    []
  );

  /** Whole-state House county coloring, for every House race key at once (not
   *  just the selected one): `districtCounty["<year>-house"]` is keyed by
   *  district, not county, so a county's own map color when NOT drilled into a
   *  district would otherwise have nothing to shade it (a county has no single
   *  "county-level" House result — it can span several districts). Sum each
   *  county's precinct-summed slice across every district it touches to get its
   *  real, split-aware House vote. Indexed by race key so the shift-arrow
   *  overlay (which needs a *previous* year's House numbers too) can reuse it. */
  const houseAggByKey = useMemo(() => {
    const out: Record<string, Record<string, [number, number, number]>> = {};
    if (!districtCounty) return out;
    for (const [key, byCd] of Object.entries(districtCounty)) {
      if (!key.endsWith("-house")) continue;
      const agg: Record<string, [number, number, number]> = {};
      for (const cdMap of Object.values(byCd)) {
        for (const [fips, arr] of Object.entries(cdMap)) {
          const cur = agg[fips] ?? [0, 0, 0];
          agg[fips] = [cur[0] + arr[0], cur[1] + arr[1], cur[2] + arr[2]];
        }
      }
      out[key] = agg;
    }
    return out;
  }, [districtCounty]);
  const countyHouseAgg = houseAggByKey[raceKey] ?? null;

  /** How to shade a district for the selected race. House -> its own U.S. House
   *  vote (the aggregate, or the precinct-summed districtCounty). Otherwise the
   *  president/senate result for that district. */
  const districtShade = useCallback(
    (num: number) => {
      const year = raceKey.split("-")[0];
      const dc = districtCounty?.[raceKey]?.[String(num)];
      if (raceKey.endsWith("-house"))
        return districtHouse(usps, num, year) ?? sumShade(dc);
      return (
        districtResults(usps, num)?.[raceKey] ??
        sumShade(dc) ??
        districtLean(usps, num, raceKey)
      );
    },
    [usps, raceKey, districtCounty, sumShade]
  );
  // Per-race precinct vote for the selected raceKey, where the state has it
  // (see build-precinct-years.mjs). `pr` is the 2020-president alias. When a
  // race has no precinct data the layer falls back to county-result shading.
  const precinctRaceVote = useCallback(
    (p: { pr?: [number, number, number]; prr?: Record<string, [number, number, number]> }) =>
      p.prr?.[raceKey] ?? (raceKey === PRECINCT_RACE ? p.pr : undefined),
    [raceKey]
  );
  /** Same lookup as `precinctRaceVote`, but for an arbitrary race key — used
   *  by the precinct shift overlay to also fetch the *previous* race's vote. */
  const precinctVoteFor = useCallback(
    (
      p: { pr?: [number, number, number]; prr?: Record<string, [number, number, number]> },
      key: string
    ) => p.prr?.[key] ?? (key === PRECINCT_RACE ? p.pr : undefined),
    []
  );
  const precinctsHaveVote = (precincts?.precincts ?? []).some((p) =>
    precinctRaceVote(p)
  );

  // ── Shift overlay: arrows showing the swing from the previous election of
  // the same office to the one selected now (county layer, or district layer
  // when zoomed to Districts). Off by default; toggled next to the layer
  // selector, and meaningless while painting 2026 predictions (no backdrop
  // race to compare against).
  const [showShift, setShowShift] = useState(false);
  // A static lookup, not derived from `geo` (which loads async) — so the
  // Shift button's availability doesn't depend on the county-geometry fetch
  // having finished. Previously this came from `geo.counties[0].fips`, which
  // meant on a slow/first (uncached) load the button just wasn't in the DOM
  // yet — a click did nothing, and only a second visit (state now cached)
  // was fast enough to not notice the gap.
  const stateFipsPrefix = STATE_FIPS[usps] ?? null;
  const prevRaceKey = useMemo(
    () => (stateFipsPrefix ? previousRaceKey(usps, stateFipsPrefix, raceKey) : null),
    [usps, stateFipsPrefix, raceKey]
  );
  const isHouseRace = raceKey.endsWith("-house");
  /** fips -> signed swing in points, D positive, R negative. */
  const countySwings = useMemo(() => {
    if (!geo || !prevRaceKey) return null;
    const curHouse = houseAggByKey[raceKey];
    const prevHouse = houseAggByKey[prevRaceKey];
    const out: Record<string, number> = {};
    for (const c of geo.counties) {
      const cur =
        countyResult(raceKey, c.fips) ??
        (isHouseRace && curHouse?.[c.fips] ? sumShade({ c: curHouse[c.fips] }) : undefined);
      const prev =
        countyResult(prevRaceKey, c.fips) ??
        (isHouseRace && prevHouse?.[c.fips] ? sumShade({ c: prevHouse[c.fips] }) : undefined);
      if (cur?.dPct == null || cur.rPct == null || prev?.dPct == null || prev.rPct == null)
        continue;
      out[c.fips] = cur.dPct - cur.rPct - (prev.dPct - prev.rPct);
    }
    return out;
  }, [geo, raceKey, prevRaceKey, houseAggByKey, isHouseRace]);
  /** district number -> signed swing in points. */
  const districtSwings = useMemo(() => {
    if (!geo || !prevRaceKey) return null;
    const curYear = raceKey.split("-")[0];
    const prevYear = prevRaceKey.split("-")[0];
    const out: Record<number, number> = {};
    for (const d of geo.districts ?? []) {
      const num = Number(d.id);
      const cur = isHouseRace
        ? districtHouse(usps, num, curYear)
        : districtResults(usps, num)?.[raceKey];
      const prev = isHouseRace
        ? districtHouse(usps, num, prevYear)
        : districtResults(usps, num)?.[prevRaceKey];
      if (!cur || !prev) continue;
      out[num] = cur.dPct - cur.rPct - (prev.dPct - prev.rPct);
    }
    return out;
  }, [geo, usps, raceKey, prevRaceKey, isHouseRace]);
  // Scale arrow length to the shapes actually on screen, not a fixed pixel
  // count, so it looks right whether a county view has 8 shapes or 250.
  // districtArrowUnit is only ever drawn at the whole-state district overview
  // (showDistricts requires !focusDistrict), so the state-wide geo.viewBox is
  // always the right denominator for it -- unlike countyArrowUnit below,
  // which is ALSO drawn once a district is focused (the "district-focused
  // county layer"), where it needs baseViewBox instead: see that definition.
  const districtArrowUnit = geo
    ? (() => {
        const [, , w, h] = geo.viewBox.split(" ").map(Number);
        return Math.sqrt((w * h) / Math.max((geo.districts ?? []).length, 1));
      })()
    : 0;

  // ── Turnout overlay: a circle per county/district sized by how many votes
  // were actually cast there for the selected race — same idea as the shift
  // arrows, but magnitude instead of direction. Off by default.
  const [showTurnout, setShowTurnout] = useState(false);
  // With Shift or Turnout on, the partisan choropleth underneath can compete
  // with the overlay for attention — let it be switched off to a flat neutral
  // fill (borders + hover/click still work) so the arrows/circles read clearly.
  const [showBaseFill, setShowBaseFill] = useState(true);
  const flattenFill = !showBaseFill && (showShift || showTurnout) && !painting;
  /** fips -> total votes cast, for the selected raceKey. */
  const countyTurnout = useMemo(() => {
    if (!geo) return null;
    const houseAgg = houseAggByKey[raceKey];
    const out: Record<string, number> = {};
    for (const c of geo.counties) {
      const votes =
        countyResult(raceKey, c.fips)?.totalVotes ??
        (isHouseRace && houseAgg?.[c.fips]
          ? houseAgg[c.fips][0] + houseAgg[c.fips][1] + houseAgg[c.fips][2]
          : undefined);
      if (votes) out[c.fips] = votes;
    }
    return Object.keys(out).length ? out : null;
  }, [geo, raceKey, houseAggByKey, isHouseRace]);
  /** district number -> total votes cast — only available where we have the
   *  precinct-summed districtCounty breakdown for this race (not every
   *  state/year); left blank rather than guessed where we don't. */
  const districtTurnout = useMemo(() => {
    if (!geo || !districtCounty?.[raceKey]) return null;
    const byCd = districtCounty[raceKey];
    const out: Record<number, number> = {};
    for (const d of geo.districts ?? []) {
      const cdMap = byCd[d.id];
      if (!cdMap) continue;
      let total = 0;
      for (const arr of Object.values(cdMap)) total += arr[0] + arr[1] + arr[2];
      if (total) out[Number(d.id)] = total;
    }
    return Object.keys(out).length ? out : null;
  }, [geo, raceKey, districtCounty]);
  const countyTurnoutMax = countyTurnout
    ? Math.max(...Object.values(countyTurnout))
    : 0;
  const districtTurnoutMax = districtTurnout
    ? Math.max(...Object.values(districtTurnout))
    : 0;
  /** Area-proportional radius (not linear — a circle twice the radius reads as
   *  ~4x the value, so scale by sqrt of the vote share) capped to the shapes'
   *  typical size so the biggest county/district doesn't swallow its neighbors. */
  function turnoutRadius(
    unit: number,
    votes: number,
    max: number,
    maxFraction = 0.42,
    floorFraction = 0.05
  ): number {
    if (!max) return 0;
    return Math.max(unit * floorFraction, Math.sqrt(votes / max) * unit * maxFraction);
  }

  const focusedCounty = geo?.counties.find((c) => c.fips === focusCounty) ?? null;
  const focusedDistrict = districts.find((d) => d.id === focusDistrict) ?? null;

  // ── Shift/Turnout for counties WITHIN a focused district — e.g. OH-7 is
  // Medina and Ashland whole, plus slices of Cuyahoga and Wayne. Reuses each
  // county's OWN swing/turnout everywhere except for the split counties,
  // where `districtCounty`'s per-district slice (only built for OH so far)
  // stands in so a split county's arrow/circle reflects just its part of the
  // district, not the whole county bleeding in from its other district(s).
  /** The counties that make up the focused district (accurate, from the map).
   *  Defined up here (not just below, by districtCountyPrecincts) because
   *  districtCountySwings/districtCountyTurnout need it too: without this
   *  filter they fell back to a STATEWIDE county result for any county
   *  missing a district-specific slice, which included neighboring counties
   *  outside the district entirely -- drawing a shift arrow (sized, after
   *  the per-county area fix, for that neighbor's own full extent) on a
   *  county only partially visible at the edge of the focused crop, reading
   *  as wildly oversized relative to what's actually on screen. */
  const districtCountyFips = useMemo(
    () => (districtMap ? new Set(Object.keys(districtMap)) : null),
    [districtMap]
  );
  const districtCountySwings = useMemo(() => {
    if (!geo || !focusedDistrict || !prevRaceKey) return null;
    const curByCd = districtCounty?.[raceKey]?.[focusedDistrict.id];
    const prevByCd = districtCounty?.[prevRaceKey]?.[focusedDistrict.id];
    const out: Record<string, number> = {};
    for (const c of geo.counties) {
      if (!districtCountyFips?.has(c.fips)) continue;
      const curArr = curByCd?.[c.fips];
      const prevArr = prevByCd?.[c.fips];
      const cur = curArr ? sumShade({ c: curArr }) : countyResult(raceKey, c.fips);
      const prev = prevArr ? sumShade({ c: prevArr }) : countyResult(prevRaceKey, c.fips);
      if (cur?.dPct == null || cur.rPct == null || prev?.dPct == null || prev.rPct == null)
        continue;
      out[c.fips] = cur.dPct - cur.rPct - (prev.dPct - prev.rPct);
    }
    return Object.keys(out).length ? out : null;
  }, [geo, focusedDistrict, prevRaceKey, districtCounty, raceKey, sumShade, districtCountyFips]);
  const districtCountyTurnout = useMemo(() => {
    if (!geo || !focusedDistrict) return null;
    const curByCd = districtCounty?.[raceKey]?.[focusedDistrict.id];
    const out: Record<string, number> = {};
    for (const c of geo.counties) {
      if (!districtCountyFips?.has(c.fips)) continue;
      const arr = curByCd?.[c.fips];
      const votes = arr ? arr[0] + arr[1] + arr[2] : countyResult(raceKey, c.fips)?.totalVotes;
      if (votes) out[c.fips] = votes;
    }
    return Object.keys(out).length ? out : null;
  }, [geo, focusedDistrict, districtCounty, raceKey, districtCountyFips]);
  const districtCountyTurnoutMax = districtCountyTurnout
    ? Math.max(...Object.values(districtCountyTurnout))
    : 0;
  // Which swing/turnout data the county layer draws from right now.
  const activeCountySwings = focusedDistrict ? districtCountySwings : countySwings;
  const activeCountyTurnout = focusedDistrict ? districtCountyTurnout : countyTurnout;
  const activeCountyTurnoutMax = focusedDistrict ? districtCountyTurnoutMax : countyTurnoutMax;

  // Which layer's label is highlighted in the selector / breadcrumb.
  const view: Layer = focusCounty
    ? "precinct"
    : focusDistrict
    ? "district"
    : layer;

  useEffect(() => {
    onViewChange?.(view);
  }, [view, onViewChange]);

  // What the SVG draws:
  //  - focused district, no county  -> its counties (pick one to drill in)
  //  - focused district + county    -> only that county's in-district precincts
  //  - county only                  -> that whole county's precincts
  //  - Districts tab, nothing focused -> all districts (pickable)
  //  - otherwise                    -> all counties (pick surface)
  const showDistrictCountyPx = !!focusedDistrict && !!focusCounty;
  const showPrecincts = !!focusCounty && !focusedDistrict;
  const showDistricts = !focusCounty && layer === "district" && !focusDistrict;
  const showCounties = !focusCounty && !showDistricts;

  /** In-district precinct shapes for the drilled-into county. */
  const districtCountyPrecincts = useMemo(() => {
    if (!showDistrictCountyPx || !precincts || !inDistrictIds) return null;
    return precincts.precincts.filter((p) => inDistrictIds.has(p.id));
  }, [showDistrictCountyPx, precincts, inDistrictIds]);

  const baseViewBox = focusedCounty
    ? districtCountyPrecincts && districtCountyPrecincts.length > 0
      ? bboxOf(districtCountyPrecincts.map((p) => p.d), 8)
      : precincts?.viewBox ?? bboxOf([focusedCounty.d])
    : focusedDistrict
    ? districtCountyFips && geo
      ? bboxOf(
          geo.counties
            .filter((c) => districtCountyFips.has(c.fips))
            .map((c) => c.d),
          10
        )
      : bboxOf([focusedDistrict.d], 12)
    : geo?.viewBox ?? "0 0 800 600";

  // County shift-arrow/turnout-circle unit: baseViewBox already tightens to
  // just the focused district's bounding box (see above), so this needs the
  // SAME tightened area and the count of counties actually inside that box
  // -- not the whole state's -- or arrows drawn on a handful of counties in
  // a small, zoomed-in district read oversized relative to the shapes they
  // sit on. Mirrors precinctArrowUnit below exactly, one drill level up.
  const countyArrowUnit = useMemo(() => {
    if (!geo) return 0;
    const [, , w, h] = baseViewBox.split(" ").map(Number);
    const count = focusedDistrict
      ? Math.max(districtCountyFips?.size ?? 0, 1)
      : Math.max(geo.counties.length, 1);
    return Math.sqrt((w * h) / count);
  }, [geo, baseViewBox, focusedDistrict, districtCountyFips]);

  // Apply zoom/pan by shrinking + translating the viewBox.
  const viewBox = useMemo(() => {
    const [x, y, w, h] = baseViewBox.split(" ").map(Number);
    const k = zoom.k;
    return `${x + zoom.x + (w * (1 - 1 / k)) / 2} ${
      y + zoom.y + (h * (1 - 1 / k)) / 2
    } ${w / k} ${h / k}`;
  }, [baseViewBox, zoom]);

  // ── Precinct-level Shift/Turnout: same overlay, one layer deeper. Precinct
  // vote data is per-race and per-precinct (see build-precinct-years.mjs), so
  // both circles and arrows are simply left off any precinct missing a year's
  // vote — no guessing across a redistricting or a race with no precinct data.
  /** Precinct shapes actually on screen — a whole county's precincts, or just
   *  the slice inside a focused district. Shared by the precinct layer below
   *  and its Shift/Turnout overlay. */
  const activePrecincts = useMemo(
    () =>
      showDistrictCountyPx
        ? districtCountyPrecincts ?? []
        : showPrecincts
        ? precincts?.precincts ?? []
        : [],
    [showDistrictCountyPx, districtCountyPrecincts, showPrecincts, precincts]
  );
  const precinctArrowUnit = useMemo(() => {
    if (!activePrecincts.length) return 0;
    const [, , w, h] = baseViewBox.split(" ").map(Number);
    return Math.sqrt((w * h) / activePrecincts.length);
  }, [activePrecincts, baseViewBox]);
  /** precinct id -> total votes cast, for the selected raceKey. */
  const precinctTurnout = useMemo(() => {
    if (!activePrecincts.length) return null;
    const out: Record<string, number> = {};
    for (const p of activePrecincts) {
      const v = precinctRaceVote(p);
      if (!v) continue;
      const total = v[0] + v[1] + v[2];
      if (total) out[p.id] = total;
    }
    return Object.keys(out).length ? out : null;
  }, [activePrecincts, precinctRaceVote]);
  const precinctTurnoutMax = precinctTurnout
    ? Math.max(...Object.values(precinctTurnout))
    : 0;
  /** precinct id -> signed swing in points since `prevRaceKey`, D positive. */
  const precinctSwings = useMemo(() => {
    if (!activePrecincts.length || !prevRaceKey) return null;
    const out: Record<string, number> = {};
    for (const p of activePrecincts) {
      const cur = precinctRaceVote(p);
      const prev = precinctVoteFor(p, prevRaceKey);
      if (!cur || !prev) continue;
      const curTotal = cur[0] + cur[1] + cur[2];
      const prevTotal = prev[0] + prev[1] + prev[2];
      if (!curTotal || !prevTotal) continue;
      const curMargin = ((cur[0] - cur[1]) / curTotal) * 100;
      const prevMargin = ((prev[0] - prev[1]) / prevTotal) * 100;
      out[p.id] = curMargin - prevMargin;
    }
    return Object.keys(out).length ? out : null;
  }, [activePrecincts, prevRaceKey, precinctRaceVote, precinctVoteFor]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, zx: zoom.x, zy: zoom.y };
    panned.current = false;
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !svgRef.current) return;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4)
      panned.current = true;
    const [, , w] = baseViewBox.split(" ").map(Number);
    const scale = (w / zoom.k) / svgRef.current.clientWidth;
    const dx = (e.clientX - d.x) * scale;
    const dy = (e.clientY - d.y) * scale;
    setZoom((z) => ({ ...z, x: d.zx - dx, y: d.zy - dy }));
  }
  function endDrag() {
    drag.current = null;
    // let the click that ends this gesture through, then re-arm
    setTimeout(() => (panned.current = false), 0);
  }

  /** Set the zoom level from the slider; snapping back to 1 re-centres. */
  function setZoomLevel(k: number) {
    setZoom((z) =>
      k <= 1 ? { k: 1, x: 0, y: 0 } : { ...z, k: Math.min(k, MAX_ZOOM) }
    );
  }

  const hoveredCounty =
    hovered && showCounties ? geo?.counties.find((c) => c.fips === hovered) : null;
  const hoveredDistrict =
    hovered && showDistricts
      ? districts.find((d) => d.id === hovered)
      : null;
  const hoveredPrecinct =
    hovered && (showPrecincts || showDistrictCountyPx)
      ? precincts?.precincts.find((p) => p.id === hovered)
      : null;

  // Counties in the focused district. Prefer the exact precinct-derived set;
  // fall back to a geometry test only while that map is still loading.
  const districtCounties = useMemo(() => {
    if (!focusedDistrict || !geo) return null;
    if (districtCountyFips) return districtCountyFips;
    const poly = pathPoints(focusedDistrict.d);
    return new Set(
      geo.counties
        .filter((c) => {
          const pts = pathPoints(c.d);
          if (pts.length === 0) return false;
          if (pointInPoly(centroidOf(pts), poly)) return true;
          const step = Math.max(1, Math.floor(pts.length / 14));
          let hits = 0;
          for (let i = 0; i < pts.length; i += step) {
            if (pointInPoly(pts[i], poly)) hits += 1;
          }
          return hits >= 2;
        })
        .map((c) => c.fips)
    );
  }, [focusedDistrict, geo, districtCountyFips]);

  const zoomed = zoom.k > 1.01 || zoom.x !== 0 || zoom.y !== 0;

  // Report the focused area so the sidebar donut can follow the drill-down.
  useEffect(() => {
    if (!onContext) return;
    if (!geo) {
      onContext(null);
      return;
    }
    // Paint mode, nothing drilled into: blank map, so let the sidebar fall back
    // to the 2026 prediction tally instead of a backdrop-race donut.
    if (painting && !focusedCounty && !focusedDistrict) {
      onContext(null);
      return;
    }
    if (focusedCounty && focusedDistrict) {
      const dcp = districtCountyPrecincts;
      if (dcp && dcp.length && dcp.some((p) => precinctRaceVote(p))) {
        let d = 0, r = 0, o = 0;
        for (const p of dcp) {
          const v = precinctRaceVote(p);
          if (v) {
            d += v[0];
            r += v[1];
            o += v[2];
          }
        }
        const total = d + r + o;
        if (total > 0) {
          onContext({
            label: `${focusedDistrict.label} in ${focusedCounty.name} Co.`,
            dPct: +((d / total) * 100).toFixed(1),
            rPct: +((r / total) * 100).toFixed(1),
            dUnits: d,
            rUnits: r,
            unit: "votes",
          });
          return;
        }
      }
      const cr = countyResult(raceKey, focusedCounty.fips);
      onContext(
        cr?.rPct != null && cr.dPct != null
          ? {
              label: `${focusedCounty.name} Co. (in ${focusedDistrict.label})`,
              dPct: cr.dPct,
              rPct: cr.rPct,
            }
          : null
      );
      return;
    }
    if (focusedCounty) {
      const r = countyResult(raceKey, focusedCounty.fips);
      const houseR =
        !r && countyHouseAgg?.[focusedCounty.fips]
          ? sumShade({ c: countyHouseAgg[focusedCounty.fips] })
          : undefined;
      const dPct = r?.dPct ?? houseR?.dPct;
      const rPct = r?.rPct ?? houseR?.rPct;
      onContext(
        rPct != null && dPct != null
          ? { label: `${focusedCounty.name} County`, dPct, rPct }
          : null
      );
      return;
    }
    if (focusedDistrict) {
      const l = districtShade(Number(focusedDistrict.id));
      onContext(
        l ? { label: `${usps} ${focusedDistrict.label}`, dPct: l.dPct, rPct: l.rPct } : null
      );
      return;
    }
    if (view === "district") {
      let d = 0, r = 0;
      for (const dist of geo.districts ?? []) {
        const l = districtShade(Number(dist.id));
        if (l?.winner === "D") d += 1;
        else if (l?.winner === "R") r += 1;
      }
      const agg = stateAggregate(geo, raceKey, countyHouseAgg);
      onContext(
        agg
          ? { ...agg, label: `${stateName} districts`, dUnits: d, rUnits: r, unit: "districts" }
          : null
      );
      return;
    }
    // county view (whole state)
    const agg = stateAggregate(geo, raceKey, countyHouseAgg);
    if (!agg) {
      onContext(null);
      return;
    }
    let dC = 0, rC = 0;
    for (const c of geo.counties) {
      const cr =
        countyResult(raceKey, c.fips) ??
        (countyHouseAgg?.[c.fips] ? sumShade({ c: countyHouseAgg[c.fips] }) : undefined);
      if (cr?.winner === "D") dC += 1;
      else if (cr?.winner === "R") rC += 1;
    }
    onContext({ ...agg, label: `${stateName} counties`, dUnits: dC, rUnits: rC, unit: "counties" });
  }, [
    geo,
    focusedCounty,
    focusedDistrict,
    districtCountyPrecincts,
    view,
    raceKey,
    usps,
    stateName,
    painting,
    onContext,
    districtShade,
    precinctRaceVote,
    countyHouseAgg,
    sumShade,
  ]);

  useEffect(() => () => onContext?.(null), [onContext]);

  // Shift / Turnout / Plain map pills — rendered above the sidebar donut via
  // `overlaySlot`, or floating over the map's top-left corner without one.
  const overlayPills = (
    <>
        {!painting &&
          ((!focusedCounty &&
            !focusedDistrict &&
            (view === "county" || view === "district") &&
            prevRaceKey) ||
            (focusedDistrict && !focusCounty && districtCountySwings) ||
            (focusCounty && precinctSwings)) && (
            <button
              onClick={() => setShowShift((v) => !v)}
              title={`Shift arrows: swing from ${prevRaceKey} to ${raceKey}`}
              className={`pointer-events-auto rounded-full px-3 py-1 text-[11px] font-medium shadow transition-colors ${
                showShift
                  ? "bg-indigo-600 text-white"
                  : "bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-900"
              }`}
            >
              Shift ↔
            </button>
          )}
        {!painting &&
          ((!focusedCounty &&
            !focusedDistrict &&
            (view === "county" ? countyTurnout : view === "district" ? districtTurnout : null)) ||
            (focusedDistrict && !focusCounty && districtCountyTurnout) ||
            (focusCounty && precinctTurnout)) && (
            <button
              onClick={() => setShowTurnout((v) => !v)}
              title="Turnout: circle size is how many votes were cast, for the selected race/year"
              className={`pointer-events-auto rounded-full px-3 py-1 text-[11px] font-medium shadow transition-colors ${
                showTurnout
                  ? "bg-indigo-600 text-white"
                  : "bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-900"
              }`}
            >
              Turnout ○
            </button>
          )}
        {!painting && (showShift || showTurnout) && (
          <button
            onClick={() => setShowBaseFill((v) => !v)}
            title={
              showBaseFill
                ? "Hide the county/district colors so the overlay stands out on its own"
                : "Show the county/district colors again"
            }
            className={`pointer-events-auto rounded-full px-3 py-1 text-[11px] font-medium shadow transition-colors ${
              !showBaseFill
                ? "bg-indigo-600 text-white"
                : "bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-900"
            }`}
          >
            Plain map
          </button>
        )}
    </>
  );

  return (
    <div>
      {painting && onSelectShade && (
        <div className="mb-3 flex justify-center">
          <ShadePalette selected={selectedShade} onSelect={onSelectShade} />
        </div>
      )}
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
        {overlaySlot !== undefined ? (
          overlaySlot && createPortal(overlayPills, overlaySlot)
        ) : (
          <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col items-start gap-1.5">
            {overlayPills}
          </div>
        )}

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
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            className={`mx-auto h-auto max-h-[90vh] w-auto max-w-full touch-none select-none ${
              drag.current ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {/* COUNTY LAYER */}
            {showCounties &&
              geo.counties.map((c) => {
                const canPaintCounty =
                  painting && !focusedDistrict && layer === "county";
                // Picks are 2026 predictions — only shown in paint mode, never
                // bleeding onto a past-election results map.
                const pick = painting ? countyPicks?.[c.fips] : undefined;
                // In paint mode the drill-down starts as an all-toss-up canvas
                // — no backdrop race — so your picks are the only real call.
                // In a focused district, shade each county by ITS slice of the
                // selected race (from the precinct-summed districtCounty),
                // falling back to the whole-district shade, then the county
                // result.
                const dcArr =
                  districtCounty?.[raceKey]?.[focusedDistrict?.id ?? ""]?.[c.fips];
                const dcSlice =
                  focusedDistrict && !painting
                    ? (dcArr ? sumShade({ c: dcArr }) : undefined) ??
                      districtShade(Number(focusedDistrict.id))
                    : undefined;
                const houseAgg =
                  !focusedDistrict && countyHouseAgg?.[c.fips]
                    ? sumShade({ c: countyHouseAgg[c.fips] })
                    : undefined;
                const base =
                  painting && !focusedDistrict
                    ? { fill: SHADE_COLORS.tossup }
                    : dcSlice
                    ? {
                        fill: SHADE_COLORS[
                          marginToShade(
                            dcSlice.winner,
                            Math.abs(dcSlice.rPct - dcSlice.dPct),
                            { allowTossup: false }
                          )
                        ],
                      }
                    : houseAgg
                    ? {
                        fill: SHADE_COLORS[
                          marginToShade(
                            houseAgg.winner,
                            Math.abs(houseAgg.rPct - houseAgg.dPct),
                            { allowTossup: false }
                          )
                        ],
                      }
                    : resultFill(c.fips, raceKey);
                const fill = pick
                  ? SHADE_COLORS[pick]
                  : flattenFill
                  ? "#ffffff"
                  : base.fill;
                const className = pick ? "" : flattenFill ? "" : base.className;
                // In a focused district, only its counties are live; others are
                // faint context (or everything, briefly, while the map loads).
                const inDistrict =
                  !focusedDistrict || (districtCounties?.has(c.fips) ?? true);
                const cw = countyResult(raceKey, c.fips)?.winner ?? houseAgg?.winner;
                const muted =
                  spotlightParty != null && cw != null && cw !== spotlightParty;
                return (
                  <path
                    key={c.fips}
                    d={c.d}
                    fill={fill}
                    className={
                      (className ?? "") +
                      (inDistrict ? " cursor-pointer" : "") +
                      " transition-[filter,opacity] duration-100"
                    }
                    stroke={focusedDistrict || flattenFill || painting ? "#111827" : "#ffffff"}
                    strokeWidth={hovered === c.fips ? 2 : focusedDistrict ? 0.9 : 0.6}
                    opacity={!inDistrict ? 0.1 : muted ? 0.2 : 1}
                    pointerEvents={inDistrict ? undefined : "none"}
                    style={{ filter: hovered === c.fips ? "brightness(1.12)" : undefined }}
                    onMouseEnter={() => setHovered(c.fips)}
                    onMouseMove={updatePos}
                    onMouseLeave={() => setHovered((h) => (h === c.fips ? null : h))}
                    onClick={() => {
                      if (panned.current) return;
                      if (canPaintCounty) {
                        onPaintCounty?.(c.fips, selectedShade);
                        return;
                      }
                      setFocusCounty(c.fips);
                      setHovered(null);
                    }}
                    onContextMenu={
                      canPaintCounty
                        ? (e) => {
                            e.preventDefault();
                            onPaintCounty?.(c.fips, null);
                          }
                        : undefined
                    }
                  >
                    <title>{c.name}</title>
                  </path>
                );
              })}

            {/* Gray out the part of a split county that falls OUTSIDE the
                focused district (e.g. Cuyahoga is only partly in OH-7).
                Combining a county's path with the district's under
                fill-rule="evenodd" paints "district XOR county" — which
                is NOT just this county's outside-district sliver, it's
                also every OTHER county's share of the district (a point
                inside the district but outside THIS county still gets one
                odd crossing). With several counties in one district, each
                one's mask then bled across all the others, darkening the
                whole district almost everywhere. Clipping each mask to
                that county's own shape keeps it from ever painting past
                that county's boundary, so only its true outside-district
                sliver goes dark. */}
            {showCounties &&
              focusedDistrict &&
              geo.counties
                .filter((c) => districtCounties?.has(c.fips) ?? true)
                .map((c) => (
                  <g key={`districtmask-${c.fips}`} clipPath={`url(#clip-dm-${c.fips})`}>
                    <clipPath id={`clip-dm-${c.fips}`}>
                      <path d={c.d} />
                    </clipPath>
                    <path
                      d={`${c.d} ${focusedDistrict.d}`}
                      fillRule="evenodd"
                      fill="#000000"
                      fillOpacity={0.45}
                      pointerEvents="none"
                    />
                  </g>
                ))}

            {/* TURNOUT CIRCLES — area-proportional to votes cast, colored by
                who won. Drawn under the shift arrows so both can be on at once.
                Works both at the top county view and inside a focused district
                (activeCountyTurnout/activeCountySwings switch to the
                district-sliced numbers there — see districtCountySwings). */}
            {showTurnout &&
              showCounties &&
              activeCountyTurnout &&
              geo.counties.map((c) => {
                const votes = activeCountyTurnout[c.fips];
                if (!votes) return null;
                const pts = pathPoints(c.d);
                const [cx, cy] = centroidOf(pts);
                // This county's OWN size, not a state/district-wide average —
                // see countyArrowUnit's comment for why: one big anchor county
                // (Fulton, Cook, ...) next to several small ones otherwise
                // skews every county in the group to the big one's scale.
                const unit = Math.sqrt(polygonArea(pts)) || countyArrowUnit;
                const r = turnoutRadius(unit, votes, activeCountyTurnoutMax);
                const dcArr = focusedDistrict
                  ? districtCounty?.[raceKey]?.[focusedDistrict.id]?.[c.fips]
                  : undefined;
                const winner =
                  (dcArr ? sumShade({ c: dcArr })?.winner : undefined) ??
                  countyResult(raceKey, c.fips)?.winner ??
                  (isHouseRace && houseAggByKey[raceKey]?.[c.fips]
                    ? sumShade({ c: houseAggByKey[raceKey][c.fips] })?.winner
                    : undefined);
                const color =
                  winner === "D"
                    ? HISTORICAL_COLORS.D
                    : winner === "R"
                    ? HISTORICAL_COLORS.R
                    : "#71717a";
                return (
                  <circle
                    key={`turnout-${c.fips}`}
                    cx={cx} cy={cy} r={r}
                    fill={color} fillOpacity={0.35}
                    stroke={color} strokeWidth={1}
                    className="pointer-events-none"
                  />
                );
              })}

            {/* SHIFT ARROWS — swing from the previous same-office election to
                the one selected now. Left + blue = shifted D, right + red = R. */}
            {showShift &&
              showCounties &&
              activeCountySwings &&
              geo.counties.map((c) => {
                const swing = activeCountySwings[c.fips];
                if (swing == null) return null;
                const pts = pathPoints(c.d);
                const [cx, cy] = centroidOf(pts);
                // Per-county, not a group average -- see the turnout circle
                // above and countyArrowUnit's comment for why.
                const unit = Math.sqrt(polygonArea(pts)) || countyArrowUnit;
                const dcArr = focusedDistrict
                  ? districtCounty?.[raceKey]?.[focusedDistrict.id]?.[c.fips]
                  : undefined;
                const cWinner =
                  (dcArr ? sumShade({ c: dcArr })?.winner : undefined) ??
                  countyResult(raceKey, c.fips)?.winner ??
                  (isHouseRace && houseAggByKey[raceKey]?.[c.fips]
                    ? sumShade({ c: houseAggByKey[raceKey][c.fips] })?.winner
                    : undefined);
                const tieWinner = cWinner === "D" || cWinner === "R" ? cWinner : undefined;
                return (
                  <ShiftMark
                    key={`shift-${c.fips}`}
                    cx={cx}
                    cy={cy}
                    swing={swing}
                    unit={unit}
                    tieWinner={tieWinner}
                  />
                );
              })}

            {/* DISTRICT LAYER */}
            {showDistricts &&
              districts.map((d) => {
                const canPaintDistrict = painting && layer === "district";
                const key = `${usps}-${d.id}`;
                const pick = painting ? districtPicks?.[key] : undefined;
                const lean = districtShade(Number(d.id));
                const fill = pick
                  ? SHADE_COLORS[pick]
                  : flattenFill
                  ? "#ffffff"
                  : painting
                  ? SHADE_COLORS.tossup
                  : lean
                  ? SHADE_COLORS[
                      marginToShade(lean.winner, Math.abs(lean.rPct - lean.dPct), {
                        allowTossup: false,
                      })
                    ]
                  : undefined;
                const isFocus = focusDistrict === d.id;
                const faded = focusDistrict != null && !isFocus;
                const muted =
                  spotlightParty != null &&
                  lean != null &&
                  lean.winner !== spotlightParty;
                const flipped =
                  !painting &&
                  districtOldVsNew(usps, Number(d.id), raceKey.split("-")[0])
                    ?.flipped;
                const c = flipped ? centroidOf(pathPoints(d.d)) : null;
                return (
                  <g key={d.id}>
                  <path
                    d={d.d}
                    fill={fill}
                    className={
                      (fill ? "" : "fill-gray-300 dark:fill-gray-600") +
                      " cursor-pointer transition-[filter,opacity] duration-100"
                    }
                    stroke={flattenFill || painting ? "#111827" : "#ffffff"}
                    strokeWidth={hovered === d.id || isFocus ? 2 : 1.1}
                    opacity={faded ? 0.15 : muted ? 0.2 : 1}
                    style={{
                      filter: hovered === d.id ? "brightness(1.1)" : undefined,
                    }}
                    onMouseEnter={() => setHovered(d.id)}
                    onMouseMove={updatePos}
                    onMouseLeave={() => setHovered((h) => (h === d.id ? null : h))}
                    onClick={() => {
                      if (panned.current) return;
                      if (canPaintDistrict) {
                        onPaintDistrict?.(key, selectedShade);
                        return;
                      }
                      setFocusDistrict((cur) => (cur === d.id ? null : d.id));
                      setHovered(null);
                    }}
                    onContextMenu={
                      canPaintDistrict
                        ? (e) => {
                            e.preventDefault();
                            onPaintDistrict?.(key, null);
                          }
                        : undefined
                    }
                  >
                    <title>{d.label}</title>
                  </path>
                  {c && (
                    <text
                      x={c[0]}
                      y={c[1]}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none fill-amber-500 font-bold"
                      style={{ fontSize: 14, paintOrder: "stroke" }}
                      stroke="#ffffff"
                      strokeWidth={0.8}
                    >
                      ⇄
                    </text>
                  )}
                  </g>
                );
              })}

            {showTurnout &&
              showDistricts &&
              districtTurnout &&
              districts.map((d) => {
                const votes = districtTurnout[Number(d.id)];
                if (!votes) return null;
                const [cx, cy] = centroidOf(pathPoints(d.d));
                const r = turnoutRadius(districtArrowUnit, votes, districtTurnoutMax);
                const winner = districtShade(Number(d.id))?.winner;
                const color =
                  winner === "D"
                    ? HISTORICAL_COLORS.D
                    : winner === "R"
                    ? HISTORICAL_COLORS.R
                    : "#71717a";
                return (
                  <circle
                    key={`turnout-d${d.id}`}
                    cx={cx} cy={cy} r={r}
                    fill={color} fillOpacity={0.35}
                    stroke={color} strokeWidth={1}
                    className="pointer-events-none"
                  />
                );
              })}

            {showShift &&
              showDistricts &&
              districtSwings &&
              districts.map((d) => {
                const swing = districtSwings[Number(d.id)];
                if (swing == null) return null;
                const [cx, cy] = centroidOf(pathPoints(d.d));
                const tieWinner = districtShade(Number(d.id))?.winner;
                return (
                  <ShiftMark
                    key={`shift-d${d.id}`}
                    cx={cx}
                    cy={cy}
                    swing={swing}
                    unit={districtArrowUnit}
                    tieWinner={tieWinner}
                  />
                );
              })}

            {/* PRECINCT LAYER — a whole county, or just a district's slice of one */}
            {(showPrecincts || showDistrictCountyPx) &&
              focusCounty &&
              (showDistrictCountyPx
                ? districtCountyPrecincts ?? []
                : precincts?.precincts ?? []
              ).map((p) => {
                const countyShade = resultFill(focusCounty.slice(0, 5), raceKey);
                // On a results map, shade every precinct by its own winner +
                // margin for the selected race; in paint mode every precinct
                // starts toss-up. Races with no precinct data use the county fill.
                const pv = precinctVote(precinctRaceVote(p));
                const pick = painting ? precinctPicks?.[p.id] : undefined;
                const fill = pick
                  ? SHADE_COLORS[pick]
                  : flattenFill
                  ? "#ffffff"
                  : painting
                  ? SHADE_COLORS.tossup
                  : pv
                  ? SHADE_COLORS[
                      marginToShade(pv.winner, pv.marginPct, { allowTossup: false })
                    ]
                  : countyShade.fill;
                const className = flattenFill
                  ? ""
                  : pick || painting || pv
                  ? ""
                  : countyShade.className ?? "";
                const pw =
                  pv?.winner ??
                  countyResult(raceKey, focusCounty.slice(0, 5))?.winner;
                const muted =
                  spotlightParty != null && pw != null && pw !== spotlightParty;
                return (
                  <path
                    key={p.id}
                    d={p.d}
                    fill={fill}
                    className={
                      className +
                      (painting ? " cursor-pointer" : "") +
                      " transition-[filter,opacity] duration-100"
                    }
                    stroke="#111827"
                    strokeWidth={hovered === p.id ? 0.9 : 0.2}
                    opacity={muted ? 0.18 : 1}
                    style={{ filter: hovered === p.id ? "brightness(1.2)" : undefined }}
                    onMouseEnter={() => setHovered(p.id)}
                    onMouseMove={updatePos}
                    onMouseLeave={() => setHovered((h) => (h === p.id ? null : h))}
                    onClick={
                      painting
                        ? () => {
                            if (panned.current) return;
                            onPaintPrecinct?.(p.id, selectedShade);
                          }
                        : undefined
                    }
                    onContextMenu={
                      painting
                        ? (e) => {
                            e.preventDefault();
                            onPaintPrecinct?.(p.id, null);
                          }
                        : undefined
                    }
                  >
                    <title>{p.name}</title>
                  </path>
                );
              })}

            {/* PRECINCT TURNOUT CIRCLES — precincts sit much closer together
                than counties/districts, so these run smaller and lighter
                (tighter size cap, lower opacity, no solid ring) than the
                county/district circles above: at precinct density a full-size,
                full-opacity ring per shape overlaps into an unreadable mass. */}
            {showTurnout &&
              (showPrecincts || showDistrictCountyPx) &&
              precinctTurnout &&
              activePrecincts.map((p) => {
                const votes = precinctTurnout[p.id];
                if (!votes) return null;
                const pts = pathPoints(p.d);
                const [cx, cy] = centroidOf(pts);
                // This precinct's OWN size, not a county-wide average -- see
                // countyArrowUnit's comment; the same "one big shape skews
                // every small one" problem shows up here too (a rural
                // township precinct next to a dense downtown precinct).
                const unit = Math.sqrt(polygonArea(pts)) || precinctArrowUnit;
                const r = turnoutRadius(unit, votes, precinctTurnoutMax, 0.28, 0.035);
                const winner = precinctVote(precinctRaceVote(p))?.winner;
                const color =
                  winner === "D"
                    ? HISTORICAL_COLORS.D
                    : winner === "R"
                    ? HISTORICAL_COLORS.R
                    : "#71717a";
                return (
                  <circle
                    key={`turnout-p${p.id}`}
                    cx={cx} cy={cy} r={r}
                    fill={color} fillOpacity={0.28}
                    className="pointer-events-none"
                  />
                );
              })}

            {/* PRECINCT SHIFT ARROWS */}
            {showShift &&
              (showPrecincts || showDistrictCountyPx) &&
              precinctSwings &&
              activePrecincts.map((p) => {
                const swing = precinctSwings[p.id];
                if (swing == null) return null;
                const pts = pathPoints(p.d);
                const [cx, cy] = centroidOf(pts);
                const unit = Math.sqrt(polygonArea(pts)) || precinctArrowUnit;
                const tieWinner = precinctVote(precinctRaceVote(p))?.winner;
                return (
                  <ShiftMark
                    key={`shift-p${p.id}`}
                    cx={cx}
                    cy={cy}
                    tieWinner={tieWinner}
                    swing={swing}
                    unit={unit}
                    scale={0.6}
                  />
                );
              })}

            {/* Overlays */}
            {showDistrictCountyPx && focusedCounty && (
              <path
                d={focusedCounty.d}
                fill="none"
                stroke="#111827"
                strokeWidth={1}
                pointerEvents="none"
              />
            )}
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
                className="stroke-gray-900 dark:stroke-white"
                strokeWidth={2}
                pointerEvents="none"
              />
            )}
            {!focusCounty && !focusedDistrict && (
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
          <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-md bg-white/90 px-2 py-1.5 shadow dark:bg-gray-900/90">
            <button
              onClick={() => setZoomLevel(zoom.k - 0.5)}
              className="text-sm font-bold leading-none text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              aria-label="Zoom out"
            >
              &minus;
            </button>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.1}
              value={zoom.k}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              aria-label="Zoom level"
              className="w-28 accent-indigo-600"
            />
            <button
              onClick={() => setZoomLevel(zoom.k + 0.5)}
              className="text-sm font-bold leading-none text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        )}

        {geo && painting && (
          <p className="mt-2 text-center text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
            {focusCounty
              ? `Painting precincts — click to call ${SHADE_LABELS[selectedShade]}, right-click to clear.`
              : layer === "county"
              ? `Painting counties — click to call ${SHADE_LABELS[selectedShade]}, right-click to clear. Switch to Precincts to go deeper.`
              : layer === "precinct"
              ? "Click a county to open its precincts, then paint them."
              : `Painting districts — click to call ${SHADE_LABELS[selectedShade]}, right-click to clear.`}
          </p>
        )}
        {geo && !painting && (
          <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
            {focusCounty && focusedDistrict
              ? precincts
                ? `${
                    (districtCountyPrecincts ?? []).length
                  } of ${precincts.precincts.length} ${
                    focusedCounty?.name ?? ""
                  } precincts are in ${focusedDistrict.label}${
                    precinctsHaveVote
                      ? `, shaded by ${RACE_LABEL[raceKey] ?? raceKey.replace("-", " ")} vote`
                      : `, shaded at the county ${raceKey.replace("-", " ")} result (no precinct data for this race)`
                  }.`
                : "Loading precincts…"
              : focusCounty
              ? precincts
                ? `${precincts.precincts.length} precincts — ${
                    precinctsHaveVote
                      ? `each shaded by its own ${RACE_LABEL[raceKey] ?? raceKey.replace("-", " ")} vote (winner + margin)`
                      : `shaded at the county ${raceKey.replace("-", " ")} result (no precinct-level data for this race)`
                  }. Drag to pan, or use the zoom slider.`
                : precinctsAvailable
                ? "Loading precincts…"
                : `No precinct geometry for ${stateName} yet.`
              : focusedDistrict
              ? districtCounties
                ? `${focusedDistrict.label} spans ${districtCounties.size} counties — click one for its precincts in the district.`
                : `${focusedDistrict.label} — loading…`
              : showDistricts
              ? `${districts.length} districts on the 2026 lines, shaded by ${
                  RACE_LABEL[raceKey] ?? raceKey.replace("-", " ")
                }${
                  raceKey.endsWith("-house") &&
                  !districtHouse(usps, Number(districts[0]?.id), raceKey.split("-")[0]) &&
                  !districtCounty?.[raceKey]
                    ? " (no data for this state/year)"
                    : ""
                }. Click one to see its counties.${
                  (() => {
                    const yr = raceKey.split("-")[0];
                    const f = districts.filter(
                      (d) => districtOldVsNew(usps, Number(d.id), yr)?.flipped
                    ).length;
                    return f
                      ? ` ⇄ marks ${f} seat${f > 1 ? "s" : ""} the 2025 redraw flips vs. the ${
                          districtOldVsNew(usps, Number(districts[0]?.id), yr)?.year ?? yr
                        } result.`
                      : "";
                  })()
                }`
              : layer === "precinct"
              ? "Click a county to see its precincts."
              : precinctsAvailable
              ? "Click a county to drill into its precincts."
              : "Click a county to zoom in."}
          </p>
        )}

        {showShift && prevRaceKey && (
          <p className="mt-1 text-center text-[11px] text-gray-400 dark:text-gray-500">
            Shift arrows: swing from {prevRaceKey.replace("-", " ")} to{" "}
            {raceKey.replace("-", " ")} — <span className="text-blue-500">← blue</span> shifted
            Democratic, <span className="text-red-500">red →</span> shifted Republican, length ∝
            size of the swing.
          </p>
        )}
        {showTurnout && (
          <p className="mt-1 text-center text-[11px] text-gray-400 dark:text-gray-500">
            Turnout circles: area ∝ votes cast for {raceKey.replace("-", " ")}, colored by who won
            {view === "district" && !districtTurnout
              ? " (no district-level vote counts for this race — switch to Counties)."
              : "."}
          </p>
        )}

        {hoveredCounty && (
          <CountyTip
            name={hoveredCounty.name}
            fips={hoveredCounty.fips}
            raceKey={raceKey}
            pick={painting ? countyPicks?.[hoveredCounty.fips] : undefined}
            houseVote={!focusedDistrict ? countyHouseAgg?.[hoveredCounty.fips] : undefined}
            districtVote={
              focusedDistrict
                ? districtCounty?.[raceKey]?.[focusedDistrict.id]?.[hoveredCounty.fips]
                : undefined
            }
            swing={showShift ? activeCountySwings?.[hoveredCounty.fips] : undefined}
            prevRaceKey={showShift ? prevRaceKey ?? undefined : undefined}
            turnoutMode={showTurnout && !!activeCountyTurnout}
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
            painting={painting}
            pick={painting ? districtPicks?.[`${usps}-${hoveredDistrict.id}`] : undefined}
            swing={showShift ? districtSwings?.[Number(hoveredDistrict.id)] : undefined}
            prevRaceKey={showShift ? prevRaceKey ?? undefined : undefined}
            turnoutVotes={
              showTurnout ? districtTurnout?.[Number(hoveredDistrict.id)] : undefined
            }
            x={pos.x}
            y={pos.y}
          />
        )}
        {hoveredPrecinct && (
          <PrecinctTip
            precinct={hoveredPrecinct}
            raceKey={raceKey}
            pick={painting ? precinctPicks?.[hoveredPrecinct.id] : undefined}
            swing={showShift ? precinctSwings?.[hoveredPrecinct.id] : undefined}
            prevRaceKey={showShift ? prevRaceKey ?? undefined : undefined}
            turnoutMode={showTurnout}
            x={pos.x}
            y={pos.y}
          />
        )}
      </div>
    </div>
  );
}

function PrecinctTip({
  precinct,
  raceKey,
  pick,
  swing,
  prevRaceKey,
  turnoutMode,
  x,
  y,
}: {
  precinct: PrecinctShape;
  raceKey: string;
  pick?: Shade;
  /** Shift-mode: signed swing in points since `prevRaceKey` (D positive). */
  swing?: number;
  prevRaceKey?: string;
  /** Turnout-mode: label the vote total as such instead of the generic "total". */
  turnoutMode?: boolean;
  x: number;
  y: number;
}) {
  const pv = precinctVote(
    precinct.prr?.[raceKey] ??
      (raceKey === PRECINCT_RACE ? precinct.pr : undefined)
  );
  const pvLabel = RACE_LABEL[raceKey] ?? raceKey.replace("-", " ");
  return (
    <MapTooltip x={x} y={y} className="w-52">
      <div className="font-semibold">{precinct.name}</div>
      {pick && (
        <div className="font-medium text-indigo-300 dark:text-indigo-700">
          Your call: {SHADE_LABELS[pick]}
        </div>
      )}
      {precinct.pop != null && (
        <div className="text-gray-300 dark:text-gray-600">
          pop. {formatVotes(precinct.pop)}
        </div>
      )}
      {pv && (
        <div className="mt-1 space-y-0.5 border-t border-white/15 pt-1 dark:border-black/10">
          <div className="text-gray-300 dark:text-gray-600">{pvLabel}</div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-blue-300 dark:text-blue-700">
              D {pv.dPct.toFixed(0)}%
            </span>
            <span className="tabular-nums text-gray-300 dark:text-gray-600">
              {formatVotes(pv.d)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-red-300 dark:text-red-700">
              R {pv.rPct.toFixed(0)}%
            </span>
            <span className="tabular-nums text-gray-300 dark:text-gray-600">
              {formatVotes(pv.r)}
            </span>
          </div>
          {pv.o > 0 && (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-gray-300 dark:text-gray-600">Other</span>
              <span className="tabular-nums text-gray-300 dark:text-gray-600">
                {formatVotes(pv.o)}
              </span>
            </div>
          )}
          <div className={turnoutMode ? "font-medium" : "text-gray-300 dark:text-gray-600"}>
            {turnoutMode ? "Turnout: " : ""}
            {formatVotes(pv.total)}
            {turnoutMode ? " votes" : " total"}
          </div>
          {swing != null && (
            <div className="mt-0.5 border-t border-white/15 pt-0.5 dark:border-black/10">
              <span className="text-gray-300 dark:text-gray-600">
                Swing since {prevRaceKey?.replace("-", " ")}:{" "}
              </span>
              <span className={swing > 0 ? "text-blue-300 dark:text-blue-700" : "text-red-300 dark:text-red-700"}>
                {swing > 0 ? "D" : "R"}+{Math.abs(swing).toFixed(1)} pts
              </span>
            </div>
          )}
        </div>
      )}
    </MapTooltip>
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

/** Ray-casting point-in-polygon against a flattened point ring. */
function pointInPoly(pt: [number, number], poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (
      yi > pt[1] !== yj > pt[1] &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

const RACE_LABEL: Record<string, string> = {
  "2016-president": "2016 Pres.",
  "2020-president": "2020 Pres.",
  "2024-president": "2024 Pres.",
  "2016-senate": "2016 Sen.",
  "2018-senate": "2018 Sen.",
  "2020-senate": "2020 Sen.",
  "2022-senate": "2022 Sen.",
  "2024-senate": "2024 Sen.",
  "2016-house": "2016 House",
  "2018-house": "2018 House",
  "2020-house": "2020 House",
  "2022-house": "2022 House",
  "2024-house": "2024 House",
};

function DistrictTip({
  usps,
  label,
  district,
  raceKey,
  painting,
  pick,
  swing,
  prevRaceKey,
  turnoutVotes,
  x,
  y,
}: {
  usps: string;
  label: string;
  district: number;
  raceKey: string;
  painting?: boolean;
  pick?: Shade;
  /** Shift-mode: signed swing in points since `prevRaceKey` (D positive). */
  swing?: number;
  prevRaceKey?: string;
  /** Turnout-mode: votes cast, from the precinct-summed districtCounty data. */
  turnoutVotes?: number;
  x: number;
  y: number;
}) {
  // On the 2026 (prediction) map the drill-in is a blank toss-up canvas, so the
  // tooltip shows only the pick — no past-election data leaks in.
  const hist = painting ? undefined : districtResults(usps, district);
  const year = raceKey.split("-")[0];
  const isHouse = raceKey.endsWith("-house");
  const house = painting ? undefined : districtHouse(usps, district, year);
  // The old-lines-vs-current redraw comparison is a U.S. House thing only —
  // don't show it when the map is shaded by a president/senate race.
  const ovn =
    painting || !isHouse ? undefined : districtOldVsNew(usps, district, year);
  const fmtM = (w: "D" | "R", m: number) => `${w}+${m.toFixed(1)}`;
  // The result for the race the map is currently shaded by.
  const selected = painting
    ? undefined
    : isHouse
    ? house
    : hist?.[raceKey];
  return (
    <MapTooltip x={x} y={y} className="w-56">
      <div className="flex items-center gap-1.5 font-semibold">
        <span>
          {usps} {label}
        </span>
        {ovn?.flipped && (
          <span className="rounded bg-amber-400 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-900">
            Redraw flip
          </span>
        )}
      </div>
      {pick && (
        <div className="font-medium text-indigo-300 dark:text-indigo-700">
          Your call: {SHADE_LABELS[pick]}
        </div>
      )}
      {selected && (
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className="text-gray-300 dark:text-gray-600">
            {RACE_LABEL[raceKey] ?? raceKey.replace("-", " ")}
          </span>
          <span
            className={
              selected.winner === "D"
                ? "text-blue-300 dark:text-blue-700"
                : "text-red-300 dark:text-red-700"
            }
          >
            {fmtM(selected.winner, Math.abs(selected.rPct - selected.dPct))}
          </span>
        </div>
      )}
      {ovn && (
        <div className="mt-1 space-y-0.5 border-t border-white/15 pt-1 dark:border-black/10">
          <div className="text-gray-300 dark:text-gray-600">
            {ovn.year} U.S. House &mdash; old lines vs. current
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-gray-300 dark:text-gray-600">old lines</span>
            <span
              className={
                ovn.old.winner === "D"
                  ? "text-blue-300 dark:text-blue-700"
                  : "text-red-300 dark:text-red-700"
              }
            >
              {ovn.old.who} {fmtM(ovn.old.winner, ovn.old.marginPct)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-gray-300 dark:text-gray-600">current lines</span>
            <span
              className={
                ovn.now.winner === "D"
                  ? "text-blue-300 dark:text-blue-700"
                  : "text-red-300 dark:text-red-700"
              }
            >
              {fmtM(ovn.now.winner, ovn.now.marginPct)}
            </span>
          </div>
          {ovn.flipped && (
            <div className="font-medium text-amber-300 dark:text-amber-600">
              Redraw flips this seat {ovn.old.winner}&rarr;{ovn.now.winner}.
            </div>
          )}
        </div>
      )}
      {isHouse && !ovn && house && (
        <div className="mt-1 border-t border-white/15 pt-1 dark:border-black/10">
          <span className="text-gray-300 dark:text-gray-600">
            {year} U.S. House (current lines):{" "}
          </span>
          <span
            className={
              house.winner === "D"
                ? "text-blue-300 dark:text-blue-700"
                : "text-red-300 dark:text-red-700"
            }
          >
            {fmtM(house.winner, Math.abs(house.rPct - house.dPct))}
          </span>
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
                {r.who ?? r.winner} {r.winner}+
                {(Math.round(Math.abs(r.rPct - r.dPct) * 10) / 10)
                  .toString()
                  .replace(/\.0$/, "")}
              </span>
            </div>
          ))}
        </div>
      )}
      {turnoutVotes != null && (
        <div className="mt-0.5 border-t border-white/15 pt-0.5 font-medium dark:border-black/10">
          Turnout: {formatVotes(turnoutVotes)} votes
        </div>
      )}
      {swing != null && (
        <div className="mt-0.5 border-t border-white/15 pt-0.5 dark:border-black/10">
          <span className="text-gray-300 dark:text-gray-600">
            Swing since {prevRaceKey?.replace("-", " ")}:{" "}
          </span>
          <span className={swing > 0 ? "text-blue-300 dark:text-blue-700" : "text-red-300 dark:text-red-700"}>
            {swing > 0 ? "D" : "R"}+{Math.abs(swing).toFixed(1)} pts
          </span>
        </div>
      )}
    </MapTooltip>
  );
}

/** A county/precinct-shaped [d, r, other] tuple into the same shape as a
 *  `countyResult` row, for the tip's D/R/turnout display. */
function voteToResult(v?: [number, number, number]) {
  if (!v) return null;
  const [d, r, o] = v;
  const total = d + r + o;
  if (total === 0) return null;
  const dPct = +((100 * d) / total).toFixed(1);
  const rPct = +((100 * r) / total).toFixed(1);
  return {
    winner: (d >= r ? "D" : "R") as "D" | "R",
    dPct,
    rPct,
    marginPct: +Math.abs(dPct - rPct).toFixed(1),
    totalVotes: total,
    dVotes: d,
    rVotes: r,
  };
}

function CountyTip({
  name,
  fips,
  raceKey,
  pick,
  houseVote,
  districtVote,
  swing,
  prevRaceKey,
  turnoutMode,
  x,
  y,
}: {
  name: string;
  fips: string;
  raceKey: string;
  pick?: Shade;
  /** Precinct-summed House vote for this county (see `countyHouseAgg`), used
   *  when there's no single county-level result to fall back on. */
  houseVote?: [number, number, number];
  /** This county's OWN slice of the focused district (see `districtCounty`).
   *  Takes priority over everything else when present — `countyResult` is
   *  always the WHOLE county, which for a split county (e.g. Cuyahoga in
   *  OH-7) is a different, larger number than just its part of this
   *  district, even though a county-level result usually exists for the
   *  race (President/Senate almost always do) and would otherwise win out. */
  districtVote?: [number, number, number];
  /** Shift-mode: signed swing in points since `prevRaceKey` (D positive). */
  swing?: number;
  prevRaceKey?: string;
  /** Turnout-mode: label the vote total as such instead of the generic "total". */
  turnoutMode?: boolean;
  x: number;
  y: number;
}) {
  const county = countyResult(raceKey, fips);
  const res = voteToResult(districtVote) ?? county ?? voteToResult(houseVote);
  return (
    <MapTooltip x={x} y={y} className="w-52">
      <div className="font-semibold">{name} County</div>
      {pick && (
        <div className="font-medium text-indigo-300 dark:text-indigo-700">
          Your call: {SHADE_LABELS[pick]}
        </div>
      )}
      {!res || !res.winner ? (
        <div className="text-gray-300 dark:text-gray-600">
          {pick ? "No past-race data" : "No county data loaded"}
        </div>
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
            <div className={turnoutMode ? "font-medium" : "text-gray-300 dark:text-gray-600"}>
              {turnoutMode ? "Turnout: " : ""}
              {formatVotes(res.totalVotes)}
              {turnoutMode ? " votes" : " total"}
            </div>
          )}
          {swing != null && (
            <div className="mt-0.5 border-t border-white/15 pt-0.5 dark:border-black/10">
              <span className="text-gray-300 dark:text-gray-600">
                Swing since {prevRaceKey?.replace("-", " ")}:{" "}
              </span>
              <span className={swing > 0 ? "text-blue-300 dark:text-blue-700" : "text-red-300 dark:text-red-700"}>
                {swing > 0 ? "D" : "R"}+{Math.abs(swing).toFixed(1)} pts
              </span>
            </div>
          )}
        </>
      )}
    </MapTooltip>
  );
}
