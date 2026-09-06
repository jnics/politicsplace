import type { Route } from "./+types/polls";
import { useMemo } from "react";
import {
  POLLS,
  averageMargin,
  latestPollDate,
  type PartyCode,
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

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Polls() {
  // Group races by state, states alphabetical, races within a state by most
  // recent poll first.
  const byState = useMemo(() => {
    const groups = new Map<string, RacePolls[]>();
    for (const race of POLLS) {
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
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          Polls
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          2026 U.S. Senate polling by state and race. Source: RealClearPolling.
          House, governor, and presidential races will be added later.
        </p>
      </header>

      {byState.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No polling data loaded yet. Run <code>pnpm polls:pull</code>.
        </p>
      )}

      <div className="space-y-8">
        {byState.map(({ state, races }) => (
          <section key={state}>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {STATE_NAMES[state] ?? state}
            </h2>
            <div className="space-y-6">
              {races.map((race) => (
                <RaceCard key={`${race.state}-${race.raceType}-${race.district ?? ""}`} race={race} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function RaceCard({ race }: { race: RacePolls }) {
  const margin = averageMargin(race);
  const [a, b] = race.candidates;
  const polls = [...race.polls].sort((p, q) => q.endDate.localeCompare(p.endDate));

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {race.title}
        </h3>
        {race.aggregateAverage ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {race.source} average:{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {race.aggregateAverage.spread}
            </span>{" "}
            <span className="text-gray-400 dark:text-gray-500">
              ({race.aggregateAverage.period})
            </span>
          </span>
        ) : (
          margin != null &&
          a &&
          b && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Polling average:{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {margin === 0
                  ? "Tied"
                  : `${(margin > 0 ? a : b).name} +${Math.abs(margin).toFixed(1)}`}
              </span>{" "}
              ({race.polls.length} poll{race.polls.length === 1 ? "" : "s"})
            </span>
          )
        )}
      </div>

      {polls.length === 0 ? (
        <p className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
          No polls yet for this race.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-gray-500 dark:text-gray-400">
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-2 font-medium">Pollster</th>
                <th className="px-4 py-2 font-medium">Dates</th>
                <th className="px-4 py-2 font-medium">Sample</th>
                {race.candidates.map((c) => (
                  <th key={c.name} className="px-4 py-2 text-right font-medium">
                    {lastName(c.name)} ({c.party})
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
                    <td className="px-4 py-2">
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
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-500 dark:text-gray-400">
                      {fmtDate(poll.startDate)} – {fmtDate(poll.endDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-500 dark:text-gray-400">
                      {poll.sampleSize ? `${poll.sampleSize} ${poll.population ?? ""}` : "—"}
                    </td>
                    {race.candidates.map((c) => {
                      const v = get(c.name);
                      const isTop = v != null && v === top;
                      return (
                        <td
                          key={c.name}
                          className={`px-4 py-2 text-right tabular-nums ${
                            isTop ? `font-semibold ${PARTY_TEXT[c.party]}` : "text-gray-600 dark:text-gray-300"
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
      )}

      {race.lastPulled && (
        <p className="px-4 py-2 text-[11px] text-gray-400 dark:text-gray-500">
          Pulled {race.lastPulled} from {race.source}.
        </p>
      )}
    </div>
  );
}

function lastName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : full;
}
