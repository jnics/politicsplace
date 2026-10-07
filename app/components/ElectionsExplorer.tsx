import { useEffect, useMemo, useState } from "react";
import { UsMap } from "~/components/UsMap";
import { DonutChart, type DonutSegment } from "~/components/DonutChart";
import { StateZoom, type ZoomContext } from "~/components/StateZoom";
import { EarlyVoteBlock } from "~/components/EarlyVoteBlock";
import { ShadePalette } from "~/components/Legend";
import { GenericBallotChart } from "~/components/GenericBallotChart";
import { hasStateGeo, hasPrecinctRace, precinctRaceKeys } from "~/lib/stateGeo";
import { countyResult } from "~/data/countyResults";
import { districtHouseYears } from "~/data/districtResults";
import { STATE_PATHS } from "~/data/statePaths";
import { STATE_FIPS } from "~/data/stateFips";
import {
  PRESIDENTIAL_RESULTS,
  PRESIDENTIAL_YEARS,
  type PresidentialYear,
} from "~/data/presidentialResults";
import {
  SENATE_CYCLE_YEARS,
  SENATE_RESULTS,
  type SenateCycleYear,
} from "~/data/senateResults";
import { SENATE_2026_NOTES } from "~/data/senate2026";
import { SENATE_2026_CANDIDATES } from "~/data/senate2026Candidates";
import { PRESIDENTIAL_VOTES } from "~/data/presidentialVotes";
import { SENATE_VOTES } from "~/data/senateVotes";
import { SENATE_REASONS } from "~/data/senateReasons";
import { computePresidentialView, patternIdFor } from "~/lib/presidentialMap";
import { computeSenateHistoricalView, computeSenate2026View } from "~/lib/senateMap";
import {
  HISTORICAL_COLORS,
  INDEPENDENT_COLOR,
  LOCKED_COLORS,
  SHADE_COLORS,
  SHADE_LABELS,
  SHADE_ORDER,
  type Shade,
} from "~/lib/shades";
import { formatMargin, formatVotes } from "~/lib/margin";
import { usePredictionPicks } from "~/lib/usePredictionPicks";

const STATE_NAMES: Record<string, string> = Object.fromEntries(
  STATE_PATHS.map((s) => [s.id, s.name])
);

type RaceType = "senate" | "president";

/** U.S. House runs every two years — its own axis, shown when the zoom's House
 *  override is on. A year is disabled for states we have no House data for.
 *  2026 has no results yet — it's the paint-your-call prediction year, backed by
 *  the 2024 House map. */
const HOUSE_YEARS = [2016, 2018, 2020, 2022, 2024] as const;
const HOUSE_PILL_YEARS = [...HOUSE_YEARS, 2026] as const;


/**
 * A state's derived 2026 call from its county picks: the turnout-weighted
 * (2024 Senate, then 2024 President) average position on the 7-point spectrum,
 * rounded to the nearest bucket. Null when no county in that state is painted.
 */
function deriveStateShade(
  fipsPrefix: string,
  countyPicks: Record<string, Shade>
): Shade | null {
  let weighted = 0;
  let weight = 0;
  for (const [fips, shade] of Object.entries(countyPicks)) {
    if (!fips.startsWith(fipsPrefix)) continue;
    const res =
      countyResult("2024-senate", fips) ?? countyResult("2024-president", fips);
    const w = res?.totalVotes ?? 1;
    weighted += SHADE_ORDER.indexOf(shade) * w;
    weight += w;
  }
  if (weight === 0) return null;
  return SHADE_ORDER[Math.round(weighted / weight)];
}

const SEAT_CLASS_LABEL: Record<1 | 2 | 3, string> = {
  1: "Class 1",
  2: "Class 2",
  3: "Class 3",
};

const PARTY_NAME: Record<string, string> = {
  D: "Democrats",
  R: "Republicans",
  I: "an Independent",
};

/** Donut segments for the 7-point margin spectrum, with the states in each
 *  bucket. DonutChart draws segments in array order starting at 12 o'clock
 *  and sweeping clockwise, so the first segment ends up on the right and the
 *  last on the left. SHADE_ORDER runs D→R (matches the palette / legend, D
 *  first), which would put D on the right — the opposite of the map
 *  convention (D blue on the left, R red on the right) and out of step with
 *  the "D–R" reading order of the center number. Reversed here, just for the
 *  ring, so R draws first (right) and D last (left). */
function shadeSegments(
  tally: Record<Shade, number>,
  statesByShade: Record<Shade, string[]>
): DonutSegment[] {
  return [...SHADE_ORDER].reverse().map((shade) => ({
    label: SHADE_LABELS[shade],
    value: tally[shade],
    color: SHADE_COLORS[shade],
    states: statesByShade[shade],
  }));
}

/** One "Name (P)   1,234 · 55.5%" row in a hover card. */
function CandidateRow({
  name,
  party,
  votes,
  pct,
}: {
  name: string;
  party: string;
  votes: number;
  pct: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span>
        {name} ({party})
      </span>
      <span className="shrink-0 tabular-nums text-gray-300 dark:text-gray-600">
        {formatVotes(votes)} &middot; {pct}%
      </span>
    </div>
  );
}

/** Consistent shell for every hover card: bold state name + a muted subtitle. */
function TipHeader({ name, sub }: { name: string; sub?: string }) {
  return (
    <div className="font-semibold">
      {name}
      {sub && (
        <span className="font-normal text-gray-400 dark:text-gray-500"> &middot; {sub}</span>
      )}
    </div>
  );
}

