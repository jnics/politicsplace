import { useMemo, useState } from "react";
import { UsMap } from "~/components/UsMap";
import { DonutChart, type DonutSegment } from "~/components/DonutChart";
import { ShadePalette } from "~/components/Legend";
import { ThemeToggle } from "~/components/ThemeToggle";
import { STATE_PATHS } from "~/data/statePaths";
import {
  PRESIDENTIAL_RESULTS,
  PRESIDENTIAL_YEARS,
  type PresidentialYear,
} from "~/data/presidentialResults";
import { SENATE_CYCLE_YEARS, type SenateCycleYear } from "~/data/senateResults";
import { SENATE_2026_NOTES } from "~/data/senate2026";
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

/** Donut segments for the 7-point margin spectrum, with the states in each bucket. */
function shadeSegments(
  tally: Record<Shade, number>,
  statesByShade: Record<Shade, string[]>
): DonutSegment[] {
  return SHADE_ORDER.map((shade) => ({
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
  const [presYear, setPresYear] = useState<PresidentialYear>(2024);
  const [senYear, setSenYear] = useState<SenateCycleYear | 2026>(2026);
  const [selectedShade, setSelectedShade] = useState<Shade>("tossup");
  const [donutHighlight, setDonutHighlight] = useState<Set<string> | null>(null);
  const { picks, setPick, resetPicks, hydrated } = usePredictionPicks();

  const isActiveTab = raceType === "senate" && senYear === 2026;

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

  const senate2026 = useMemo(
    () => (isActiveTab ? computeSenate2026View(picks) : null),
    [isActiveTab, picks]
  );

  const fills: Record<string, string> = useMemo(() => {
    if (presidentialView) return presidentialView.fills;
    if (senateHistorical) return senateHistorical.fills;
    if (senate2026) return senate2026.fills;
    return {};
  }, [presidentialView, senateHistorical, senate2026]);

  const interactiveStates = useMemo(() => {
    if (senate2026) return senate2026.activeStates;
    return new Set<string>();
  }, [senate2026]);

  const hiddenStates = raceType === "senate" ? new Set(["DC"]) : undefined;

  function handleSegmentHover(segment: DonutSegment | null) {
    setDonutHighlight(
      segment?.states && segment.states.length > 0 ? new Set(segment.states) : null
    );
  }

  function handleStateClick(state: string, direction: 1 | -1) {
    if (!senate2026?.activeStates.has(state)) return;
    // Left click paints with whatever color is selected in the palette;
    // right click is a quick "clear back to toss-up" shortcut.
    setPick(state, direction === 1 ? selectedShade : "tossup");
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
        </div>
      );
    }

    if (senate2026) {
      const info = senate2026.stateInfo[state];
      if (!info) return <TipHeader name={name} />;
      if (info.active && info.activeSeat) {
        const shade = picks[state] ?? "tossup";
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
            <div className="border-t border-white/15 pt-1 font-medium dark:border-black/10">
              Your pick: {SHADE_LABELS[shade]}
            </div>
            <div className="text-gray-300 dark:text-gray-600">
              Click to apply selected color &middot; right-click to clear
            </div>
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
            PoliticsPlace Election Map
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Explore presidential and Senate results since 2016 &mdash; and make your own
            predictions for the 2026 Senate races.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-900">
        {(["senate", "president"] as RaceType[]).map((type) => (
          <button
            key={type}
            onClick={() => setRaceType(type)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              raceType === type
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {type === "senate" ? "Senate" : "President"}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {raceType === "president"
          ? PRESIDENTIAL_YEARS.map((y) => (
              <YearTab key={y} label={String(y)} active={presYear === y} onClick={() => setPresYear(y)} />
            ))
          : [...SENATE_CYCLE_YEARS, 2026 as const].map((y) => (
              <YearTab
                key={y}
                label={y === 2026 ? "2026 · Predict" : String(y)}
                active={senYear === y}
                accent={y === 2026}
                onClick={() => setSenYear(y)}
              />
            ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          {senate2026 && (
            <div className="mb-4 flex justify-center">
              <ShadePalette selected={selectedShade} onSelect={setSelectedShade} />
            </div>
          )}
          <UsMap
            fills={fills}
            interactiveStates={interactiveStates}
            onStateClick={handleStateClick}
            tooltip={tooltip}
            hiddenStates={hiddenStates}
            highlightStates={donutHighlight}
            defs={defs}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {raceType === "president"
                ? `${presYear} Presidential Election`
                : senYear === 2026
                ? "2026 Senate — Your Predictions"
                : `${senYear} Senate Elections`}
            </h2>

            {presidentialView && (
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
                majorityFraction={270 / 538}
                majorityLabel="270 electoral votes to win"
                onSegmentHover={handleSegmentHover}
              />
            )}

            {senateHistorical && (
              <>
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
                  majorityFraction={senateHistorical.chamber ? 51 / 100 : undefined}
                  majorityLabel={
                    senateHistorical.chamber ? "51 seats for majority" : undefined
                  }
                  onSegmentHover={handleSegmentHover}
                />
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  The ring is the full 100-seat Senate after {senYear}: the{" "}
                  {senateHistorical.totalRaces} seats decided that November shaded by
                  margin, the other {senateHistorical.heldD + senateHistorical.heldR}{" "}
                  muted. Gray states on the map had no race that cycle.
                </p>
              </>
            )}

            {senate2026 && (
              <>
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
                  majorityFraction={51 / 100}
                  majorityLabel="51 seats for majority"
                  onSegmentHover={handleSegmentHover}
                />
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  35 seats are up in 2026. Pick a color above, then click a
                  state to apply it (right-click clears it). The other 65
                  seats aren&rsquo;t up this cycle and are shown at their
                  current party.
                </p>
                <button
                  onClick={resetPicks}
                  disabled={!hydrated || Object.keys(picks).length === 0}
                  className="mt-4 w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Reset all my picks
                </button>
              </>
            )}
          </div>

          {senYear === 2026 && raceType === "senate" && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Worth knowing
              </h3>
              <ul className="list-disc space-y-1.5 pl-4 text-xs text-gray-600 dark:text-gray-400">
                {SENATE_2026_NOTES.slice(0, 4).map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
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
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
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
