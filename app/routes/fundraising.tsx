import type { Route } from "./+types/fundraising";
import { Fragment, useEffect, useMemo, useState } from "react";
import fundraising from "~/data/fundraising.generated.json";
import donorLocations from "~/data/donorLocations.generated.json";
import spending from "~/data/spending.generated.json";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PoliticsPlace — Fundraising" },
    {
      name: "description",
      content:
        "2026 federal campaign fundraising totals (Senate + House), from the FEC.",
    },
  ];
}

interface CandidateEntry {
  raceKey: string;
  raceTitle: string;
  raceType: "senate" | "house";
  state: string;
  district: number | null;
  name: string;
  party: "D" | "R" | "I" | "O";
  candidateId: string;
  committeeId: string;
  receipts: number;
  disbursements: number;
  cashOnHand: number;
  individualContributions: number;
  coverageEnd: string | null;
}

const DATA = fundraising as {
  generatedAt: string;
  candidates: Record<string, CandidateEntry>;
};

interface DonorByState {
  state: string;
  stateFull: string;
  total: number;
  count: number | null;
}

const DONORS = donorLocations as {
  byCandidate: Record<string, { byState: DonorByState[] }>;
};

interface DonorDetail {
  name: string;
  entity: string | null;
  employer: string | null;
  occupation: string | null;
  amount: number;
  date: string;
}

interface SpendPurpose {
  purpose: string;
  total: number;
  count: number | null;
}
interface SpendRecipient {
  name: string;
  total: number;
  count: number | null;
}

const SPENDING = spending as {
  byCandidate: Record<string, { byPurpose: SpendPurpose[]; topRecipients: SpendRecipient[] }>;
};

