import { useCallback, useEffect, useState } from "react";
import { loadStateGeo, type StateGeo } from "~/lib/stateGeo";
import { countyResult } from "~/data/countyResults";
import { formatVotes } from "~/lib/margin";
import { MapTooltip } from "~/components/MapTooltip";
import { EvLegend } from "~/components/EvLegend";
import { StatGrid, type Stat } from "~/components/StatGrid";
import {
  NO_DATA,
  partyFill,
  pctOf,
  shares,
  shortVotes,
  turnoutFill,
  type Metric,
} from "~/lib/earlyVote";

/** One county's 2026 early vote, as scripts/pull-early-vote-counts.mjs writes
 *  it (short keys -- the file covers ~3,700 counties). */
interface CountyEv {
  /** Name as the state reports it. */
  n: string;
  /** Ballots cast (mail returned + in person). */
  v: number;
  /** Mail ballots returned. */
  m: number;
  /** In-person early votes. */
  i: number;
  /** Mail ballots requested. */
  r: number;
  /** [Dem, Rep, other] by party registration, where the state reports it. */
  p: [number, number, number] | null;
}

interface CountyFile {
  generatedAt: string;
  byState: Record<string, Record<string, CountyEv>>;
}

const HISTORY_YEARS = ["2024", "2022", "2020", "2018", "2016"] as const;

/** EAVS history per county and year: [early total | null, mail, in person,
 *  total ballots cast | null] (scripts/build-early-vote-history.mjs). */
type HistoryRow = Partial<Record<(typeof HISTORY_YEARS)[number], [number | null, number, number, number | null]>>;

interface HistoryFile {
  byState: Record<string, Record<string, HistoryRow>>;
}

// Both fetched at runtime like the geometry beside them (public/geo ->
// app/data/geo), so the county rows stay out of the Worker bundle.
function once<T>(url: string) {
  let p: Promise<T | null> | null = null;
  return () =>
    (p ??= fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
      .catch(() => null));
}
const loadCountyFile = once<CountyFile>("/geo/earlyvote-2026-counties.json");
const loadHistoryFile = once<HistoryFile>("/geo/earlyvote-history-counties.json");
/** County party numbers (scripts/pull-party-registration.mjs): registered
 *  voters by party where the state registers by party ("registration"), or
 *  each party's 2026 governor-primary votes where it doesn't ("primary"). */
const loadRegistrationFile = once<{
  byState: Record<
    string,
    {
      asOf: string | null;
      basis?: "registration" | "primary";
      counties: Record<string, [number, number, number]>;
    }
  >;
}>("/geo/party-registration-counties.json");
/** [citizens 18+ (Census CVAP), registered voters (EAVS 2024)] per county,
 *  from scripts/build-electorate.mjs. */
const loadElectorateFile = once<{ byCounty: Record<string, [number | null, number | null]> }>(
  "/geo/electorate-counties.json"
);

/** The county's "% voted" baseline: its 2022 midterm turnout from EAVS (the
 *  same yardstick as the state view), else its 2024 presidential vote. */
type BaseYear = "2022" | "2024";

function baseline(
  fips: string,
  hist: HistoryRow | undefined,
  year: BaseYear = "2022"
): { n: number; label: string } | null {
  // The chosen cycle's total ballots from EAVS; 2024 falls back to the
  // county's presidential vote, and 2022 falls back to 2024.
  const t = hist?.[year]?.[3];
  if (t) return { n: t, label: year };
  if (year === "2022" && hist?.["2024"]?.[3]) return { n: hist["2024"][3]!, label: "2024" };
  const t24 = countyResult("2024-president", fips)?.totalVotes;
  return t24 ? { n: t24, label: "2024" } : null;
}

/**
 * A state's counties shaded by early vote: share of the 2022 electorate that
 * has already voted, or the party-registration lead among those ballots.
 * Self-contained -- none of the prediction map's StateZoom state applies.
 */
