import type { Route } from "./+types/polls";
import { cloudflareContext } from "~/lib/context.server";
import { useMemo, useState } from "react";
import {
  POLLS,
  POLLS_GENERATED_AT,
  averageMargin,
  latestPollDate,
  mergeManualPolls,
  raceKey,
  raceYear,
  type PartyCode,
  type RaceType,
  type RacePolls,
} from "~/data/polls";
import { STATE_PATHS } from "~/data/statePaths";
import { GENERIC_BALLOT } from "~/data/genericBallot";
import { readManualPollsFor } from "~/lib/pollsManual.server";

const ALL_RACE_KEYS = POLLS.map((r) => raceKey(r));

export async function loader({ context }: Route.LoaderArgs) {
  const manualByKey = await readManualPollsFor(context.get(cloudflareContext).env.DB, ALL_RACE_KEYS);
  return { manualByKey };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PoliticsPlace — Polls" },
    {
      name: "description",
      content:
        "2026 U.S. Senate, House, Governor and President polling by state and race, plus the generic congressional ballot.",
    },
  ];
}

const STATE_NAMES: Record<string, string> = Object.fromEntries(
  STATE_PATHS.map((s) => [s.id, s.name])
);

const PARTY_TEXT: Record<PartyCode, string> = {
  D: "text-blue-600 dark:text-blue-400",
  R: "text-red-600 dark:text-red-400",
  I: "text-green-600 dark:text-green-400",
  O: "text-gray-500 dark:text-gray-400",
};

const TABS: { id: RaceType; label: string }[] = [
  { id: "senate", label: "Senate" },
  { id: "house", label: "House" },
  { id: "governor", label: "Governor" },
  { id: "president", label: "President" },
];