const PARTY_TEXT: Record<string, string> = {
  D: "text-blue-600 dark:text-blue-400",
  R: "text-red-600 dark:text-red-400",
  I: "text-purple-600 dark:text-purple-400",
  O: "text-gray-500 dark:text-gray-400",
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

interface Race {
  key: string;
  title: string;
  raceType: "senate" | "house";
  state: string;
  district: number | null;
  candidates: CandidateEntry[];
}

export default function Fundraising() {
  const races = useMemo(() => {
    const byRace = new Map<string, Race>();
    for (const c of Object.values(DATA.candidates)) {
      let race = byRace.get(c.raceKey);
      if (!race) {
        race = {
          key: c.raceKey,
          title: c.raceTitle,
          raceType: c.raceType,
          state: c.state,
          district: c.district,
          candidates: [],
        };
        byRace.set(c.raceKey, race);
      }
      race.candidates.push(c);
    }
    for (const race of byRace.values()) {
      race.candidates.sort((a, b) => b.receipts - a.receipts);
    }
    return [...byRace.values()].sort((a, b) => {
      if (a.raceType !== b.raceType) return a.raceType === "senate" ? -1 : 1;
      // By title ("Alabama …", "Alaska …") so states read A–Z by name, not by
      // postal code; numeric so the 2nd District sorts before the 10th.
      return a.title.localeCompare(b.title, undefined, { numeric: true });
    });
  }, []);

  const [tab, setTab] = useState<"senate" | "house">("senate");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [view, setView] = useState<Record<string, "donors" | "spending">>({});
  const shown = races.filter((r) => r.raceType === tab);

  function toggle(candidateId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          Fundraising
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          2026 federal campaign finance totals, straight from the FEC. Senate
          and House only — the FEC doesn&rsquo;t cover Governor or state
          races, so those aren&rsquo;t here.
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Updated {new Date(DATA.generatedAt).toLocaleDateString()}. Figures
          are each candidate&rsquo;s principal committee, cycle-to-date.
        </p>
      </header>

      <div className="mb-4 flex gap-2">
        {(["senate", "house"] as const).map((t) => (
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

      <div className="space-y-3">
        {shown.map((race) => (
          <div
            key={race.key}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {race.title}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 dark:text-gray-500">
                    <th className="pb-1 font-medium">Candidate</th>
                    <th className="pb-1 text-right font-medium">Raised</th>
                    <th className="pb-1 text-right font-medium">Spent</th>
                    <th className="pb-1 text-right font-medium">Cash on hand</th>
                  </tr>
                </thead>
                <tbody>
                  {race.candidates.map((c) => {
                    const isOpen = expanded.has(c.candidateId);
                    const byState = DONORS.byCandidate[c.candidateId]?.byState ?? [];
                    const candidateView = view[c.candidateId] ?? "donors";
                    return (
                      <Fragment key={c.candidateId}>
                        <tr
                          onClick={() => toggle(c.candidateId)}
                          className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                        >
                          <td className={`py-1.5 font-medium ${PARTY_TEXT[c.party]}`}>
                            <span className="mr-1 inline-block w-3 text-gray-300 dark:text-gray-600">
                              {isOpen ? "▾" : "▸"}
                            </span>
                            {c.name}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">{money.format(c.receipts)}</td>
                          <td className="py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400">
                            {money.format(c.disbursements)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">{money.format(c.cashOnHand)}</td>
                        </tr>
                        {isOpen && (
                          <tr className="border-t border-gray-100 dark:border-gray-800">
                            <td colSpan={4} className="bg-gray-50 px-2 py-2 dark:bg-gray-800/30">
                              <div className="mb-2 flex items-center gap-1">
                                {(["donors", "spending"] as const).map((v) => (
                                  <button
                                    key={v}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setView((prev) => ({ ...prev, [c.candidateId]: v }));
                                    }}
                                    className={`rounded px-2 py-0.5 text-xs font-medium capitalize transition-colors ${
                                      candidateView === v
                                        ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                                        : "text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                                    }`}
                                  >
                                    {v === "donors" ? "Who gave" : "Where it went"}
                                  </button>
                                ))}
                                {/* The principal committee's filings tab on fec.gov
                                    lists every report behind these totals. */}
                                <a
                                  href={`https://www.fec.gov/data/committee/${c.committeeId}/?tab=filings`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="ml-auto text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                                >
                                  All FEC filings ↗
                                </a>
                              </div>
                              {candidateView === "donors" ? (
                                <DonorBreakdown candidateId={c.candidateId} byState={byState} />
                              ) : (
                                <SpendingBreakdown candidateId={c.candidateId} />
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No {tab} fundraising data yet.
          </p>
        )}
      </div>
    </div>
  );
}

const moneyFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Donor contributions grouped by state (FEC's own schedule_a/by_state
 *  aggregate — not something summed client-side), shown as a small ranked
 *  bar list under a clicked candidate. Clicking a state drills one level
 *  further into the top named donors (individuals and PACs/committees)
 *  FEC has on file for that state — see pull-donor-details.mjs. Only the
 *  top 5 states have that detail pulled, so states beyond that show the
 *  aggregate total with no further drill-in. */
function DonorBreakdown({
  candidateId,
  byState,
}: {
  candidateId: string;
  byState: DonorByState[];
}) {
  const [openState, setOpenState] = useState<string | null>(null);
  const [detailsForCandidate, setDetailsForCandidate] = useState<
    Record<string, DonorDetail[]>
  >({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/fundraising/donor-details/${candidateId}`)
      .then((r) => r.json() as Promise<Record<string, DonorDetail[]>>)
      .then((data) => {
        if (!cancelled) setDetailsForCandidate(data);
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  if (byState.length === 0) {
    return (
      <p className="px-2 py-1 text-xs text-gray-400 dark:text-gray-500">
        No itemized donor-location data available for this candidate yet.
      </p>
    );
  }
  const top = byState.slice(0, 12);
  const max = top[0].total;

  return (
    <div className="px-2 py-1">
      <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        Individual contributions by donor state — click a state for named donors
      </p>
      <div className="space-y-1">
        {top.map((s) => {
          const hasDetail = s.state in detailsForCandidate;
          const isOpen = openState === s.state;
          return (
            <div key={s.state}>
              <div
                onClick={() => hasDetail && setOpenState(isOpen ? null : s.state)}
                className={`flex items-center gap-2 text-xs ${hasDetail ? "cursor-pointer" : ""}`}
              >
                <span className="w-8 shrink-0 font-medium text-gray-600 dark:text-gray-300">
                  {hasDetail && (isOpen ? "▾ " : "▸ ")}
                  {s.state}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-gray-500 dark:bg-gray-400"
                    style={{ width: `${(s.total / max) * 100}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right tabular-nums text-gray-500 dark:text-gray-400">
                  {money.format(s.total)}
                </span>
                {s.count != null && (
                  <span className="w-16 shrink-0 text-right tabular-nums text-gray-400 dark:text-gray-500">
                    {s.count.toLocaleString()} gifts
                  </span>
                )}
              </div>
              {isOpen && (
                <DonorDetailList donors={detailsForCandidate[s.state] ?? []} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Where a candidate's money went — FEC's schedule_b/by_purpose category
 *  breakdown (a bar per category) plus the top 20 vendors/consultants
 *  actually paid (schedule_b/by_recipient, sorted, capped) — see
 *  pull-spending.mjs. Same "aggregate, not raw itemized records" reasoning
 *  as the donor side. */
function SpendingBreakdown({ candidateId }: { candidateId: string }) {
  const data = SPENDING.byCandidate[candidateId];
  if (!data || (data.byPurpose.length === 0 && data.topRecipients.length === 0)) {
    return (
      <p className="px-2 py-1 text-xs text-gray-400 dark:text-gray-500">
        No spending data available for this candidate yet.
      </p>
    );
  }
  const maxPurpose = data.byPurpose[0]?.total ?? 0;

  return (
    <div className="px-2 py-1">
      {data.byPurpose.length > 0 && (
        <>
          <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            Spending by category
          </p>
          <div className="mb-3 space-y-1">
            {data.byPurpose.map((p) => (
              <div key={p.purpose} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 truncate font-medium capitalize text-gray-600 dark:text-gray-300">
                  {p.purpose.toLowerCase()}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-gray-500 dark:bg-gray-400"
                    style={{ width: `${(p.total / maxPurpose) * 100}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right tabular-nums text-gray-500 dark:text-gray-400">
                  {money.format(p.total)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {data.topRecipients.length > 0 && (
        <>
          <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            Top vendors paid
          </p>
          <div className="space-y-0.5 border-l border-gray-200 pl-2 dark:border-gray-700">
            {data.topRecipients.map((r, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="truncate text-gray-700 dark:text-gray-300">{r.name}</span>
                <span className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
                  {moneyFull.format(r.total)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Top named donors (individuals and PACs/committees) for one candidate in
 *  one state — the top 20 largest itemized contributions FEC has on file,
 *  not an exhaustive list (see pull-donor-details.mjs for why). */
function DonorDetailList({ donors }: { donors: DonorDetail[] }) {
  if (donors.length === 0) {
    return (
      <p className="ml-10 mt-1 text-xs text-gray-400 dark:text-gray-500">
        No itemized donors on file for this state.
      </p>
    );
  }
  return (
    <div className="ml-10 mt-1 mb-2 space-y-0.5 border-l border-gray-200 pl-2 dark:border-gray-700">
      {donors.map((d, i) => (
        <div key={i} className="flex items-baseline justify-between gap-2 text-[11px]">
          <span className="truncate text-gray-700 dark:text-gray-300">
            {d.name}
            {d.entity && d.entity !== "INDIVIDUAL" && (
              <span className="ml-1 text-gray-400 dark:text-gray-500">({d.entity})</span>
            )}
            {(d.employer || d.occupation) && (
              <span className="ml-1 text-gray-400 dark:text-gray-500">
                — {[d.occupation, d.employer].filter(Boolean).join(", ")}
              </span>
            )}
          </span>
          <span className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
            {moneyFull.format(d.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
