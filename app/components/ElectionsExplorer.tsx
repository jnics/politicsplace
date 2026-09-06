import { useMemo, useState } from "react";
import { UsMap } from "~/components/UsMap";
import { TallyBar } from "~/components/TallyBar";
import { ShadeLegend, SimpleLegend } from "~/components/Legend";
import { STATE_PATHS } from "~/data/statePaths";
import {
  PRESIDENTIAL_RESULTS,
  PRESIDENTIAL_YEARS,
  type PresidentialYear,
} from "~/data/presidentialResults";
import { SENATE_CYCLE_YEARS, type SenateCycleYear } from "~/data/senateResults";
import { SENATE_2026_NOTES } from "~/data/senate2026";
import { computePresidentialView, patternIdFor } from "~/lib/presidentialMap";
import { computeSenateHistoricalView, computeSenate2026View } from "~/lib/senateMap";
import { HISTORICAL_COLORS, cycleShade, SHADE_LABELS } from "~/lib/shades";
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

export function ElectionsExplorer() {
  const [raceType, setRaceType] = useState<RaceType>("senate");
  const [presYear, setPresYear] = useState<PresidentialYear>(2024);
  const [senYear, setSenYear] = useState<SenateCycleYear | 2026>(2026);
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

  function handleStateClick(state: string, direction: 1 | -1) {
    if (!senate2026?.activeStates.has(state)) return;
    const current = picks[state] ?? "tossup";
    setPick(state, cycleShade(current, direction));
  }

  function tooltip(state: string) {
    const name = STATE_NAMES[state] ?? state;

    if (presidentialView) {
      const data = presidentialViewResultFor(state, presYear);
      if (!data) return <div className="font-semibold">{name}</div>;
      return (
        <div>
          <div className="font-semibold">{name}</div>
          <div>{data.summary}</div>
        </div>
      );
    }

    if (senateHistorical) {
      const won = senateHistorical.upStates.has(state);
      return (
        <div>
          <div className="font-semibold">{name}</div>
          <div>{won ? `Won by ${senateHistorical.fills[state] === HISTORICAL_COLORS.D ? "Democrats" : "Republicans"}` : "No Senate race this cycle"}</div>
        </div>
      );
    }

    if (senate2026) {
      const info = senate2026.stateInfo[state];
      if (!info) return <div className="font-semibold">{name}</div>;
      if (info.active && info.activeSeat) {
        const shade = picks[state] ?? "tossup";
        return (
          <div className="space-y-0.5">
            <div className="font-semibold">{name}</div>
            <div>
              {SEAT_CLASS_LABEL[info.activeSeat.seatClass]} seat
              {info.activeSeat.special ? " (special election)" : ""}
            </div>
            {info.activeSeat.incumbent && (
              <div>
                Incumbent: {info.activeSeat.incumbent} (
                {info.activeSeat.currentParty})
              </div>
            )}
            {info.activeSeat.note && (
              <div className="text-gray-300 dark:text-gray-600">{info.activeSeat.note}</div>
            )}
            <div className="pt-1 font-medium">Your pick: {SHADE_LABELS[shade]}</div>
            <div className="text-gray-300 dark:text-gray-600">
              Click to cycle &middot; right-click to go back
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-0.5">
          <div className="font-semibold">{name}</div>
          <div>No Senate race in 2026</div>
          {info.seats.map((seat) => (
            <div key={seat.seatClass}>
              {SEAT_CLASS_LABEL[seat.seatClass]}: {seat.incumbent ?? "?"} (
              {seat.currentParty})
            </div>
          ))}
        </div>
      );
    }

    return <div className="font-semibold">{name}</div>;
  }

  function presidentialViewResultFor(state: string, year: PresidentialYear) {
    const result = PRESIDENTIAL_RESULTS[year][state];
    if (!result) return null;
    if (result.party === "split") {
      return { summary: result.details ?? "Split electoral votes" };
    }
    return {
      summary: `Won by ${result.party === "D" ? "Democrats" : "Republicans"} (${result.ev} EV)`,
    };
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
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          PoliticsPlace Election Map
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Explore presidential and Senate results since 2016 &mdash; and make your own
          predictions for the 2026 Senate races.
        </p>
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
          <UsMap
            fills={fills}
            interactiveStates={interactiveStates}
            onStateClick={handleStateClick}
            tooltip={tooltip}
            hiddenStates={hiddenStates}
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
              <>
                <TallyBar
                  dCount={presidentialView.dEv}
                  rCount={presidentialView.rEv}
                  total={presidentialView.total}
                  majorityMark={270}
                  dCaption="Dem. EV"
                  rCaption="Rep. EV"
                />
                <div className="mt-4">
                  <SimpleLegend
                    items={[
                      { color: HISTORICAL_COLORS.D, label: "Won by Democrats" },
                      { color: HISTORICAL_COLORS.R, label: "Won by Republicans" },
                    ]}
                  />
                </div>
              </>
            )}

            {senateHistorical && (
              <>
                <TallyBar
                  dCount={senateHistorical.dSeats}
                  rCount={senateHistorical.rSeats}
                  total={senateHistorical.totalRaces}
                  dCaption="D seats won"
                  rCaption="R seats won"
                />
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Showing only the {senateHistorical.totalRaces} races decided that
                  November. States shown in light gray had no Senate race in {senYear}.
                </p>
                <div className="mt-4">
                  <SimpleLegend
                    items={[
                      { color: HISTORICAL_COLORS.D, label: "Won by Democrats" },
                      { color: HISTORICAL_COLORS.R, label: "Won by Republicans" },
                      { color: "#e4e4e7", label: "No race this cycle" },
                    ]}
                  />
                </div>
              </>
            )}

            {senate2026 && (
              <>
                <TallyBar
                  dCount={senate2026.d}
                  rCount={senate2026.r}
                  otherCount={senate2026.tossup}
                  total={senate2026.total}
                  majorityMark={51}
                  dCaption="D / D-lean"
                  rCaption="R / R-lean"
                />
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  35 seats are up in 2026 (33 regular + 2 specials). Click a state
                  to set your prediction; right-click to go back a step. The other
                  65 seats aren&rsquo;t up this cycle and are shown at their
                  current party.
                </p>
                <div className="mt-4">
                  <ShadeLegend />
                </div>
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
