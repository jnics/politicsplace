import { useMemo, useState } from "react";
import { UsMap } from "~/components/UsMap";
import { DonutChart } from "~/components/DonutChart";
import { STATE_PATHS } from "~/data/statePaths";
import { HISTORICAL_COLORS } from "~/lib/shades";
import { formatVotes } from "~/lib/margin";
import { hasStateGeo } from "~/lib/stateGeo";
import { EarlyVoteCountyMap, type BaseYear } from "~/components/EarlyVoteCountyMap";
import { StatGrid, type Stat } from "~/components/StatGrid";
import { EvLegend } from "~/components/EvLegend";
import {
  NO_DATA,
  PARTY_BINS,
  partyFill,
  pctOf,
  shares,
  shortVotes,
  turnoutFill,
  type Metric,
  type PartySplit,
} from "~/lib/earlyVote";
import earlyVoteCounts from "~/data/earlyVoteCounts.generated.json";
import raceRatings from "~/data/raceRatings.generated.json";
import earlyVoteHistory from "~/data/earlyVoteHistory.generated.json";
import electorate from "~/data/electorate.generated.json";

/** Voting-eligible population (UF, 2024), citizens 18+ (Census CVAP) and
 *  registered voters (EAVS 2024) per state, from scripts/build-electorate.mjs. */
const ELECTORATE = electorate as unknown as {
  byState: Record<
    string,
    {
      vep: number | null;
      cvap: number | null;
      registered: number | null;
      /** Registered voters by party (Independent Voter Project); `modeled`
       *  where the state doesn't register by party (L2's estimate). */
      party?: { total: number; dem: number; rep: number; other: number; modeled: boolean };
    }
  >;
};

/** EAVS final early vote (`ev`) and total ballots (`t`) per state and year,
 *  from scripts/build-early-vote-history.mjs. */
const HISTORY = earlyVoteHistory as unknown as {
  byState: Record<string, Partial<Record<"2016" | "2018" | "2020" | "2022" | "2024", { ev: number; t: number }>>>;
};

/** Where a state's party split comes from, best first: reported registration,
 *  past primary voting (Texas), or On Point Polling's model. */
export type PartyBasis = "registration" | "primary" | "modeled";

interface CurrentEv {
  voted: number;
  mailReturned: number | null;
  inPerson: number | null;
  mailRequested: number | null;
  party: PartySplit | null;
  partyBasis: PartyBasis | null;
  partySource?: string;
  /** 2026 so far ÷ the same number of days out in that cycle. */
  sameDay?: { 2022: number | null; 2024: number | null };
  turnout2022: number | null;
  lastUpdate: string | null;
  notes: string | null;
}

const PARTY_LABEL: Record<PartyBasis, string> = {
  registration: "By party registration",
  primary: "By past primary voting",
  modeled: "Modeled party",
};

interface PastEv {
  voted: number | null;
  party?: PartySplit | null;
  turnout2020?: number | null;
  turnout2016?: number | null;
  asOf: string | null;
}

const EV = earlyVoteCounts as unknown as {
  generatedAt: string;
  byState: Record<
    string,
    {
      current: CurrentEv | null;
      past: Record<"2024" | "2022" | "2020" | "2016", PastEv | null>;
    }
  >;
};

interface Rating {
  label: string;
  party: "D" | "R" | null;
}
const RATINGS = raceRatings as unknown as {
  byRace: Record<string, { label: string; ratings: Record<string, Rating> }[]>;
};

/** The quantitative forecast models among the rated sources -- the handicappers
 *  (Cook, Sabato, Inside Elections, ...) live on the Ratings page instead. */
const MODELS: [key: string, name: string][] = [
  ["economist", "Economist"],
  ["silverBulletin", "Silver Bulletin"],
  ["splitTicket", "Split Ticket"],
  ["ddhq", "DDHQ"],
  ["fiftyPlusOne", "FiftyPlusOne"],
];

const STATE_NAMES: Record<string, string> = Object.fromEntries(
  STATE_PATHS.map((s) => [s.id, s.name])
);