export function ElectionsExplorer() {
  const [raceType, setRaceType] = useState<RaceType>("senate");
  // The generic ballot chart replaces the map entirely (it's a national,
  // years-at-once comparison, not a per-state/per-race view) — so it's its
  // own flag rather than a third RaceType, which every other piece of state
  // below assumes is either "senate" or "president".
  const [showGenericBallot, setShowGenericBallot] = useState(false);
  const [presYear, setPresYear] = useState<PresidentialYear>(2024);
  const [senYear, setSenYear] = useState<SenateCycleYear | 2026>(2026);
  const [selectedShade, setSelectedShade] = useState<Shade>("tossup");
  const [donutHighlight, setDonutHighlight] = useState<Set<string> | null>(null);
  const [zoomState, setZoomState] = useState<string | null>(null);
  const [zoomNote, setZoomNote] = useState<string | null>(null);
  const [zoomContext, setZoomContext] = useState<ZoomContext | null>(null);
  const [zoomSpotlight, setZoomSpotlight] = useState<"D" | "R" | null>(null);
  const [zoomView, setZoomView] = useState<"county" | "district" | "precinct">(
    "county"
  );
  // Zoom-only override: shade the drilled-in state by its U.S. House vote for
  // the selected year instead of the national Senate/President race. `houseYear`
  // is its own axis — the House runs every 2 years, not on the presidential or
  // Senate calendar.
  const [zoomHouse, setZoomHouse] = useState(false);
  const [houseYear, setHouseYear] = useState(2024);
  const statePicks = usePredictionPicks();
  const countyPicks = usePredictionPicks("politicsplace:2026-county-picks:v1");
  const precinctPicks = usePredictionPicks("politicsplace:2026-precinct-picks:v1");
  const districtPicks = usePredictionPicks("politicsplace:2026-house-picks:v1");

  const isActiveTab = raceType === "senate" && senYear === 2026;
  // Zoomed-in House prediction mode: paint 2026 House calls per district / county.
  const houseActive = zoomHouse && houseYear === 2026;
  const painting = isActiveTab || houseActive;

  const senate2026ActiveStates = useMemo(
    () => computeSenate2026View({}).activeStates,
    []
  );

  /** Cycles worth showing in the pills while zoomed into a state (incl. 2026),
   *  or null when not zoomed. Keep a year if the state had a Senate race then
   *  (county/precinct view has data) OR we have its U.S. House vote aggregated
   *  onto the current district lines (district view has data) — e.g. Ohio has no
   *  2020 Senate race but does have 2020 House for the congressional drill-in. */
  /** Senate cycles the zoomed-in state actually held a race in — county /
   *  precinct view has real numbers only for these. */
  const zoomSenateRaceYears = useMemo(() => {
    if (!zoomState) return new Set<number>();
    return new Set(
      SENATE_CYCLE_YEARS.filter((y) =>
        SENATE_RESULTS[y]?.some((r) => r.state === zoomState)
      )
    );
  }, [zoomState]);

  const zoomSenateYears = useMemo<(SenateCycleYear | 2026)[] | null>(() => {
    if (!zoomState) return null;
    const houseYears = new Set(districtHouseYears(zoomState).map(Number));
    const years: (SenateCycleYear | 2026)[] = SENATE_CYCLE_YEARS.filter(
      (y) => zoomSenateRaceYears.has(y) || houseYears.has(y)
    );
    if (senate2026ActiveStates.has(zoomState)) years.push(2026);
    return years;
  }, [zoomState, zoomSenateRaceYears, senate2026ActiveStates]);

  /** A pill year that only has House-district data (no Senate race that cycle)
   *  is dead weight unless the drill-in is on the Districts layer. */
  const isSenateYearDisabled = (y: SenateCycleYear | 2026) =>
    raceType === "senate" &&
    !!zoomState &&
    !zoomHouse &&
    y !== 2026 &&
    !zoomSenateRaceYears.has(y) &&
    zoomView !== "district";

  /** On the precinct layer, a year with no precinct-level data for the drilled-in
   *  state + office is dead — but only greyed when SOME other year of that office
   *  does have it (e.g. Ohio has House precinct data for 2022/24 but not
   *  2016-20). States with no precinct data for an office at all keep every pill
   *  live so the county-result fallback stays reachable. */
  const precinctYearDisabled = (y: number, office: "president" | "senate" | "house") => {
    if (!zoomState || zoomView !== "precinct") return false;
    if (hasPrecinctRace(zoomState, `${y}-${office}`)) return false;
    return precinctRaceKeys(zoomState).some((k) => k.endsWith(`-${office}`));
  };

  // Changing race/year re-shades the drill-down in place; only a new state or
  // Back leaves it. So the office/year pills at the top double as the zoom's
  // "shade by" control — one set of controls for both screens.
  useEffect(() => {
    setZoomNote(null);
  }, [raceType, presYear, senYear]);

  // Keep the selected Senate cycle valid for what's on screen: it must be in the
  // zoomed state's pill list and not currently disabled (e.g. switching to the
  // Counties layer while a House-only year like 2020 is picked snaps away).
  useEffect(() => {
    if (
      raceType !== "senate" ||
      zoomHouse ||
      !zoomSenateYears ||
      zoomSenateYears.length === 0
    )
      return;
    const usable = zoomSenateYears.filter((y) => !isSenateYearDisabled(y));
    if (usable.length > 0 && !usable.includes(senYear)) {
      // prefer the most recent real cycle over dropping into 2026 prediction mode
      const real = usable.filter((y) => y !== 2026);
      setSenYear((real.length ? real : usable)[
        (real.length ? real : usable).length - 1
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceType, zoomSenateYears, zoomView, zoomSenateRaceYears, senYear]);

  // On the precinct layer, if the picked year has no precinct data for the
  // state + office, snap to the most recent year that does.
  useEffect(() => {
    if (!zoomState || zoomView !== "precinct") return;
    if (zoomHouse) {
      if (houseYear === 2026) return; // prediction year — never snapped away
      const ok = HOUSE_YEARS.filter((y) => !precinctYearDisabled(y, "house"));
      if (ok.length && !ok.includes(houseYear as (typeof HOUSE_YEARS)[number]))
        setHouseYear(ok[ok.length - 1]);
    } else if (raceType === "president") {
      const ok = PRESIDENTIAL_YEARS.filter(
        (y) => !precinctYearDisabled(y, "president")
      );
      if (ok.length && !ok.includes(presYear)) setPresYear(ok[ok.length - 1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomState, zoomView, zoomHouse, raceType, houseYear, presYear]);

  const raceKey =
    raceType === "president" ? `${presYear}-president` : `${senYear}-senate`;
  // 2026 has no results of its own — the drill-down falls back to the last
  // Senate cycle as a backdrop and predictions paint on top.
  const zoomRaceKey = zoomHouse
    ? houseYear === 2026
      ? "2024-house" // backdrop for 2026 House predictions
      : `${houseYear}-house`
    : raceKey === "2026-senate"
    ? "2024-senate"
    : raceKey;

  function handleStateSelect(id: string) {
    if (hasStateGeo(id)) {
      setZoomState(id);
      setZoomNote(null);
    } else {
      setZoomNote(`${STATE_NAMES[id] ?? id}: county map not available yet.`);
    }
  }

  const presidentialView = useMemo(
    () => (raceType === "president" ? computePresidentialView(presYear) : null),
    [raceType, presYear]
  );

  const senateHistorical = useMemo(
    () =>
      raceType === "senate" && senYear !== 2026
        ? computeSenateHistoricalView(senYear)
        : null,
    [raceType, senYear]
  );

  // A state's 2026 call: its explicit state pick, else derived from county picks.
  const effectivePicks = useMemo(() => {
    const out: Record<string, Shade> = { ...statePicks.picks };
    for (const [usps, fipsPrefix] of Object.entries(STATE_FIPS)) {
      if (out[usps]) continue;
      const derived = deriveStateShade(fipsPrefix, countyPicks.picks);
      if (derived) out[usps] = derived;
    }
    return out;
  }, [statePicks.picks, countyPicks.picks]);

  const senate2026 = useMemo(
    () => (isActiveTab ? computeSenate2026View(effectivePicks) : null),
    [isActiveTab, effectivePicks]
  );

  const fills: Record<string, string> = useMemo(() => {
    if (presidentialView) return presidentialView.fills;
    if (senateHistorical) return senateHistorical.fills;
    if (senate2026) return senate2026.fills;
    return {};
  }, [presidentialView, senateHistorical, senate2026]);

  const interactiveStates = useMemo(
    () => (senate2026 ? senate2026.activeStates : new Set<string>()),
    [senate2026]
  );

  // ── National shift / turnout overlay — the same idea as StateZoom's, one
  // level up: a swing arrow / turnout circle per STATE instead of per county.
  const [overlaySlot, setOverlaySlot] = useState<HTMLDivElement | null>(null);
  const [showNatShift, setShowNatShift] = useState(false);
  const [showNatTurnout, setShowNatTurnout] = useState(false);
  const [showNatBaseFill, setShowNatBaseFill] = useState(true);
  // The 2026 predict tab has no backdrop race to compare against, so the
  // overlay toggle row doesn't even render there — but without this, the
  // booleans above just sit at whatever they were (e.g. Shift left on from
  // 2024), so switching straight back to a real year re-applies a flattened
  // fill the user never asked for on THIS year. Reset on the way in.
  useEffect(() => {
    if (isActiveTab) {
      setShowNatShift(false);
      setShowNatTurnout(false);
      setShowNatBaseFill(true);
    }
  }, [isActiveTab]);

  const senVotesFor = (year: number, state: string) => {
    const v = SENATE_VOTES[year]?.find((x) => x.state === state);
    if (!v) return undefined;
    const d = v.winner.party === "D" ? v.winner : v.runnerUp.party === "D" ? v.runnerUp : null;
    const r = v.winner.party === "R" ? v.winner : v.runnerUp.party === "R" ? v.runnerUp : null;
    if (!d || !r) return undefined; // no clean D-vs-R matchup that year (e.g. AK jungle)
    return { dPct: d.pct, rPct: r.pct, dVotes: d.votes, rVotes: r.votes };
  };
  /** The state's most recent EARLIER Senate cycle it actually raced in — states
   *  are staggered across three classes, so this isn't always the prior year on
   *  the calendar. */
  const prevSenateYear = (state: string, year: number): number | null => {
    const years = SENATE_CYCLE_YEARS.filter(
      (y) => y < year && senVotesFor(y, state)
    );
    return years.length ? years[years.length - 1] : null;
  };

  /** Per-state {dPct,rPct,dVotes,rVotes} for the current tab + year, plus the
   *  same for the previous cycle and which year that was — null entries when
   *  there's nothing to compare (2026, or no earlier race for that state). */
  const natStateData = useMemo(() => {
    const out: Record<
      string,
      {
        dVotes: number; rVotes: number; dPct: number; rPct: number;
        prevYear: number | null;
        prev?: { dPct: number; rPct: number };
      }
    > = {};
    if (isActiveTab) return out; // 2026 predict tab — no backdrop to compare
    for (const s of STATE_PATHS) {
      const state = s.id;
      if (raceType === "president") {
        const cur = PRESIDENTIAL_VOTES[presYear]?.[state];
        if (!cur) continue;
        const prevYear = PRESIDENTIAL_YEARS[PRESIDENTIAL_YEARS.indexOf(presYear) - 1] ?? null;
        const prev = prevYear ? PRESIDENTIAL_VOTES[prevYear]?.[state] : undefined;
        out[state] = { ...cur, prevYear, prev };
      } else {
        const cur = senVotesFor(senYear as SenateCycleYear, state);
        if (!cur) continue;
        const prevYear = prevSenateYear(state, senYear as SenateCycleYear);
        const prev = prevYear ? senVotesFor(prevYear, state) : undefined;
        out[state] = { ...cur, prevYear, prev };
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActiveTab, raceType, presYear, senYear]);

  const natOverlayTurnout = useMemo(() => {
    if (!showNatTurnout) return undefined;
    const out: Record<string, { votes: number; color: string }> = {};
    for (const [state, d] of Object.entries(natStateData)) {
      out[state] = {
        votes: d.dVotes + d.rVotes,
        color: d.dPct >= d.rPct ? HISTORICAL_COLORS.D : HISTORICAL_COLORS.R,
      };
    }
    return out;
  }, [showNatTurnout, natStateData]);

  const natOverlayShift = useMemo(() => {
    if (!showNatShift) return undefined;
    const out: Record<string, { pts: number; color: string; winner: "D" | "R" }> = {};
    for (const [state, d] of Object.entries(natStateData)) {
      if (!d.prev) continue;
      const swing = d.dPct - d.rPct - (d.prev.dPct - d.prev.rPct);
      out[state] = {
        pts: swing,
        color: swing > 0 ? "#1d4ed8" : "#b91c1c",
        winner: d.dPct >= d.rPct ? "D" : "R",
      };
    }
    return out;
  }, [showNatShift, natStateData]);

  const natHasPrevData = Object.values(natStateData).some((d) => d.prev);
  const natFlattenFill = !isActiveTab && !showNatBaseFill && (showNatShift || showNatTurnout);

  const anyPicks =
    Object.keys(statePicks.picks).length +
      Object.keys(countyPicks.picks).length +
      Object.keys(precinctPicks.picks).length +
      Object.keys(districtPicks.picks).length >
    0;

  const hiddenStates = raceType === "senate" ? new Set(["DC"]) : undefined;

  // Tally the user's 2026 U.S. House district calls for the zoomed-in state.
  const housePicksTally = useMemo(() => {
    if (!zoomState) return null;
    let d = 0, r = 0, tossup = 0;
    for (const [key, shade] of Object.entries(districtPicks.picks)) {
      if (!key.startsWith(`${zoomState}-`)) continue;
      const i = SHADE_ORDER.indexOf(shade);
      if (i < 3) d++;
      else if (i > 3) r++;
      else tossup++;
    }
    return { d, r, tossup, total: d + r + tossup };
  }, [zoomState, districtPicks.picks]);

  function handleSegmentHover(segment: DonutSegment | null) {
    setDonutHighlight(
      segment?.states && segment.states.length > 0 ? new Set(segment.states) : null
    );
  }

  function handleStateClick(state: string, direction: 1 | -1) {
    if (!senate2026?.activeStates.has(state)) return;
    // Left click paints the state with the selected color; right click clears it
    // (falling back to whatever the county picks derive, or toss-up).
    if (direction === 1) statePicks.setPick(state, selectedShade);
    else statePicks.clearPick(state);
  }

  function handlePaintCounty(fips: string, shade: Shade | null) {
    if (shade) countyPicks.setPick(fips, shade);
    else countyPicks.clearPick(fips);
  }

  function handlePaintPrecinct(id: string, shade: Shade | null) {
    if (shade) precinctPicks.setPick(id, shade);
    else precinctPicks.clearPick(id);
  }

  function handlePaintDistrict(key: string, shade: Shade | null) {
    if (shade) districtPicks.setPick(key, shade);
    else districtPicks.clearPick(key);
  }

  function resetAllPicks() {
    statePicks.resetPicks();
    countyPicks.resetPicks();
    precinctPicks.resetPicks();
    districtPicks.resetPicks();
  }

  /** Extra tooltip lines for the national Shift/Turnout overlay — without
   *  this, hovering an arrow or circle showed the same info as always, with
   *  no number tying it to what's actually being drawn. */
  function shiftTurnoutBlock(state: string) {
    const d = natStateData[state];
    if (!d) return null;
    return (
      <>
        {showNatTurnout && (
          <div className="mt-0.5 border-t border-white/15 pt-1 font-medium dark:border-black/10">
            Turnout: {formatVotes(d.dVotes + d.rVotes)} votes
          </div>
        )}
        {showNatShift &&
          (d.prev ? (
            <div className="mt-0.5 border-t border-white/15 pt-1 dark:border-black/10">
              <span className="text-gray-300 dark:text-gray-600">
                Swing since {d.prevYear}:{" "}
              </span>
              <span
                className={
                  d.dPct - d.rPct - (d.prev.dPct - d.prev.rPct) > 0
                    ? "text-blue-300 dark:text-blue-700"
                    : "text-red-300 dark:text-red-700"
                }
              >
                {d.dPct - d.rPct - (d.prev.dPct - d.prev.rPct) > 0 ? "D" : "R"}+
                {Math.abs(d.dPct - d.rPct - (d.prev.dPct - d.prev.rPct)).toFixed(1)} pts
              </span>
            </div>
          ) : (
            <div className="mt-0.5 border-t border-white/15 pt-1 text-gray-300 dark:border-black/10 dark:text-gray-600">
              No earlier race to compare
            </div>
          ))}
      </>
    );
  }

  function tooltip(state: string) {
    const name = STATE_NAMES[state] ?? state;

    if (presidentialView) {
      const result = PRESIDENTIAL_RESULTS[presYear][state];
      if (!result) return <TipHeader name={name} />;
      const votes =
        result.party !== "split" ? PRESIDENTIAL_VOTES[presYear]?.[state] : undefined;
      const sub =
        result.party === "split"
          ? `${presYear} · split`
          : `${presYear} · Won by ${PARTY_NAME[result.party]}`;
      return (
        <div className="space-y-1">
          <TipHeader name={name} sub={sub} />
          <div className="text-gray-300 dark:text-gray-600">
            {result.ev} electoral vote{result.ev === 1 ? "" : "s"}
          </div>
          {result.party === "split" && result.details && (
            <div className="text-gray-300 dark:text-gray-600">{result.details}</div>
          )}
          {votes && (
            <div className="space-y-0.5 border-t border-white/15 pt-1 dark:border-black/10">
              <CandidateRow
                name="Dem."
                party="D"
                votes={votes.dVotes}
                pct={votes.dPct}
              />
              <CandidateRow
                name="Rep."
                party="R"
                votes={votes.rVotes}
                pct={votes.rPct}
              />
              <div className="pt-0.5 font-medium">
                {formatMargin(
                  votes.dPct >= votes.rPct ? "D" : "R",
                  votes.dPct - votes.rPct
                )}
              </div>
            </div>
          )}
          {shiftTurnoutBlock(state)}
        </div>
      );
    }

    if (senateHistorical) {
      if (!senateHistorical.upStates.has(state)) {
        return <TipHeader name={name} sub={`no Senate race in ${senYear}`} />;
      }
      const vote = SENATE_VOTES[senYear]?.find((v) => v.state === state);
      const reason = SENATE_REASONS[senYear]?.[state];
      const wonBy = vote ? PARTY_NAME[vote.winner.party] ?? vote.winner.party : null;
      return (
        <div className="space-y-1">
          <TipHeader
            name={name}
            sub={wonBy ? `${senYear} · Won by ${wonBy}` : String(senYear)}
          />
          {vote && (
            <div className="space-y-0.5">
              <CandidateRow
                name={lastName(vote.winner.name)}
                party={vote.winner.party}
                votes={vote.winner.votes}
                pct={vote.winner.pct}
              />
              <CandidateRow
                name={lastName(vote.runnerUp.name)}
                party={vote.runnerUp.party}
                votes={vote.runnerUp.votes}
                pct={vote.runnerUp.pct}
              />
              {(vote.winner.party === "D" || vote.winner.party === "R") && (
                <div className="pt-0.5 font-medium">
                  {formatMargin(
                    vote.winner.party,
                    vote.winner.pct - vote.runnerUp.pct
                  )}
                </div>
              )}
            </div>
          )}
          {reason && (
            <div className="border-t border-white/15 pt-1 text-gray-200 dark:border-black/10 dark:text-gray-700">
              {reason}
            </div>
          )}
          {shiftTurnoutBlock(state)}
        </div>
      );
    }

    if (senate2026) {
      const info = senate2026.stateInfo[state];
      if (!info) return <TipHeader name={name} />;
      if (info.active && info.activeSeat) {
        const shade = effectivePicks[state] ?? "tossup";
        const derived = !statePicks.picks[state] && !!effectivePicks[state];
        return (
          <div className="space-y-1">
            <TipHeader
              name={name}
              sub={`${SEAT_CLASS_LABEL[info.activeSeat.seatClass]}${
                info.activeSeat.special ? " · special" : ""
              }`}
            />
            {info.activeSeat.incumbent && (
              <div>
                Incumbent: {info.activeSeat.incumbent} ({info.activeSeat.currentParty})
              </div>
            )}
            {info.activeSeat.note && (
              <div className="text-gray-300 dark:text-gray-600">
                {info.activeSeat.note}
              </div>
            )}
            {SENATE_2026_CANDIDATES[state]?.length ? (
              <div className="border-t border-white/15 pt-1 dark:border-black/10">
                <div className="text-gray-300 dark:text-gray-600">On the ballot</div>
                {SENATE_2026_CANDIDATES[state].map((c) => (
                  <div key={c.name} className="flex items-baseline justify-between gap-2">
                    <span>
                      {c.name}
                      {c.incumbent ? " (inc.)" : ""}
                    </span>
                    <span className="shrink-0 text-gray-300 dark:text-gray-600">
                      {c.party}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="border-t border-white/15 pt-1 font-medium dark:border-black/10">
              Your call: {SHADE_LABELS[shade]}
              {derived && (
                <span className="font-normal text-gray-300 dark:text-gray-600">
                  {" "}
                  (from your county picks)
                </span>
              )}
            </div>
            <div className="text-gray-300 dark:text-gray-600">
              Click to apply selected color &middot; right-click to clear
              {hasStateGeo(state) && " · double-click to drill in"}
            </div>
            <EarlyVoteBlock state={state} />
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <TipHeader name={name} sub="no race in 2026" />
          {info.seats.map((seat) => (
            <div key={seat.seatClass}>
              {SEAT_CLASS_LABEL[seat.seatClass]}: {seat.incumbent ?? "?"} (
              {seat.currentParty})
            </div>
          ))}
          <EarlyVoteBlock state={state} />
        </div>
      );
    }

    return <TipHeader name={name} />;
  }

  const defs =
    presidentialView && presidentialView.splitStates.length > 0
      ? presidentialView.splitStates.map((s) => (
          <pattern
            key={s.state}
            id={patternIdFor(presYear, s.state)}
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
            patternTransform="rotate(45)"
          >
            <rect width="8" height="8" fill={s.majorityColor} />
            <line x1="0" y1="0" x2="0" y2="8" stroke={s.minorityColor} strokeWidth="5" />
          </pattern>
        ))
      : null;

  /** The prose that explains the current donut — shown under the map, in the
   *  "Worth knowing" block, not next to the ring. */
  const donutInfo: React.ReactNode = (() => {
    if (zoomState) {
      const c = zoomContext;
      if (!c || c.dUnits == null || c.rUnits == null) return null;
      const year = zoomRaceKey.split("-")[0];
      return c.unit === "votes" ? (
        <p>
          D {c.dUnits.toLocaleString()} &middot; R {c.rUnits.toLocaleString()}{" "}
          &mdash; {year} presidential vote in these precincts.
        </p>
      ) : (
        <p>
          {c.dUnits} of {c.dUnits + c.rUnits} {c.unit ?? "areas"} lean
          Democratic, {c.rUnits} lean Republican &mdash; based on the {year}{" "}
          result. The ring shows the turnout-weighted vote split.
        </p>
      );
    }
    if (presidentialView) {
      return (
        <p>
          The ring is all 538 electoral votes shaded by each state&rsquo;s
          margin. 270 to win.
        </p>
      );
    }
    if (senateHistorical) {
      return (
        <p>
          The ring is the full 100-seat Senate after {senYear}: the{" "}
          {senateHistorical.totalRaces} seats decided that November shaded by
          margin, the other {senateHistorical.heldD + senateHistorical.heldR}{" "}
          muted. Gray states on the map had no race that cycle.
        </p>
      );
    }
    if (senate2026) {
      return (
        <p>
          35 seats are up in 2026. Pick a color above the map, then click a race
          state to call it (right-click clears it). Double-click a state to drill
          in and paint its counties and precincts &mdash; where a state has
          county picks, its overall call is derived from them. The other 65 seats
          aren&rsquo;t up this cycle and sit at their current party.
        </p>
      );
    }
    return null;
  })();

  return (
    <div className="mx-auto max-w-[104rem] px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          PoliticsPlace Election Map
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Explore presidential and Senate results since 2016 &mdash; and make your own
          predictions for the 2026 Senate races.
        </p>
      </header>

      <div className="mb-3 inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-900">
        {(["senate", "president"] as RaceType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              setRaceType(type);
              setZoomHouse(false);
              setShowGenericBallot(false);
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              raceType === type && !zoomHouse && !showGenericBallot
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {type === "senate" ? "Senate" : "President"}
          </button>
        ))}
        <button
          onClick={() => {
            setShowGenericBallot(true);
            setZoomState(null);
            setZoomHouse(false);
          }}
          title="National generic congressional ballot, every cycle since 2016 compared at once"
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            showGenericBallot
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          Generic Ballot
        </button>
        {zoomState && !showGenericBallot && (
          <button
            onClick={() => {
              setZoomHouse((v) => {
                if (!v) {
                  // entering House mode — snap to a year the state has data for
                  const avail = districtHouseYears(zoomState).map(Number);
                  if (avail.length && !avail.includes(houseYear))
                    setHouseYear(Math.max(...avail));
                }
                return !v;
              });
            }}
            title={`Shade ${STATE_NAMES[zoomState] ?? zoomState} by its ${houseYear} U.S. House vote`}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              zoomHouse
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            House
          </button>
        )}
      </div>

      {showGenericBallot ? (
        <GenericBallotChart />
      ) : (
        <>
      <div className="mb-3 flex flex-wrap gap-2">
        {zoomHouse
          ? HOUSE_PILL_YEARS.map((y) => {
              const noDistrict =
                !!zoomState &&
                !districtHouseYears(zoomState).includes(String(y));
              const noPrecinct = precinctYearDisabled(y, "house");
              const disabled =
                y === 2026
                  ? false // prediction year — always available
                  : zoomView === "precinct"
                  ? noPrecinct
                  : noDistrict;
              return (
                <YearTab
                  key={y}
                  label={String(y)}
                  active={houseYear === y}
                  accent={y === 2026}
                  disabled={disabled}
                  title={
                    disabled
                      ? `No ${y} U.S. House ${
                          zoomView === "precinct" ? "precinct" : ""
                        } data for ${STATE_NAMES[zoomState ?? ""] ?? "this state"} yet`
                      : y === 2026
                      ? "Paint your 2026 U.S. House call — click districts (or counties) above the map"
                      : undefined
                  }
                  onClick={() => setHouseYear(y)}
                />
              );
            })
          : raceType === "president"
          ? PRESIDENTIAL_YEARS.map((y) => (
              <YearTab
                key={y}
                label={String(y)}
                active={presYear === y}
                disabled={precinctYearDisabled(y, "president")}
                title={
                  precinctYearDisabled(y, "president")
                    ? `No ${y} presidential precinct data for ${STATE_NAMES[zoomState ?? ""] ?? "this state"} yet`
                    : undefined
                }
                onClick={() => setPresYear(y)}
              />
            ))
          : (zoomSenateYears ?? [...SENATE_CYCLE_YEARS, 2026 as const]).map((y) => (
              <YearTab
                key={y}
                label={y === 2026 ? "2026" : String(y)}
                active={senYear === y}
                accent={y === 2026}
                disabled={
                  isSenateYearDisabled(y) ||
                  (y !== 2026 && precinctYearDisabled(y, "senate"))
                }
                title={
                  isSenateYearDisabled(y)
                    ? `${STATE_NAMES[zoomState ?? ""] ?? "This state"} had no ${y} Senate race — switch to the Districts layer to see ${y} U.S. House.`
                    : undefined
                }
                onClick={() => setSenYear(y)}
              />
            ))}
      </div>

      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-0">
          <div className="min-w-0 flex-1">
          {zoomState ? (
            <StateZoom
              usps={zoomState}
              stateName={STATE_NAMES[zoomState] ?? zoomState}
              raceKey={zoomRaceKey}
              painting={painting}
              selectedShade={selectedShade}
              onSelectShade={setSelectedShade}
              countyPicks={countyPicks.picks}
              precinctPicks={precinctPicks.picks}
              districtPicks={districtPicks.picks}
              onPaintCounty={handlePaintCounty}
              onPaintPrecinct={handlePaintPrecinct}
              onPaintDistrict={handlePaintDistrict}
              onBack={() => {
                setZoomState(null);
                setZoomView("county");
                setZoomHouse(false);
              }}
              onViewChange={setZoomView}
              onContext={setZoomContext}
              spotlightParty={zoomContext ? zoomSpotlight : null}
              overlaySlot={overlaySlot}
            />
          ) : (
            <>
              {isActiveTab && (
                <div className="mb-4 flex justify-center">
                  <ShadePalette selected={selectedShade} onSelect={setSelectedShade} />
                </div>
              )}
              <div className="relative">
                <UsMap
                  fills={natFlattenFill ? {} : fills}
                  interactiveStates={interactiveStates}
                  onStateClick={handleStateClick}
                  onStateSelect={handleStateSelect}
                  tooltip={tooltip}
                  hiddenStates={hiddenStates}
                  highlightStates={donutHighlight}
                  defs={defs}
                  overlayCircles={natOverlayTurnout}
                  overlayArrows={natOverlayShift}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
                {zoomNote ??
                  (isActiveTab
                    ? "Click a race state to paint your call · double-click any state to drill into its counties & precincts (all 50 states; CA, HI, OR and ME have county and district maps but no precinct layer — no 2020 Census voting districts published there)."
                    : "Click a state to zoom into its counties (all 50 states available).")}
              </p>
            </>
          )}
          </div>

          <div className="flex w-full shrink-0 justify-end lg:w-[168px]">
           <div className="flex flex-col items-center gap-3">
            {/* Shift / Turnout / Plain map pills, above the donut. StateZoom
                portals its own in here while zoomed into a state. */}
            <div
              ref={setOverlaySlot}
              className="flex flex-wrap justify-center gap-1.5 empty:hidden"
            >
              {!zoomState && !isActiveTab && natHasPrevData && (
                <>
                <button
                  onClick={() => setShowNatShift((v) => !v)}
                  title="Shift arrows: swing from each state's previous same-office election"
                  className={`pointer-events-auto rounded-full px-3 py-1 text-[11px] font-medium shadow transition-colors ${
                    showNatShift
                      ? "bg-indigo-600 text-white"
                      : "bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-900"
                  }`}
                >
                  Shift ↔
                </button>
                <button
                  onClick={() => setShowNatTurnout((v) => !v)}
                  title="Turnout: circle size is how many votes were cast in that state"
                  className={`pointer-events-auto rounded-full px-3 py-1 text-[11px] font-medium shadow transition-colors ${
                    showNatTurnout
                      ? "bg-indigo-600 text-white"
                      : "bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-900"
                  }`}
                >
                  Turnout ○
                </button>
                {(showNatShift || showNatTurnout) && (
                  <button
                    onClick={() => setShowNatBaseFill((v) => !v)}
                    title={
                      showNatBaseFill
                        ? "Hide the state colors so the overlay stands out on its own"
                        : "Show the state colors again"
                    }
                    className={`pointer-events-auto rounded-full px-3 py-1 text-[11px] font-medium shadow transition-colors ${
                      !showNatBaseFill
                        ? "bg-indigo-600 text-white"
                        : "bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-300 dark:hover:bg-gray-900"
                    }`}
                  >
                    Plain map
                  </button>
                )}
                </>
              )}
            </div>
            {zoomState && zoomContext && (
              <ContextDonut ctx={zoomContext} onHoverParty={setZoomSpotlight} />
            )}

            {zoomHouse && zoomState && !zoomContext && (
              <div className="w-full rounded-lg border border-gray-200 p-3 text-center text-xs dark:border-gray-800">
                <div className="font-semibold">
                  {houseYear === 2026 ? "Your 2026" : houseYear} U.S. House
                </div>
                {houseYear === 2026 ? (
                  housePicksTally && housePicksTally.total > 0 ? (
                    <div className="mt-1 tabular-nums">
                      <span style={{ color: HISTORICAL_COLORS.D }}>
                        {housePicksTally.d} D
                      </span>{" "}
                      ·{" "}
                      <span className="text-gray-500">
                        {housePicksTally.tossup} toss-up
                      </span>{" "}
                      ·{" "}
                      <span style={{ color: HISTORICAL_COLORS.R }}>
                        {housePicksTally.r} R
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1 text-gray-400">
                      Pick a color, then click districts to call them.
                    </div>
                  )
                ) : (
                  <div className="mt-1 text-gray-400">
                    {STATE_NAMES[zoomState] ?? zoomState} House vote by district.
                  </div>
                )}
              </div>
            )}

            {!zoomHouse && !zoomContext && presidentialView && (
              <DonutChart
                segments={shadeSegments(
                  presidentialView.shadeTally,
                  presidentialView.shadeStates
                )}
                centerPrimary={`${presidentialView.dEv}–${presidentialView.rEv}`}
                centerSecondary={
                  presidentialView.dEv > presidentialView.rEv
                    ? "Dem. win (D–R)"
                    : "Rep. win (D–R)"
                }
                centerBar={[
                  { label: "D", value: presidentialView.dEv, color: HISTORICAL_COLORS.D },
                  { label: "R", value: presidentialView.rEv, color: HISTORICAL_COLORS.R },
                ]}
                size={158}
                thickness={20}
                onSegmentHover={handleSegmentHover}
              />
            )}

            {!zoomHouse && !zoomContext && senateHistorical && (
                <DonutChart
                  segments={[
                    ...shadeSegments(
                      senateHistorical.shadeTally,
                      senateHistorical.shadeStates
                    ),
                    {
                      label: "Won by an independent",
                      value: senateHistorical.indSeats,
                      color: INDEPENDENT_COLOR,
                      states: senateHistorical.indStates,
                    },
                    {
                      label: "Held by Democrats (not up)",
                      value: senateHistorical.heldD,
                      color: LOCKED_COLORS.D,
                    },
                    {
                      label: "Held by Republicans (not up)",
                      value: senateHistorical.heldR,
                      color: LOCKED_COLORS.R,
                    },
                  ]}
                  centerPrimary={
                    senateHistorical.chamber
                      ? `${senateHistorical.chamber.dCaucus}–${senateHistorical.chamber.rCaucus}`
                      : `${senateHistorical.dSeats}–${senateHistorical.rSeats}`
                  }
                  centerSecondary={
                    senateHistorical.chamber
                      ? `Senate after ${senYear}`
                      : `of ${senateHistorical.totalRaces} races`
                  }
                  centerBar={
                    senateHistorical.chamber
                      ? [
                          {
                            label: "D",
                            value: senateHistorical.chamber.dCaucus,
                            color: HISTORICAL_COLORS.D,
                          },
                          {
                            label: "R",
                            value: senateHistorical.chamber.rCaucus,
                            color: HISTORICAL_COLORS.R,
                          },
                        ]
                      : undefined
                  }
                  size={158}
                  thickness={20}
                  onSegmentHover={handleSegmentHover}
                />
            )}

            {!zoomHouse && !zoomContext && senate2026 && (
                <DonutChart
                  segments={shadeSegments(
                    senate2026.shadeTally,
                    senate2026.shadeStates
                  )}
                  centerPrimary={`${senate2026.d}–${senate2026.r}`}
                  centerSecondary={
                    senate2026.tossup > 0
                      ? `+${senate2026.tossup} toss-up of 100`
                      : "of 100 seats"
                  }
                  centerBar={[
                    { label: "D", value: senate2026.d, color: HISTORICAL_COLORS.D },
                    { label: "Toss-up", value: senate2026.tossup, color: SHADE_COLORS.tossup },
                    { label: "R", value: senate2026.r, color: HISTORICAL_COLORS.R },
                  ]}
                  size={158}
                  thickness={20}
                  onSegmentHover={handleSegmentHover}
                />
            )}

            {isActiveTab && (
              <button
                onClick={resetAllPicks}
                disabled={!statePicks.hydrated || !anyPicks}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Reset all my picks
              </button>
            )}
           </div>
          </div>
        </div>

        {(donutInfo || isActiveTab) && (
          <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Worth knowing
            </h3>
            <div className="space-y-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {donutInfo}
              {isActiveTab && (
                <ul className="list-disc space-y-1.5 pl-4">
                  {SENATE_2026_NOTES.slice(0, 4).map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}

/**
 * The sidebar donut while zoomed into a state. Shows the D–R vote split for
 * whatever the map is focused on. Segments carry whole-percent values that sum
 * to 100 (an "Other" slice absorbs third parties and rounding) so a segment's
 * hover percentage matches the number in the centre.
 */
function ContextDonut({
  ctx,
  onHoverParty,
}: {
  ctx: ZoomContext;
  onHoverParty?: (p: "D" | "R" | null) => void;
}) {
  let dR = Math.round(ctx.dPct);
  let rR = Math.round(ctx.rPct);
  let oR = 100 - dR - rR;
  if (oR < 0) {
    if (dR >= rR) dR += oR;
    else rR += oR;
    oR = 0;
  }

  return (
    <DonutChart
      segments={[
        // Draw order is clockwise from 12 o'clock (first = right, last =
        // left) — R first so it lands on the right, D last so it lands on
        // the left, matching the map convention and the "D–R" center text.
        { label: "Republican", value: rR, color: HISTORICAL_COLORS.R },
        { label: "Democratic", value: dR, color: HISTORICAL_COLORS.D },
        ...(oR > 0
          ? [{ label: "Other / write-in", value: oR, color: "#9ca3af" }]
          : []),
      ]}
      centerPrimary={`${dR}–${rR}`}
      centerSecondary={
        dR >= rR ? "Dem. lead (D–R vote %)" : "Rep. lead (D–R vote %)"
      }
      centerBar={[
        { label: "D", value: dR, color: HISTORICAL_COLORS.D },
        { label: "R", value: rR, color: HISTORICAL_COLORS.R },
      ]}
      size={158}
      thickness={20}
      onSegmentHover={(seg) =>
        onHoverParty?.(
          seg?.label === "Democratic"
            ? "D"
            : seg?.label === "Republican"
            ? "R"
            : null
        )
      }
    />
  );
}

/** "Raphael Warnock" -> "Warnock"; keeps multi-word surnames like "Van Hollen". */
function lastName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return full;
  const particles = new Set(["van", "de", "la", "di", "del"]);
  let i = parts.length - 1;
  while (i > 1 && particles.has(parts[i - 1].toLowerCase())) i -= 1;
  return parts.slice(i).join(" ");
}

function YearTab({
  label,
  active,
  onClick,
  accent,
  disabled,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        disabled
          ? "cursor-not-allowed border border-gray-200 text-gray-300 dark:border-gray-800 dark:text-gray-600"
          : active
          ? accent
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-gray-900 text-white shadow-sm dark:bg-gray-100 dark:text-gray-900"
          : accent
          ? "border border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950"
          : "border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
      }`}
    >
      {label}
    </button>
  );
}
