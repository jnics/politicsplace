import type { Route } from "./+types/polls";
import { useMemo, useState } from "react";
import {
  POLLS,
  POLLS_GENERATED_AT,
  averageMargin,
  latestPollDate,
  type PartyCode,
  type RaceType,
  type RacePolls,
} from "~/data/polls";
import { STATE_PATHS } from "~/data/statePaths";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PoliticsPlace — Polls" },
    {
      name: "description",
      content:
        "Latest 2026 U.S. Senate polling by state and race, sourced from RealClearPolling.",
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

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Leader + margin summary for a race, preferring the source's own average. */
function raceSummary(race: RacePolls): { text: string; party: PartyCode } | null {
  if (race.aggregateAverage) {
    const top = [...race.aggregateAverage.results].sort((a, b) => b.pct - a.pct)[0];
    return { text: race.aggregateAverage.spread, party: top?.party ?? "O" };
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

export default function Polls() {
  const [tab, setTab] = useState<RaceType>("senate");

  const byState = useMemo(() => {
    const groups = new Map<string, RacePolls[]>();
    for (const race of POLLS) {
      if (race.raceType !== tab) continue;
      const list = groups.get(race.state) ?? [];
      list.push(race);
      groups.set(race.state, list);
    }
    return [...groups.entries()]
      .map(([state, races]) => ({
        state,
        races: [...races].sort((a, b) =>
          latestPollDate(b).localeCompare(latestPollDate(a))
        ),
      }))
      .sort((a, b) =>
        (STATE_NAMES[a.state] ?? a.state).localeCompare(
          STATE_NAMES[b.state] ?? b.state
        )
      );
  }, [tab]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          Polls
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          2026 polling by state and race, sourced from RealClearPolling
          {POLLS_GENERATED_AT ? ` · updated ${POLLS_GENERATED_AT}` : ""}.
        </p>
      </header>

      <div className="mb-6 inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-900">
        {TABS.map((t) => {
          const count = POLLS.filter((r) => r.raceType === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {byState.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No {tab} polling loaded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {byState.map(({ state, races }) => {
            const primary = races[0];
            const summary = primary ? raceSummary(primary) : null;
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
                    {summary && (
                      <span className={`font-semibold ${PARTY_TEXT[summary.party]}`}>
                        {summary.text}
                      </span>
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