function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const [, m, d] = iso.split("-").map(Number);
  return new Date(2000, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const modeledPatternId = (color: string) => `ev-modeled-${color.slice(1)}`;

/** One diagonal-stripe <pattern> per party color, for modeled states. */
function modeledPatternDefs() {
  const colors = PARTY_BINS.flatMap((b) => [b.d, b.r]);
  return colors.map((c) => (
    <pattern
      key={c}
      id={modeledPatternId(c)}
      patternUnits="userSpaceOnUse"
      width="6"
      height="6"
      patternTransform="rotate(45)"
    >
      <rect width="6" height="6" fill={c} />
      <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" />
    </pattern>
  ));
}

/** Ratings for a state's 2026 race of one type (Senate labels can carry a
 *  "(special)" suffix). */
function modelRatings(raceType: "senate" | "governor", stateName: string) {
  const race = RATINGS.byRace[raceType]?.find(
    (r) => r.label === stateName || r.label.startsWith(`${stateName} (`)
  );
  if (!race) return null;
  const rows = MODELS.filter(([k]) => race.ratings[k]).map(([k, name]) => ({
    name,
    rating: race.ratings[k],
  }));
  return rows.length ? rows : null;
}

function ratingText(r: Rating): string {
  return r.party ? `${r.label} ${r.party}` : r.label;
}

/**
 * The map's "2026 Early Vote" tab: each state shaded by how much of its 2022
 * electorate has already voted early (or by the party-registration lead
 * among those ballots), with hover cards comparing against past cycles and
 * listing what the forecast models rate the state's 2026 races. Nothing from
 * the 2026 prediction map (picks, palette, drill-in) applies here.
 */
export function EarlyVoteMap() {
  const [metric, setMetric] = useState<Metric>("turnout");
  // Turnout year the county map compares against (its "Compare to" switch);
  // the sidebar donut follows it while drilled in.
  const [baseYear, setBaseYear] = useState<BaseYear>("2022");
  const [zoomState, setZoomState] = useState<string | null>(null);
  // Reported by the county map once it loads: does this state have a
  // county-level party split? If not, the "Party lead" option is hidden.
  const [countyHasParty, setCountyHasParty] = useState<boolean | null>(null);
  const showPartyOption = !(zoomState && countyHasParty === false);

  const fills = useMemo(() => {
    const out: Record<string, string> = {};
    for (const s of STATE_PATHS) {
      const cur = EV.byState[s.id]?.current;
      if (!cur || cur.voted <= 0) {
        out[s.id] = NO_DATA;
        continue;
      }
      if (metric === "party") {
        const c = cur.party ? partyFill(cur.party) : NO_DATA;
        // Modeled states get a striped fill so they read as estimates.
        out[s.id] = cur.party && cur.partyBasis === "modeled" ? `url(#${modeledPatternId(c)})` : c;
      } else {
        const pct = pctOf(cur.voted, cur.turnout2022);
        out[s.id] = pct == null ? NO_DATA : turnoutFill(pct);
      }
    }
    return out;
  }, [metric]);

  const national = useMemo(() => {
    let voted = 0;
    let mail = 0;
    let inPerson = 0;
    let base2022 = 0;
    let past2024 = 0;
    let reporting = 0;
    const party: PartySplit = { dem: 0, rep: 0, other: 0 };
    let partyStates = 0;
    for (const { current, past } of Object.values(EV.byState)) {
      if (!current || current.voted <= 0) continue;
      reporting += 1;
      voted += current.voted;
      mail += current.mailReturned ?? 0;
      inPerson += current.inPerson ?? 0;
      if (current.turnout2022) base2022 += current.turnout2022;
      if (past["2024"]?.voted) past2024 += past["2024"].voted;
      if (current.party) {
        party.dem += current.party.dem;
        party.rep += current.party.rep;
        party.other += current.party.other;
        partyStates += 1;
      }
    }
    return { voted, mail, inPerson, base2022, past2024, reporting, party, partyStates };
  }, []);

  function tooltip(state: string) {
    const name = STATE_NAMES[state] ?? state;
    const entry = EV.byState[state];
    const cur = entry?.current;
    const senate = modelRatings("senate", name);
    const governor = modelRatings("governor", name);

    return (
      <div className="space-y-1">
        <div className="font-semibold">
          {name}
          {cur?.lastUpdate && (
            <span className="font-normal text-gray-400 dark:text-gray-500">
              {" "}
              &middot; as of {shortDate(cur.lastUpdate)}
            </span>
          )}
        </div>

        {!cur || cur.voted <= 0 ? (
          <div className="text-gray-300 dark:text-gray-600">No early-vote data reported yet.</div>
        ) : (
          <>
            <StateTop state={state} cur={cur} />
            <PartyPastTable
              state={state}
              cur={cur}
              past={entry.past}
              // UF's 2024 split is registration, so only compare like with like.
              past2024Party={
                cur.partyBasis === "registration" ? entry.past["2024"]?.party ?? null : null
              }
            />
          </>
        )}

        {(senate || governor) && (
          <ModelTable senate={senate} governor={governor} />
        )}
      </div>
    );
  }

  // The sidebar follows the map: the whole country, or the drilled-in state.
  const summary = useMemo(() => {
    if (!zoomState) {
      return {
        title: null as string | null,
        party: national.partyStates ? national.party : null,
        partyNote: `D–R, ${national.partyStates} states`,
        voted: national.voted,
        mail: national.mail,
        inPerson: national.inPerson,
        reportingLine: `early ballots in ${national.reporting} states`,
        pct2022: national.base2022 ? pctOf(national.voted, national.base2022) : null,
        pct2024ev: national.past2024 ? pctOf(national.voted, national.past2024) : null,
        their: "their ",
        // The national map only compares to 2022.
        turnoutBase: national.base2022 ? { n: national.base2022, year: "2022" as BaseYear } : null,
      };
    }
    const entry = EV.byState[zoomState];
    const cur = entry?.current;
    const ev24 = HISTORY.byState[zoomState]?.["2024"]?.ev || entry?.past["2024"]?.voted || null;
    const basisNote: Record<PartyBasis, string> = {
      registration: "D–R by registration",
      primary: "D–R by past primaries",
      modeled: "D–R, modeled party",
    };
    return {
      title: STATE_NAMES[zoomState] ?? zoomState,
      party: cur?.voted && cur.party ? cur.party : null,
      partyNote: cur?.partyBasis ? basisNote[cur.partyBasis] : "",
      voted: cur?.voted ?? 0,
      mail: cur?.mailReturned ?? 0,
      inPerson: cur?.inPerson ?? 0,
      reportingLine: cur?.lastUpdate ? `early ballots · as of ${shortDate(cur.lastUpdate)}` : "early ballots",
      pct2022: cur?.voted && cur.turnout2022 ? pctOf(cur.voted, cur.turnout2022) : null,
      pct2024ev: cur?.voted && ev24 ? pctOf(cur.voted, ev24) : null,
      their: "",
      // Follows the county map's "Compare to" switch: 2022 turnout (UF), or
      // 2024 total ballots (EAVS).
      turnoutBase:
        baseYear === "2024"
          ? HISTORY.byState[zoomState]?.["2024"]?.t
            ? { n: HISTORY.byState[zoomState]!["2024"]!.t, year: "2024" as BaseYear }
            : null
          : cur?.turnout2022
          ? { n: cur.turnout2022, year: "2022" as BaseYear }
          : null,
    };
  }, [zoomState, national, baseYear]);
  const summaryShares = summary.party ? shares(summary.party) : null;
  // The donut matches what the map is coloring: turnout when the map shades
  // by turnout (incl. a county map with no party split), party otherwise --
  // falling back to turnout when there's no party split to show.
  const mapShowsTurnout = metric === "turnout" || (!!zoomState && countyHasParty === false);
  const donutMode: "turnout" | "party" | null =
    (mapShowsTurnout || !summaryShares) && summary.turnoutBase && summary.voted > 0
      ? "turnout"
      : summaryShares
      ? "party"
      : null;

  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            ["turnout", "% of 2022 electorate voted"],
            ["party", "Party lead"],
          ] as const
        )
          .filter(([m]) => m !== "party" || showPartyOption)
          .map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              // With "Party lead" hidden, the county map is shading by
              // turnout, so that's the option shown as selected.
              metric === m || (!showPartyOption && m === "turnout")
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-0">
        <div className="min-w-0 flex-1">
          {zoomState ? (
            <EarlyVoteCountyMap
              usps={zoomState}
              stateName={STATE_NAMES[zoomState] ?? zoomState}
              metric={metric}
              onBack={() => {
                setZoomState(null);
                setCountyHasParty(null);
              }}
              onPartyAvailability={setCountyHasParty}
              baseYear={baseYear}
              onBaseYearChange={setBaseYear}
            />
          ) : (
            <>
              <EvLegend
                metric={metric}
                title={metric === "turnout" ? "% of 2022 turnout cast early" : "Party lead among early ballots"}
              />
              <UsMap
                fills={fills}
                tooltip={tooltip}
                tooltipWidth="w-[36rem]"
                defs={modeledPatternDefs()}
                onStateSelect={(id) => {
                  if (hasStateGeo(id)) setZoomState(id);
                }}
              />
              <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
                Click a state for its counties.
              </p>
            </>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-col items-center gap-3 lg:w-[168px]">
          {summary.title && (
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{summary.title}</div>
          )}
          {donutMode === "turnout" && summary.turnoutBase ? (
            (() => {
              const { n: base, year } = summary.turnoutBase;
              const pct = pctOf(summary.voted, base)!;
              // Early ballots split by how they were cast. Some states only
              // report a total (or only one kind), so whatever the split
              // doesn't cover gets its own "not split" slice.
              const mail = Math.min(summary.mail, summary.voted);
              const inPerson = Math.min(summary.inPerson, summary.voted - mail);
              const notSplit = summary.voted - mail - inPerson;
              return (
                <DonutChart
                  segments={[
                    { label: "Mail returned", value: mail, color: "#0891b2" },
                    { label: "In person", value: inPerson, color: "#22d3ee" },
                    ...(notSplit > 0
                      ? [{ label: "Early (not split)", value: notSplit, color: "#a5f3fc" }]
                      : []),
                    { label: `Rest of ${year} turnout`, value: Math.max(0, base - summary.voted), color: NO_DATA },
                  ]}
                  centerPrimary={`${pct.toFixed(1)}%`}
                  centerSecondary={`of ${year} turnout`}
                  size={158}
                  thickness={20}
                />
              );
            })()
          ) : donutMode === "party" && summary.party && summaryShares ? (
            <DonutChart
              segments={[
                { label: "Republican", value: summary.party.rep, color: HISTORICAL_COLORS.R },
                { label: "Other / none", value: summary.party.other, color: "#9ca3af" },
                { label: "Democratic", value: summary.party.dem, color: HISTORICAL_COLORS.D },
              ]}
              centerPrimary={`${summaryShares.d.toFixed(0)}–${summaryShares.r.toFixed(0)}`}
              centerSecondary={summary.partyNote}
              centerBar={[
                { label: "D", value: summary.party.dem, color: HISTORICAL_COLORS.D },
                { label: "R", value: summary.party.rep, color: HISTORICAL_COLORS.R },
              ]}
              size={158}
              thickness={20}
            />
          ) : summary.title ? (
            <div className="text-center text-xs text-gray-400 dark:text-gray-500">No early-vote data yet</div>
          ) : null}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            <div className="text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {shortVotes(summary.voted)}
            </div>
            {summary.reportingLine}
            {summary.pct2022 != null && (
              <div className="mt-1">
                {summary.pct2022.toFixed(1)}% of {summary.their}2022 turnout
              </div>
            )}
            {summary.pct2024ev != null && (
              <div className="mt-1">
                {summary.pct2024ev.toFixed(0)}% of {summary.their}2024 early vote
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
        <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Worth knowing
        </h3>
        <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          <li>
            Counts are mail ballots returned plus in-person early votes, from the University of
            Florida Election Lab (updated {new Date(EV.generatedAt).toLocaleDateString()}).
            Past-cycle numbers are each cycle&rsquo;s final pre-Election-Day totals, so 2026 is
            still climbing toward them.
          </li>
          <li>
            Party splits come from the best source each state has: voter{" "}
            <em>registration</em> where a state registers by party; Texas by which party&rsquo;s
            primaries a voter has cast (theoelections.com); everywhere else On Point
            Polling&rsquo;s modeled party, drawn striped on the map. None of these is vote
            choice. Gray means no party data at all.
          </li>
          <li>
            &ldquo;Same point&rdquo; compares 2026 so far against 2022 and 2024 at the same
            number of days before Election Day (On Point Politics); the 2022 final totals are
            also theirs, and a few are rounded.
          </li>
          <li>
            2024 and 2020 were presidential years with far more early voting, so the 2022
            midterm total turnout is the fairer yardstick for &ldquo;% voted.&rdquo;
          </li>
          <li>
            &ldquo;What the models say&rdquo; lists the quantitative forecasts (Economist, Silver
            Bulletin, Split Ticket, DDHQ, FiftyPlusOne) for the state&rsquo;s 2026 Senate and
            governor races; the full handicapper list is on the Ratings page.
          </li>
        </ul>
      </div>
    </div>
  );
}

const MUTED = "text-gray-300 dark:text-gray-600";
const leadClass = (lead: number) =>
  lead >= 0 ? "text-blue-300 dark:text-blue-700" : "text-red-300 dark:text-red-700";

/**
 * The state card's top block: 2026 so far and who could vote, as tiles that
 * fill the card's width, plus registered voters by party when known.
 */
function StateTop({ state, cur }: { state: string; cur: CurrentEv }) {
  const e = ELECTORATE.byState[state];
  const eligible = e?.vep ?? e?.cvap ?? null;
  const items: Stat[] = [
    {
      label: "Early ballots",
      value: formatVotes(cur.voted),
      // Share of registered voters, shown as a bare percent. North Dakota has
      // no voter registration, so it gets the share of eligible voters,
      // labeled because it's a different yardstick.
      sub: e?.registered
        ? `${pctOf(cur.voted, e.registered)!.toFixed(1)}%`
        : eligible
        ? `${pctOf(cur.voted, eligible)!.toFixed(1)}% of elig.`
        : undefined,
    },
  ];
  if (cur.turnout2022) items.push({ label: "% of 2022", value: `${pctOf(cur.voted, cur.turnout2022)!.toFixed(1)}%` });
  if (cur.mailReturned != null)
    items.push({
      label: "Mail returned",
      value: shortVotes(cur.mailReturned),
      sub: cur.mailRequested ? `${pctOf(cur.mailReturned, cur.mailRequested)!.toFixed(0)}%` : undefined,
    });
  if (cur.inPerson != null) items.push({ label: "In person", value: shortVotes(cur.inPerson) });
  if (eligible) items.push({ label: "Eligible voters", value: shortVotes(eligible) });
  if (e?.registered) items.push({ label: "Registered", value: shortVotes(e.registered) });

  // Official registration only. L2's modeled split for the 18 states without
  // party registration runs 10-15 points more Democratic than the 2024 vote
  // in MI, TX, GA, IL and VA (checked 2026-10-24), so it isn't shown; it
  // stays in the data file for reference.
  const p = e?.party && !e.party.modeled ? e.party : undefined;
  const partyItems: Stat[] = p
    ? (
        [
          ["Dem", p.dem, "text-blue-300 dark:text-blue-700"],
          ["Rep", p.rep, "text-red-300 dark:text-red-700"],
          ["Other", p.other, ""],
        ] as const
      ).map(([label, n, cls]) => ({
        label,
        value: shortVotes(n),
        sub: `${pctOf(n, p.total)!.toFixed(1)}%`,
        cls,
      }))
    : [];

  return (
    <div className="space-y-1.5">
      <StatGrid items={items} />
      {partyItems.length > 0 && <StatGrid items={partyItems} />}
    </div>
  );
}

/**
 * Party split (left) and early vote in past cycles (right) as ONE table, so
 * each party row sits level with a past-cycle row instead of two columns
 * drifting apart. The shorter side is padded with empty cells.
 */
function PartyPastTable({
  state,
  cur,
  past,
  past2024Party,
}: {
  state: string;
  cur: CurrentEv;
  past: Record<"2024" | "2022" | "2020" | "2016", PastEv | null>;
  past2024Party: PartySplit | null;
}) {
  const party = cur.party;
  const s = party ? shares(party) : null;
  const p = past2024Party ? shares(past2024Party) : null;
  const lead = s ? s.d - s.r : 0;
  const pastLead = p ? p.d - p.r : null;
  const fmtLead = (l: number) => `${l >= 0 ? "D" : "R"}+${Math.abs(l).toFixed(1)}`;
  const left: { label: string; votes?: number; pct: string; past?: string; cls?: string; pastCls?: string }[] =
    party && s
      ? [
          { label: "Dem", votes: party.dem, pct: `${s.d.toFixed(1)}%`, past: p?.d.toFixed(1) },
          { label: "Rep", votes: party.rep, pct: `${s.r.toFixed(1)}%`, past: p?.r.toFixed(1) },
          { label: "Other", votes: party.other, pct: `${s.o.toFixed(1)}%`, past: p?.o.toFixed(1) },
          {
            label: "Lead",
            pct: fmtLead(lead),
            cls: leadClass(lead),
            past: pastLead != null ? fmtLead(pastLead) : undefined,
            pastCls: pastLead != null ? leadClass(pastLead) : undefined,
          },
        ]
      : [];

  const right: [label: string, value: string][] = [];
  const sd = cur.sameDay;
  // 2026 so far as a share of that cycle at the same number of days out.
  if (sd?.[2022]) right.push(["vs same day '22", `${(sd[2022] * 100).toFixed(0)}%`]);
  if (sd?.[2024]) right.push(["vs same day '24", `${(sd[2024] * 100).toFixed(0)}%`]);
  // Finals: EAVS (the federal survey, every cycle, same definition) first;
  // the UF / On Point / US Elections Project numbers only where EAVS has none.
  const eavs = HISTORY.byState[state];
  for (const y of ["2024", "2022", "2020", "2018", "2016"] as const) {
    const v = eavs?.[y]?.ev || (y !== "2018" ? past[y]?.voted : null);
    if (v) right.push([`${y} final`, `${shortVotes(v)} · 2026 at ${pctOf(cur.voted, v)!.toFixed(0)}%`]);
  }

  const partyHead = cur.partyBasis
    ? `${PARTY_LABEL[cur.partyBasis]}${cur.partySource ? ` (${cur.partySource})` : ""}`
    : "No party data";
  const partyCols = p ? 4 : 3;
  const n = Math.max(left.length, right.length);

  return (
    <table className="w-full border-t border-white/15 tabular-nums dark:border-black/10">
      <thead>
        <tr className={`${MUTED} text-left`}>
          <th colSpan={partyCols} className="pb-0.5 pt-1 font-normal">
            {partyHead}
            {p && <span className="float-right">2024</span>}
          </th>
          <th className="w-4" />
          <th colSpan={2} className="pb-0.5 pt-1 font-normal">Early vote in past cycles</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: n }, (_, i) => {
          const l = left[i];
          const r = right[i];
          return (
            <tr key={i}>
              <td>{l?.label}</td>
              <td className="text-right">{l?.votes != null ? formatVotes(l.votes) : ""}</td>
              <td className={`text-right ${l?.cls ?? ""}`}>{l?.pct}</td>
              {p && <td className={`text-right ${l?.pastCls ?? MUTED}`}>{l?.past}</td>}
              <td />
              <td>{r?.[0]}</td>
              <td className={`text-right ${MUTED}`}>{r?.[1]}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}


/** Forecast models as a grid -- one row per model, Senate / Governor columns. */
function ModelTable({
  senate,
  governor,
}: {
  senate: { name: string; rating: Rating }[] | null;
  governor: { name: string; rating: Rating }[] | null;
}) {
  const names = MODELS.map(([, n]) => n).filter(
    (n) => senate?.some((r) => r.name === n) || governor?.some((r) => r.name === n)
  );
  const cell = (rows: typeof senate, name: string) => {
    const r = rows?.find((x) => x.name === name)?.rating;
    if (!r) return <td className={`text-right ${MUTED}`}>&ndash;</td>;
    return (
      <td className={`text-right ${r.party ? leadClass(r.party === "D" ? 1 : -1) : MUTED}`}>
        {ratingText(r)}
      </td>
    );
  };
  return (
    <div className="border-t border-white/15 pt-1 dark:border-black/10">
      <div className={MUTED}>What the models say</div>
      <table className="w-full">
        <thead>
          <tr className={MUTED}>
            <th className="text-left font-normal" />
            {senate && <th className="text-right font-normal">Senate</th>}
            {governor && <th className="text-right font-normal">Governor</th>}
          </tr>
        </thead>
        <tbody>
          {names.map((n) => (
            <tr key={n}>
              <td>{n}</td>
              {senate && cell(senate, n)}
              {governor && cell(governor, n)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