export function EarlyVoteCountyMap({
  usps,
  stateName,
  metric,
  onBack,
}: {
  usps: string;
  stateName: string;
  metric: Metric;
  onBack: () => void;
}) {
  const [geo, setGeo] = useState<StateGeo | null>(null);
  const [rows, setRows] = useState<Record<string, CountyEv> | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryRow> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [baseYear, setBaseYear] = useState<BaseYear>("2022");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [electorate, setElectorate] = useState<Record<string, [number | null, number | null]> | null>(null);
  const [registration, setRegistration] = useState<{
    asOf: string | null;
    basis?: "registration" | "primary";
    counties: Record<string, [number, number, number]>;
  } | null>(null);

  useEffect(() => {
    let live = true;
    setLoaded(false);
    Promise.all([
      loadStateGeo(usps),
      loadCountyFile(),
      loadHistoryFile(),
      loadElectorateFile(),
      loadRegistrationFile(),
    ]).then(([g, f, h, e, reg]) => {
      if (!live) return;
      setGeo(g);
      setRows(f?.byState[usps] ?? null);
      setHistory(h?.byState[usps] ?? null);
      setElectorate(e?.byCounty ?? null);
      setRegistration(reg?.byState[usps] ?? null);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [usps]);

  // Window coordinates -- MapTooltip is fixed to the viewport.
  const updatePos = useCallback((e: React.MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  const hasParty = !!rows && Object.values(rows).some((c) => c.p);
  // States with no county party split get turnout shading even on the
  // party view, rather than a gray map.
  const shadeTurnout = metric === "turnout" || !hasParty;

  function fillFor(fips: string): string {
    const c = rows?.[fips];
    if (!c || c.v <= 0) return NO_DATA;
    if (!shadeTurnout) {
      return c.p && c.p[0] + c.p[1] > 0
        ? partyFill({ dem: c.p[0], rep: c.p[1], other: c.p[2] })
        : NO_DATA;
    }
    const base = baseline(fips, history?.[fips], baseYear);
    const pct = base ? pctOf(c.v, base.n) : null;
    return pct == null ? NO_DATA : turnoutFill(pct);
  }
  const hoveredName = hovered ? geo?.counties.find((c) => c.fips === hovered)?.name : null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          &larr; All states
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {stateName} counties
        </span>
        {loaded && rows && shadeTurnout && (
          <div className="ml-auto flex items-center gap-1 text-xs">
            <span className="text-gray-500 dark:text-gray-400">Compare to</span>
            {(["2022", "2024"] as const).map((y) => (
              <button
                key={y}
                onClick={() => setBaseYear(y)}
                title={`Shade counties by early ballots as a share of their ${y} turnout`}
                className={`rounded-full px-2.5 py-0.5 font-medium transition-colors ${
                  baseYear === y
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {!loaded ? (
        <p className="py-16 text-center text-xs text-gray-400">Loading counties&hellip;</p>
      ) : !geo ? (
        <p className="py-16 text-center text-xs text-gray-400">No county map for {stateName}.</p>
      ) : (
        <div className="relative">
          {/* Key matches what's actually drawn: turnout colors whenever the
              counties fall back to turnout shading. */}
          <EvLegend
            metric={shadeTurnout ? "turnout" : "party"}
            title={shadeTurnout ? `% of ${baseYear} turnout cast early` : "Party lead among early ballots"}
          />
          <svg viewBox={geo.viewBox} className="h-auto max-h-[560px] w-full select-none">
            {geo.counties.map((c) => (
              <path
                key={c.fips}
                d={c.d}
                fill={fillFor(c.fips)}
                stroke={hovered === c.fips ? "#000" : "none"}
                strokeWidth={hovered === c.fips ? 1.5 : 0}
                onMouseEnter={() => setHovered(c.fips)}
                onMouseMove={updatePos}
                onMouseLeave={() => setHovered((h) => (h === c.fips ? null : h))}
              />
            ))}
            <path d={geo.bordersD} fill="none" stroke="#ffffff" strokeWidth={0.6} className="pointer-events-none" />
            <path d={geo.outlineD} fill="none" stroke="#000000" strokeWidth={1} className="pointer-events-none" />
          </svg>

          {hovered && (
            <MapTooltip x={pos.x} y={pos.y} className="w-[32rem]">
              <CountyTip
                baseYear={baseYear}
                name={hoveredName ?? hovered}
                fips={hovered}
                row={rows?.[hovered] ?? null}
                hist={history?.[hovered]}
                electorate={electorate?.[hovered] ?? null}
                registration={
                  registration?.counties[hovered]
                    ? {
                        counts: registration.counties[hovered],
                        basis: registration.basis ?? "registration",
                      }
                    : null
                }
              />
            </MapTooltip>
          )}
        </div>
      )}

      {loaded && !rows && (
        <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
          {stateName} doesn&rsquo;t publish county-level 2026 early-vote counts (or reports by
          town, which doesn&rsquo;t line up with counties). Hover a county for its past cycles.
        </p>
      )}
      {loaded && rows && shadeTurnout && (
        <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
          {metric === "party" && <>No county party split for {stateName}, so counties are shaded by turnout. </>}
          County shading is the share of each county&rsquo;s {baseYear} turnout already cast. Past
          cycles are final counts from the EAC&rsquo;s Election Administration and Voting Survey.
        </p>
      )}
    </div>
  );
}

function CountyTip({
  name,
  fips,
  row,
  hist,
  electorate,
  registration,
  baseYear,
}: {
  baseYear: BaseYear;
  name: string;
  fips: string;
  row: CountyEv | null;
  hist: HistoryRow | undefined;
  electorate: [number | null, number | null] | null;
  /** Registered voters by party [dem, rep, other] and as-of date, where the
   *  state publishes it (scripts/pull-party-registration.mjs). */
  registration: { counts: [number, number, number]; basis: "registration" | "primary" } | null;
}) {
  const muted = "text-gray-300 dark:text-gray-600";
  const has2026 = !!row && row.v > 0;
  const base = baseline(fips, hist, baseYear);
  const [eligible, registered] = electorate ?? [null, null];

  // 2026 so far + who could vote.
  const current: Stat[] = [];
  if (has2026)
    current.push({
      label: "Early ballots",
      value: formatVotes(row!.v),
      // Share of registered voters, shown as a bare percent; North Dakota
      // (no voter registration) falls back to eligible voters, labeled.
      sub: registered
        ? `${pctOf(row!.v, registered)!.toFixed(1)}%`
        : eligible
        ? `${pctOf(row!.v, eligible)!.toFixed(1)}% of elig.`
        : undefined,
    });
  if (has2026 && base) current.push({ label: `% of ${base.label}`, value: `${pctOf(row!.v, base.n)!.toFixed(1)}%` });
  if (has2026 && row!.m > 0)
    current.push({
      label: "Mail returned",
      value: shortVotes(row!.m),
      sub: row!.r > 0 ? `${pctOf(row!.m, row!.r)!.toFixed(0)}%` : undefined,
    });
  if (has2026 && row!.i > 0) current.push({ label: "In person", value: shortVotes(row!.i) });
  if (eligible) current.push({ label: "Eligible voters", value: shortVotes(eligible) });
  if (registered) current.push({ label: "Registered", value: shortVotes(registered) });

  // Party of early ballots (registration states).
  const s = row?.p && row.p[0] + row.p[1] > 0 ? shares({ dem: row.p[0], rep: row.p[1], other: row.p[2] }) : null;
  const lead = s ? s.d - s.r : 0;
  const leadCls = lead >= 0 ? "text-blue-300 dark:text-blue-700" : "text-red-300 dark:text-red-700";
  const partyRows: [string, string, string, string?][] =
    row?.p && s
      ? [
          ["Dem", formatVotes(row.p[0]), `${s.d.toFixed(1)}%`],
          ["Rep", formatVotes(row.p[1]), `${s.r.toFixed(1)}%`],
          ["Other", formatVotes(row.p[2]), `${s.o.toFixed(1)}%`],
          ["Lead", "", `${lead >= 0 ? "D" : "R"}+${Math.abs(lead).toFixed(1)}`, leadCls],
        ]
      : [];

  // Registered voters by party, as tiles.
  const reg = registration?.counts;
  const regTotal = reg ? reg[0] + reg[1] + reg[2] : 0;
  // GA and OH have no party registration: their numbers are each party's
  // governor-primary votes, so there's no "other" and the tiles say "primary".
  const isPrimary = registration?.basis === "primary";
  const regItems: Stat[] = reg
    ? (
        [
          [isPrimary ? "Dem primary" : "Dem", reg[0], "text-blue-300 dark:text-blue-700"],
          [isPrimary ? "Rep primary" : "Rep", reg[1], "text-red-300 dark:text-red-700"],
          ...(isPrimary ? [] : [["Other", reg[2], ""] as const]),
        ] as const
      ).map(([label, n, cls]) => ({ label, value: shortVotes(n), sub: `${pctOf(n, regTotal)!.toFixed(1)}%`, cls }))
    : [];

  // Past cycles (EAVS).
  const past: [string, string][] = [];
  for (const y of HISTORY_YEARS) {
    const h = hist?.[y];
    const ev = h?.[0];
    if (!ev) continue;
    const share = h[3] ? ` (${pctOf(ev, h[3])!.toFixed(0)}% of vote)` : "";
    const vs = has2026 ? ` · 2026 at ${pctOf(row!.v, ev)!.toFixed(0)}%` : "";
    past.push([`${y} final`, `${shortVotes(ev)}${share}${vs}`]);
  }

  // With an early-ballot party split: the current numbers sit on top as
  // tiles and the table pairs the split with the past cycles. Without one
  // (incl. GA / OH, whose party numbers are primary-vote tiles): the current
  // numbers become the table's left side, level with the past cycles.
  const hasParty = partyRows.length > 0;
  const left: [string, string, string, string?][] = hasParty
    ? partyRows
    : current.map((c) => [c.label, String(c.value) + (c.sub ? ` (${c.sub})` : ""), ""]);
  const leftHead = hasParty ? "Early ballots by party" : "2026 so far";
  const n = Math.max(left.length, past.length);

  return (
    <div className="space-y-1.5">
      <div className="font-semibold">{name}</div>
      {!has2026 && <div className={muted}>No 2026 early-vote data reported.</div>}
      {hasParty && <StatGrid items={current} />}
      {regItems.length > 0 && <StatGrid items={regItems} />}
      {n > 0 && (
        <table className="w-full border-t border-white/15 tabular-nums dark:border-black/10">
          <thead>
            <tr className={`${muted} text-left`}>
              <th colSpan={3} className="pb-0.5 pt-1 font-normal">{leftHead}</th>
              <th className="w-4" />
              <th colSpan={2} className="pb-0.5 pt-1 font-normal">
                {past.length ? "Early vote in past cycles" : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: n }, (_, i) => {
              const l = left[i];
              const r = past[i];
              return (
                <tr key={i}>
                  <td className={hasParty ? undefined : muted}>{l?.[0]}</td>
                  <td className="text-right">{l?.[1]}</td>
                  <td className={`text-right ${l?.[3] ?? ""}`}>{l?.[2]}</td>
                  <td />
                  <td>{r?.[0]}</td>
                  <td className={`text-right ${muted}`}>{r?.[1]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
