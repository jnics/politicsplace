import type { Route } from "./+types/ratings";
import { Fragment, useMemo, useState } from "react";
import raceRatings from "~/data/raceRatings.generated.json";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PoliticsPlace — Race Ratings" },
    {
      name: "description",
      content:
        "Consensus 2026 race ratings from Cook Political Report, Sabato's Crystal Ball, Inside Elections, and other forecasters, compiled from Wikipedia.",
    },
  ];
}

interface Rating {
  label: string;
  party: "D" | "R" | null;
  flip: boolean;
}
interface RatedRace {
  label: string;
  raceType: "house" | "senate" | "governor";
  ratings: Record<string, Rating>;
}
const DATA = raceRatings as {
  generatedAt: string;
  byRace: Record<string, RatedRace[]>;
};

const FORECASTER_NAMES: Record<string, string> = {
  cook: "Cook Political Report",
  insideElections: "Inside Elections",
  sabato: "Sabato's Crystal Ball",
  economist: "The Economist",
  splitTicket: "Split Ticket",
  ddhq: "Decision Desk HQ",
  fiftyPlusOne: "FiftyPlusOne",
  foxNews: "Fox News",
  silverBulletin: "Silver Bulletin",
  rcp: "RealClearPolitics",
};
// Display order: the three most commonly cited first, rest after.
const FORECASTER_ORDER = [
  "cook", "sabato", "insideElections", "economist", "ddhq",
  "splitTicket", "fiftyPlusOne", "foxNews", "silverBulletin", "rcp",
];

const RATING_RANK: Record<string, number> = {
  Safe: 0, Solid: 0, Likely: 1, Lean: 2, Tilt: 3, Tossup: 4,
};

const PARTY_BG: Record<string, string> = {
  D: "bg-blue-600",
  R: "bg-red-600",
};
const PARTY_BG_SOFT: Record<string, string> = {
  D: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  R: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

function RatingBadge({ r }: { r: Rating }) {
  const cls = r.party
    ? PARTY_BG_SOFT[r.party]
    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {r.label}
      {r.party ? ` ${r.party}` : ""}
      {r.flip ? " ⇄" : ""}
    </span>
  );
}

/** A simple consensus: most common (rank, party) combination among the
 *  forecasters that rated this race — a quick single badge, not a computed
 *  average (ratings are ordinal categories, not numbers). */
function consensusOf(ratings: Record<string, Rating>): Rating | null {
  const counts = new Map<string, { rating: Rating; count: number }>();
  for (const r of Object.values(ratings)) {
    const key = `${r.label}|${r.party ?? ""}`;
    const cur = counts.get(key);
    if (cur) cur.count += 1;
    else counts.set(key, { rating: r, count: 1 });
  }
  let best: { rating: Rating; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best?.rating ?? null;
}

export default function Ratings() {
  const [tab, setTab] = useState<"senate" | "house" | "governor">("senate");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const races = useMemo(() => {
    const list = DATA.byRace[tab] ?? [];
    return [...list].sort((a, b) => {
      const ca = consensusOf(a.ratings);
      const cb = consensusOf(b.ratings);
      const ra = ca ? RATING_RANK[ca.label] ?? 5 : 5;
      const rb = cb ? RATING_RANK[cb.label] ?? 5 : 5;
      if (ra !== rb) return ra - rb;
      return a.label.localeCompare(b.label);
    });
  }, [tab]);

  function toggle(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          Race Ratings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Consensus 2026 race ratings, compiled from Wikipedia&rsquo;s own
          tables of forecaster ratings (Cook Political Report, Sabato&rsquo;s
          Crystal Ball, Inside Elections, and others). Click a race to see
          every forecaster individually.
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Updated {DATA.generatedAt}. ⇄ marks a rating that predicts the seat
          flips parties.
        </p>
      </header>

      <div className="mb-4 flex gap-2">
        {(["senate", "house", "governor"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {races.map((race) => {
          const isOpen = expanded.has(race.label);
          const consensus = consensusOf(race.ratings);
          const n = Object.keys(race.ratings).length;
          return (
            <Fragment key={race.label}>
              <div
                onClick={() => toggle(race.label)}
                className="flex cursor-pointer items-center justify-between gap-2 border-t border-gray-100 px-4 py-2 text-sm first:border-t-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  <span className="mr-1 inline-block w-3 text-gray-300 dark:text-gray-600">
                    {isOpen ? "▾" : "▸"}
                  </span>
                  {race.label}
                </span>
                <span className="flex items-center gap-2">
                  {consensus && <RatingBadge r={consensus} />}
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {n} forecaster{n === 1 ? "" : "s"}
                  </span>
                </span>
              </div>
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-800/30">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                    {FORECASTER_ORDER.filter((k) => race.ratings[k]).map((k) => (
                      <div key={k} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                          {FORECASTER_NAMES[k]}
                        </span>
                        <RatingBadge r={race.ratings[k]} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
        {races.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500">
            No {tab} ratings available.
          </p>
        )}
      </div>
    </div>
  );
}