function fmtLongDate(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Years we have any polling for a given office. */
function officeYears(allRaces: RacePolls[], office: RaceType): number[] {
  const ys = new Set<number>();
  for (const r of allRaces)
    if (r.raceType === office && r.polls.length > 0) ys.add(raceYear(r));
  return [...ys].sort((a, b) => a - b);
}

/** This tab's own aggregate: how many of the office's polled races in a year
 *  each party leads (by the same leader the race card shows), as a share of
 *  all of them. Tied and third-party leads count toward the total only. */
function officeLeads(
  allRaces: RacePolls[],
  office: RaceType,
  year: number
): { d: number; r: number; dCount: number; rCount: number; n: number } | null {
  const races = allRaces.filter(
    (x) => x.raceType === office && raceYear(x) === year && x.polls.length > 0
  );
  let dCount = 0, rCount = 0, n = 0;
  for (const race of races) {
    const s = raceSummary(race);
    if (!s) continue;
    n += 1;
    if (s.party === "D") dCount += 1;
    else if (s.party === "R") rCount += 1;
  }
  if (!n) return null;
  return {
    d: Math.round((dCount / n) * 1000) / 10,
    r: Math.round((rCount / n) * 1000) / 10,
    dCount,
    rCount,
    n,
  };
}

const OFFICE_LABEL: Record<RaceType, string> = {
  senate: "Senate",
  house: "House",
  governor: "Governor",
  president: "President",
};

const ALL_BALLOT_YEARS = [2016, 2018, 2020, 2022, 2024, 2026];

interface BallotData {
  d: number;
  r: number;
  spread: string;
  /** Right-aligned meta line. */
  sub: string;
  note?: string;
  /** Race counts behind d/r, for the races-led tabs. */
  counts?: { d: number; r: number; n: number };
}

/** The D-vs-R figure for one tab in one year. House uses the national generic
 *  congressional ballot; the other offices use the share of that office's
 *  polled races each party leads (see officeLeads). */
function ballotFor(allRaces: RacePolls[], tab: RaceType, year: number): BallotData | null {
  if (tab === "house") {
    const g = GENERIC_BALLOT.find((x) => x.year === year);
    if (!g) return null;
    return {
      d: g.d,
      r: g.r,
      spread: g.spread,
      sub: year === 2026 ? `Polling average · ${fmtDate(g.asOf)}` : "Final polling average",
      note: g.note,
    };
  }
  const agg = officeLeads(allRaces, tab, year);
  if (!agg) return null;
  const lead = agg.dCount - agg.rCount;
  const other = agg.n - agg.dCount - agg.rCount;
  return {
    d: agg.d,
    r: agg.r,
    spread: lead === 0 ? "Even" : `${lead > 0 ? "D" : "R"}+${Math.abs(lead)}`,
    sub: `leads in ${agg.n} polled race${agg.n === 1 ? "" : "s"} · ${year}`,
    note: `Share of the ${agg.n} ${year} ${OFFICE_LABEL[tab].toLowerCase()} races with polls on this page that each party leads in its polling average${other ? ` (${other} tied or led by another candidate)` : ""}. Unpolled races are not counted.`,
    counts: { d: agg.dCount, r: agg.rCount, n: agg.n },
  };
}

/** Years a tab has a ballot figure for. */
function ballotYears(allRaces: RacePolls[], tab: RaceType): number[] {
  return tab === "house"
    ? GENERIC_BALLOT.map((g) => g.year)
    : officeYears(allRaces, tab);
}

/** One D-vs-R summary bar with year pills — used on every tab. */
function BallotCard({
  allRaces,
  tab,
  year,
  onYear,
}: {
  allRaces: RacePolls[];
  tab: RaceType;
  year: number;
  onYear: (y: number) => void;
}) {
  const data = ballotFor(allRaces, tab, year);
  const have = new Set(ballotYears(allRaces, tab));
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {tab === "house"
            ? "Generic congressional ballot"
            : `${OFFICE_LABEL[tab]} races led`}
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {data ? data.sub : "—"}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {ALL_BALLOT_YEARS.map((y) => {
          const enabled = have.has(y);
          return (
            <button
              key={y}
              disabled={!enabled}
              onClick={() => onYear(y)}
              title={
                enabled
                  ? undefined
                  : "No polling pulled for this year yet — run pnpm polls:all"
              }
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                y === year
                  ? "bg-gray-900 text-white shadow-sm dark:bg-gray-100 dark:text-gray-900"
                  : enabled
                  ? "border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  : "border border-gray-200 text-gray-300 dark:border-gray-800 dark:text-gray-600"
              }`}
            >
              {y}
            </button>
          );
        })}
      </div>

      {data ? (
        <>
          <div className="mt-3 flex items-baseline justify-between text-sm">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              D {data.counts ? `${data.counts.d}/${data.counts.n} · ` : ""}{data.d}%
            </span>
            <span
              className={`font-bold ${
                data.spread.startsWith("D")
                  ? "text-blue-600 dark:text-blue-400"
                  : data.spread.startsWith("R")
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {data.spread}
            </span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              R {data.counts ? `${data.counts.r}/${data.counts.n} · ` : ""}{data.r}%
            </span>
          </div>
          <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <span className="bg-blue-500" style={{ width: `${data.d}%` }} />
            <span className="ml-auto bg-red-500" style={{ width: `${data.r}%` }} />
          </div>
          {data.note && (
            <p className="mt-2.5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
              {data.note}
            </p>
          )}
          {tab === "house" && (
            <details className="mt-3 border-t border-gray-100 pt-2.5 dark:border-gray-800">
              <summary className="cursor-pointer text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                What is the generic ballot?
              </summary>
              <div className="mt-2 space-y-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                <p>
                  The generic congressional ballot is a national poll question that asks
                  voters which party they would support for Congress in their district,
                  without naming any candidates &mdash; for example, &ldquo;If the election
                  were held today, would you vote for the Democratic or the Republican
                  candidate for the U.S. House?&rdquo;
                </p>
                <p>
                  Because it leaves out names, it measures the overall mood toward each
                  party rather than any one race. It is the most common way to track the
                  national House picture, since most of the 435 districts are rarely or
                  never polled on their own.
                </p>
                <p>
                  Read it as a rough guide, not a seat count. Districts are drawn
                  unevenly, so a party can win the national vote and still lose the
                  House majority, and the average has missed the final national House
                  vote by several points in some years.
                </p>
              </div>
            </details>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No {year} {OFFICE_LABEL[tab].toLowerCase()} polling loaded.
        </p>
      )}
    </div>
  );
}

/** Leader + margin summary for a race, preferring the source's own average. */
function raceSummary(race: RacePolls): { text: string; party: PartyCode } | null {
  if (race.aggregateAverage) {
    const [top, second] = [...race.aggregateAverage.results].sort((a, b) => b.pct - a.pct);
    const tied = top && second && top.pct === second.pct;
    return { text: race.aggregateAverage.spread, party: tied ? "O" : top?.party ?? "O" };
  }
  const margin = averageMargin(race);
  const [a, b] = race.candidates;
  if (margin == null || !a || !b) return null;
  if (margin === 0) return { text: "Tied", party: "O" };
  const leader = margin > 0 ? a : b;
  return {
    text: `${leader.name} +${Math.abs(margin).toFixed(1)}`,
    party: leader.party,
  };
}

export default function Polls({ loaderData }: Route.ComponentProps) {
  const [tab, setTab] = useState<RaceType>("senate");
  const [ballotYear, setBallotYear] = useState(2026);

  // POLLS is the static SEEDED+GENERATED base (unchanged, build-time); the
  // manual submissions the loader just fetched from D1 fold in on top of it
  // here, live, on every request — see mergeManualPolls in ~/data/polls.
  const allRaces = useMemo(
    () => mergeManualPolls(POLLS, loaderData.manualByKey),
    [loaderData.manualByKey]
  );

  // Keep the year valid for the tab (House ballot has 2022/24/26; the office
  // averages only have years their race polls were pulled for).
  const validYears = ballotYears(allRaces, tab);
  const year = validYears.includes(ballotYear)
    ? ballotYear
    : validYears[validYears.length - 1] ?? 2026;

  const byState = useMemo(() => {
    const groups = new Map<string, RacePolls[]>();
    for (const race of allRaces) {
      if (race.raceType !== tab) continue;
      if (raceYear(race) !== year) continue;
      const list = groups.get(race.state) ?? [];
      list.push(race);
      groups.set(race.state, list);
    }
    return [...groups.entries()]
      .map(([state, races]) => ({
        state,
        // Districts in number order; anything else newest poll first.
        races: [...races].sort(
          (a, b) =>
            (a.district ?? 0) - (b.district ?? 0) ||
            latestPollDate(b).localeCompare(latestPollDate(a))
        ),
      }))
      .sort((a, b) =>
        (STATE_NAMES[a.state] ?? a.state).localeCompare(
          STATE_NAMES[b.state] ?? b.state
        )
      );
  }, [allRaces, tab, year]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
            Polls
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            2026 polling by state and race, compiled from Wikipedia&rsquo;s
            election articles
            {POLLS_GENERATED_AT ? ` · updated ${fmtLongDate(POLLS_GENERATED_AT)}` : ""}.
          </p>
        </div>
        <a
          href="/polls/submit"
          className="mt-1 shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          + Add a poll
        </a>
      </header>

      {/* Full width on phones (four equal tabs, count under the label) so the
          bar never pushes the page sideways; a compact inline bar from sm up. */}
      <div className="mb-6 flex w-full rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-900 sm:inline-flex sm:w-auto">
        {TABS.map((t) => {
          const count = allRaces.filter((r) => r.raceType === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center rounded-md px-1.5 py-1.5 text-sm font-medium transition-colors sm:flex-none sm:flex-row sm:px-3.5 ${
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500 sm:ml-1.5">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-4">
        <BallotCard allRaces={allRaces} tab={tab} year={year} onYear={setBallotYear} />
      </div>

      {byState.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No {year} {tab} race polling loaded
          {tab === "house" ? " — the bar above is the national generic ballot" : ""}.
        </p>
      ) : (
        <div className="space-y-2">
          {byState.map(({ state, races }) => {
            const primary = races[0];
            const racesWithPolls = races.filter((r) => r.polls.length > 0).length;
            // One race: show its leading margin. Several: just the count.
            const summary =
              primary && racesWithPolls <= 1 ? raceSummary(primary) : null;
            const pollCount = races.reduce((n, r) => n + r.polls.length, 0);
            return (
              <details
                key={state}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <span className="flex items-center gap-2">
                    <svg
                      viewBox="0 0 12 12"
                      className="h-3 w-3 shrink-0 text-gray-400 transition-transform group-open:rotate-90"
                      fill="currentColor"
                    >
                      <path d="M4 2l4 4-4 4z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {STATE_NAMES[state] ?? state}
                    </span>
                    {primary?.special && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        special
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-3 text-xs">
                    {summary ? (
                      <span className={`font-semibold ${PARTY_TEXT[summary.party]}`}>
                        {summary.text}
                      </span>
                    ) : (
                      racesWithPolls > 1 && (
                        <span className="text-gray-500 dark:text-gray-400">
                          {racesWithPolls} races
                        </span>
                      )
                    )}
                    <span className="text-gray-400 dark:text-gray-500">
                      {pollCount} poll{pollCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </summary>

                <div className="space-y-4 border-t border-gray-100 p-4 dark:border-gray-800">
                  {races.map((race) => (
                    <RaceCard
                      key={`${race.state}-${race.raceType}-${race.district ?? ""}-${race.title}`}
                      race={race}
                    />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}


function RaceCard({ race }: { race: RacePolls }) {
  const polls = [...race.polls].sort((p, q) => q.endDate.localeCompare(p.endDate));
  const summary = raceSummary(race);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {race.title}
        </h3>
        <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {race.sourceNote && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              via {race.sourceNote}
            </span>
          )}
          {race.aggregateAverage ? (
            <span>
              {race.source} avg:{" "}
              <span
                className={`font-semibold ${summary ? PARTY_TEXT[summary.party] : ""}`}
              >
                {race.aggregateAverage.spread}
              </span>{" "}
              <span className="text-gray-400 dark:text-gray-500">
                ({race.aggregateAverage.period})
              </span>
            </span>
          ) : (
            summary && (
              <span>
                Avg of {race.polls.length}:{" "}
                <span className={`font-semibold ${PARTY_TEXT[summary.party]}`}>
                  {summary.text}
                </span>
              </span>
            )
          )}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-gray-500 dark:text-gray-400">
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-3 py-2 font-medium">Pollster</th>
              <th className="px-3 py-2 font-medium">Dates</th>
              <th className="px-3 py-2 font-medium">Sample</th>
              {race.candidates.map((c) => (
                <th key={c.name} className="px-3 py-2 text-right font-medium">
                  {c.name} ({c.party})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {polls.map((poll, i) => {
              const get = (name: string) =>
                poll.results.find((r) => r.candidate === name)?.pct;
              const top = Math.max(
                ...race.candidates
                  .map((c) => get(c.name) ?? -Infinity)
                  .filter((n) => Number.isFinite(n))
              );
              return (
                <tr
                  key={i}
                  className="border-b border-gray-50 last:border-0 dark:border-gray-800/60"
                >
                  <td className="px-3 py-2">
                    {poll.url ? (
                      <a
                        href={poll.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-900 underline decoration-gray-300 underline-offset-2 hover:decoration-gray-500 dark:text-gray-100"
                      >
                        {poll.pollster}
                      </a>
                    ) : (
                      <span className="text-gray-900 dark:text-gray-100">
                        {poll.pollster}
                      </span>
                    )}
                    {poll.partisan && (
                      <span
                        className={`ml-1.5 align-middle text-[10px] font-medium ${PARTY_TEXT[poll.partisan]}`}
                        title={poll.sponsor ? `Sponsor: ${poll.sponsor}` : "Partisan poll"}
                      >
                        ({poll.partisan}){poll.sponsor ? "*" : ""}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-500 dark:text-gray-400">
                    {fmtDate(poll.startDate)} – {fmtDate(poll.endDate)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-500 dark:text-gray-400">
                    {poll.sampleSize
                      ? `${poll.sampleSize.toLocaleString()} ${poll.population ?? ""}`
                      : poll.population ?? "—"}
                  </td>
                  {race.candidates.map((c) => {
                    const v = get(c.name);
                    const isTop = v != null && v === top;
                    return (
                      <td
                        key={c.name}
                        className={`px-3 py-2 text-right tabular-nums ${
                          isTop
                            ? `font-semibold ${PARTY_TEXT[c.party]}`
                            : "text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {v != null ? `${v}%` : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
