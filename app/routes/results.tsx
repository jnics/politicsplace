import type { Route } from "./+types/results";
import { cloudflareContext } from "~/lib/context.server";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useFetchers, useRevalidator, data } from "react-router";
import {
  OH7_CANDIDATES,
  OH7_TITLE,
  OH7_TOWNS,
  OH7_PLACE_COUNT,
  type Oh7PollingPlace,
  type Oh7Town,
  type PartyCode,
} from "~/data/oh7";
import {
  MEDINA_PRECINCT_COUNT,
  MEDINA_RACES,
  MEDINA_RACE_GROUPS,
  racesForPrecincts,
  type CountyRace,
  type RaceParty,
} from "~/data/medinaRaces";
import {
  changeOh7,
  readOh7,
  readOh7Log,
  type Oh7Change,
  type Oh7LogEntry,
} from "~/lib/oh7.server";
import { editorFromRequest, tryLogin } from "~/lib/auth.server";
import { LoginForm } from "~/components/LoginForm";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PoliticsPlace — OH-7 / Medina Election Night" },
    {
      name: "description",
      content:
        "Polling-place election-night tally for Ohio's 7th Congressional District (Poindexter vs. Miller), plus every Medina County race.",
    },
  ];
}

const PLACE_IDS = new Set(
  OH7_TOWNS.flatMap((t) => t.pollingPlaces.map((p) => p.id))
);
const RACES_BY_ID = new Map(MEDINA_RACES.map((r) => [r.id, r]));

/** How often an open page pulls everyone's latest counts and history. */
const REFRESH_MS = 10_000;

/** Ceiling for any one vote field — far above a real count, stops a typo. */
const MAX_VOTES = 10_000_000;

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.get(cloudflareContext).env.DB;
  const [store, log] = await Promise.all([
    readOh7(db),
    // A missing oh7_log table (schema.sql not applied yet) shouldn't take the page down.
    readOh7Log(db).catch(() => [] as Oh7LogEntry[]),
  ]);
  return {
    results: store.results,
    races: store.races,
    placeRaces: store.placeRaces,
    updatedAt: store.updatedAt,
    log,
    editor: editorFromRequest(request),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();

  const login = await tryLogin(request, context.get(cloudflareContext).env.DB, form);
  if (login) return login;

  const editor = editorFromRequest(request);
  if (!editor) {
    return data({ error: "Sign in first." }, { status: 401 });
  }

  // One change to one field per submit: which row, which field, and either
  // an amount to add or a reset/flag to set.
  const raceId = form.get("raceId");
  const race = raceId != null ? RACES_BY_ID.get(String(raceId)) : undefined;
  const placeId = String(form.get("placeId") ?? "");
  // Both ids = that race's count at that one polling place, which must be a
  // place whose ballot carries the race.
  const atPlace = raceId != null && form.has("placeId");
  const onBallot =
    atPlace &&
    !!race &&
    racesForPrecincts(RACE_PLACES.get(placeId)?.precincts ?? []).includes(race) &&
    RACE_PLACES.has(placeId);
  if (atPlace ? !onBallot : raceId != null ? !race : !PLACE_IDS.has(placeId)) {
    return data({ error: "Unknown race or polling place." }, { status: 400 });
  }
  const keys = (race ? race.candidates : OH7_CANDIDATES).map((c) => c.key);

  const field = String(form.get("field") ?? "");
  let path: string;
  let max = MAX_VOTES;
  if (atPlace && !field.startsWith("v:")) {
    return data({ error: "Unknown field." }, { status: 400 });
  } else if (field === "final") path = "$.final";
  else if (field === "reporting" && race) {
    path = "$.reporting";
    max = MEDINA_PRECINCT_COUNT;
  } else if (field.startsWith("v:") && keys.includes(field.slice(2))) {
    path = `$.votes.${field.slice(2)}`;
  } else {
    return data({ error: "Unknown field." }, { status: 400 });
  }

  let change: Oh7Change;
  const op = form.get("op");
  if (field === "final") {
    change = { op: "set", value: form.get("value") === "1" };
  } else if (op === "reset") {
    change = { op: "set", value: 0 };
  } else if (op === "set") {
    const amount = Math.round(Number(form.get("amount")));
    if (!Number.isFinite(amount) || amount < 0) {
      return data({ error: "Not a count." }, { status: 400 });
    }
    change = { op: "set", value: Math.min(max, amount) };
  } else {
    const amount = Math.round(Number(form.get("amount")));
    if (op !== "add" || !Number.isFinite(amount) || amount === 0) {
      return data({ error: "Nothing to add." }, { status: 400 });
    }
    change = { op: "add", amount, max };
  }

  await changeOh7(
    context.get(cloudflareContext).env.DB,
    editor,
    atPlace ? "placeRace" : race ? "race" : "place",
    atPlace ? prKey(placeId, race!.id) : race ? race.id : placeId,
    path,
    change
  );
  return data({ ok: true });
}

const PARTY_TEXT: Record<PartyCode, string> = {
  D: "text-blue-600 dark:text-blue-400",
  R: "text-red-600 dark:text-red-400",
  O: "text-gray-500 dark:text-gray-400",
};

interface Row {
  votes: Record<string, number>;
  final: boolean;
}

const emptyRow = (): Row => ({
  votes: Object.fromEntries(OH7_CANDIDATES.map((c) => [c.key, 0])),
  final: false,
});
const rowTotal = (r: Row) =>
  Object.values(r.votes).reduce((s, n) => s + (n || 0), 0);
const fmt = (n: number) => n.toLocaleString();

const [D_KEY, R_KEY, O_KEY] = OH7_CANDIDATES.map((c) => c.key);

/** Margin in percentage points of all votes cast, e.g. "4.2%". */
function marginPct(lead: number, trail: number, total: number): string {
  return `${total ? (((lead - trail) / total) * 100).toFixed(1) : "0.0"}%`;
}

/** Leader's margin, e.g. "+4.2%"; callers color it by the leading party. */
function leadLabel(v: Record<string, number>): string {
  const d = v[D_KEY] || 0;
  const r = v[R_KEY] || 0;
  if (d === r) return "Tied";
  const total = Object.values(v).reduce((s, n) => s + (n || 0), 0);
  return `+${marginPct(Math.max(d, r), Math.min(d, r), total)}`;
}

function tallyOf(
  places: { id: string }[],
  rows: Record<string, Row>
): { v: Record<string, number>; reporting: number; done: number } {
  const v = Object.fromEntries(OH7_CANDIDATES.map((c) => [c.key, 0])) as Record<
    string,
    number
  >;
  let reporting = 0;
  let done = 0;
  for (const p of places) {
    const r = rows[p.id];
    if (!r) continue;
    if (rowTotal(r) > 0 || r.final) reporting += 1;
    if (r.final) done += 1;
    for (const c of OH7_CANDIDATES) v[c.key] += r.votes[c.key] || 0;
  }
  return { v, reporting, done };
}

/** Towns grouped under their county, counties A–Z. */
const COUNTIES: { county: string; towns: Oh7Town[] }[] = [];
for (const t of OH7_TOWNS) {
  const c = COUNTIES.find((x) => x.county === t.county);
  if (c) c.towns.push(t);
  else COUNTIES.push({ county: t.county, towns: [t] });
}
COUNTIES.sort((a, b) => a.county.localeCompare(b.county));

/** The county whose full ballot (MEDINA_RACE_GROUPS) is tracked. */
const RACES_COUNTY = "Medina";

/** That county's polling places — the only ones that carry its other races. */
const RACE_PLACES = new Map(
  OH7_TOWNS.filter((t) => t.county === RACES_COUNTY).flatMap((t) =>
    t.pollingPlaces.map((p) => [p.id, p] as const)
  )
);

/** Store id for one race's count at one polling place. */
const prKey = (placeId: string, raceId: string) => `${placeId}|${raceId}`;

type VoteMap = Record<string, number>;

/** Race-at-polling-place counts, shared by the race cards (which sum them)
 *  and the polling-place rows (which enter them). */
const PlaceRaceCtx = createContext<{
  votes: Record<string, VoteMap>;
  set: (id: string, next: VoteMap) => void;
}>({ votes: {}, set: () => {} });

interface RaceRow {
  votes: Record<string, number>;
  reporting: number;
  final: boolean;
}

const emptyRaceRow = (): RaceRow => ({ votes: {}, reporting: 0, final: false });

/** One edit to one field of a row — what a submit sends to the action. */
type FieldEdit =
  | { field: string; op: "set"; amount: number }
  | { field: string; op: "add"; amount: number }
  | { field: string; op: "reset" }
  | { field: "final"; value: boolean };

/** What a count box reports: a new total, an amount to add, or a reset. */
type Entry =
  | { op: "set"; amount: number }
  | { op: "add"; amount: number }
  | { op: "reset" };

/** How a typed number is read: as the field's new total, or added to it. */
type EntryMode = "set" | "add";
const EntryModeCtx = createContext<EntryMode>("set");

function editForm(target: "placeId" | "raceId", id: string, e: FieldEdit): FormData {
  const fd = new FormData();
  fd.set(target, id);
  fd.set("field", e.field);
  if ("value" in e) fd.set("value", e.value ? "1" : "0");
  else {
    fd.set("op", e.op);
    if (e.op !== "reset") fd.set("amount", String(e.amount));
  }
  return fd;
}

/** A vote field's next value after an edit (mirrors the server's clamping). */
const applied = (current: number, e: FieldEdit, max: number) => {
  if (!("op" in e) || e.op === "reset") return 0;
  const next = e.op === "add" ? current + e.amount : e.amount;
  return Math.min(max, Math.max(0, next));
};

/** Last name for the headline: "Amy Acton / David Pepper" → "Acton". */
const shortName = (c: { key: string; name: string }) =>
  c.key === "other" ? "Other" : c.name.split(" / ")[0].split(" ").pop()!;

const toRows = (results: Record<string, { votes: Record<string, number>; final?: boolean }>) => {
  const m: Record<string, Row> = {};
  for (const [id, r] of Object.entries(results)) {
    m[id] = { votes: { ...emptyRow().votes, ...r.votes }, final: !!r.final };
  }
  return m;
};
const toRaceRows = (
  races: Record<string, { votes: Record<string, number>; reporting?: number; final?: boolean }>
) => {
  const m: Record<string, RaceRow> = {};
  for (const [id, r] of Object.entries(races)) {
    m[id] = { votes: { ...r.votes }, reporting: r.reporting || 0, final: !!r.final };
  }
  return m;
};

const RACE_TEXT: Record<RaceParty, string> = {
  D: PARTY_TEXT.D,
  R: PARTY_TEXT.R,
  O: PARTY_TEXT.O,
  L: "text-yellow-600 dark:text-yellow-400",
  Y: "text-emerald-600 dark:text-emerald-400",
  N: "text-amber-600 dark:text-amber-400",
};
const RACE_BAR: Record<RaceParty, string> = {
  D: "bg-blue-500",
  R: "bg-red-500",
  O: "bg-gray-400",
  L: "bg-yellow-500",
  Y: "bg-emerald-500",
  N: "bg-amber-500",
};
/** Bar order: Democrats left, Republicans right, everyone else between. */
const BAR_ORDER: Record<RaceParty, number> = { D: 0, Y: 0, L: 1, O: 2, N: 3, R: 3 };

export default function Results({ loaderData }: Route.ComponentProps) {
  const { results, races, placeRaces, updatedAt, log, editor } = loaderData;
  const [mode, setMode] = useState<EntryMode>("set");

  // Live tally: seed from the server, then update as counts are added so the
  // totals move without waiting for the save round-trip.
  const [rows, setRows] = useState<Record<string, Row>>(() => toRows(results));
  const setRow = (id: string, next: Row) =>
    setRows((prev) => ({ ...prev, [id]: next }));

  const [raceRows, setRaceRows] = useState<Record<string, RaceRow>>(() =>
    toRaceRows(races)
  );
  const setRaceRow = (id: string, next: RaceRow) =>
    setRaceRows((prev) => ({ ...prev, [id]: next }));

  // Every save revalidates the loader, so take the server's totals whenever
  // they come back — that also picks up what other people have added.
  useEffect(() => setRows(toRows(results)), [results]);

  // Watchers see other people's counts (and the history) without saving or
  // reloading: re-run the loader every few seconds. Skipped while the tab is
  // hidden, while a count box has focus, and while a save is in flight, so a
  // refresh never lands on top of what someone is entering.
  const revalidator = useRevalidator();
  const busy = useFetchers().some((f) => f.state !== "idle");
  const latest = useRef({ revalidator, busy });
  latest.current = { revalidator, busy };
  useEffect(() => {
    const tick = () => {
      const { revalidator, busy } = latest.current;
      if (document.hidden || busy || revalidator.state !== "idle") return;
      if (document.activeElement instanceof HTMLInputElement) return;
      revalidator.revalidate();
    };
    const id = setInterval(tick, REFRESH_MS);
    // Catch up straight away when coming back to the tab.
    const onVisible = () => !document.hidden && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  useEffect(() => setRaceRows(toRaceRows(races)), [races]);

  const [placeRaceVotes, setPlaceRaceVotes] = useState(placeRaces);
  useEffect(() => setPlaceRaceVotes(placeRaces), [placeRaces]);
  const placeRaceCtx = useMemo(
    () => ({
      votes: placeRaceVotes,
      set: (id: string, next: VoteMap) =>
        setPlaceRaceVotes((prev) => ({ ...prev, [id]: next })),
    }),
    [placeRaceVotes]
  );

  const allPlaces = useMemo(
    () => OH7_TOWNS.flatMap((t) => t.pollingPlaces),
    []
  );
  const totals = useMemo(() => tallyOf(allPlaces, rows), [allPlaces, rows]);

  const grand = totals.v[D_KEY] + totals.v[R_KEY] + totals.v[O_KEY];
  const dLead = totals.v[D_KEY] - totals.v[R_KEY];
  const pctIn = Math.round((totals.reporting / OH7_PLACE_COUNT) * 100);
  const pct = (k: string) => (grand ? (totals.v[k] / grand) * 100 : 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          OH-7 / Medina Election Night
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {OH7_TITLE} &mdash; type each count into its field. It saves when
          you press Enter or leave the field, and totals for everyone. Enter 0
          to reset a field.
          {updatedAt
            ? ` Last edit ${new Date(updatedAt).toLocaleString()}.`
            : ""}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {OH7_PLACE_COUNT} polling places across Cuyahoga (split), Medina,
          Ashland and the OH-7 part of Wayne &mdash; locations from the county
          boards of elections. Medina&rsquo;s section also carries every other
          race on the county ballot: entered at each Medina polling place, plus
          a county-wide count for early and absentee votes.
        </p>
      </header>

      {!editor ? (
        <div className="mb-4">
          <LoginForm title="Sign in to enter counts" />
        </div>
      ) : (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span>
            Signed in as <span className="font-medium">{editor}</span>.
          </span>
          <span className="flex items-center gap-1.5">
            Entry
            {(
              [
                ["set", "Type totals", "A typed number replaces the field's total"],
                ["add", "Add to totals", "A typed number is added to the field's total; 0 still resets it"],
              ] as const
            ).map(([m, label, title]) => (
              <button
                key={m}
                type="button"
                title={title}
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  mode === m
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {label}
              </button>
            ))}
          </span>
        </div>
      )}

      {/* grand total */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            District total
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {totals.reporting}/{OH7_PLACE_COUNT} polling places reporting ·{" "}
            {totals.done} final
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-lg font-bold">
          {OH7_CANDIDATES.map((c) => (
            <span key={c.key} className={PARTY_TEXT[c.party]}>
              {c.short} {fmt(totals.v[c.key])}
              {grand > 0 && (
                <span className="ml-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                  {pct(c.key).toFixed(1)}%
                </span>
              )}
            </span>
          ))}
          <span className={`ml-auto ${dLead >= 0 ? PARTY_TEXT.D : PARTY_TEXT.R}`}>
            {leadLabel(totals.v)}
          </span>
        </div>
        <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <span className="bg-blue-500" style={{ width: `${pct(D_KEY)}%` }} />
          <span className="bg-gray-400" style={{ width: `${pct(O_KEY)}%` }} />
          <span className="ml-auto bg-red-500" style={{ width: `${pct(R_KEY)}%` }} />
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800/60">
          <span
            className="block h-full bg-gray-500 dark:bg-gray-400"
            style={{ width: `${pctIn}%` }}
          />
        </div>
      </div>

      <EntryModeCtx.Provider value={mode}>
      <PlaceRaceCtx.Provider value={placeRaceCtx}>
      <div className="space-y-3">
        {COUNTIES.map((c) => (
          <CountySection
            key={c.county}
            county={c.county}
            towns={c.towns}
            rows={rows}
            onRow={setRow}
            raceRows={raceRows}
            onRaceRow={setRaceRow}
            editable={!!editor}
          />
        ))}
      </div>
      </PlaceRaceCtx.Provider>
      </EntryModeCtx.Provider>

      <HistorySection log={log} />
    </div>
  );
}

const ALL_PLACES = new Map(
  OH7_TOWNS.flatMap((t) => t.pollingPlaces.map((p) => [p.id, p] as const))
);
const OH7_BY_KEY = new Map(OH7_CANDIDATES.map((c) => [c.key, c]));

/** "Where" and "what" for one logged save, in the page's own words. */
function describeLogEntry(e: Oh7LogEntry): { where: string; field: string; text: string } {
  let placeId: string | undefined;
  let race: CountyRace | undefined;
  if (e.kind === "place") placeId = e.rowId;
  else if (e.kind === "race") race = RACES_BY_ID.get(e.rowId);
  else {
    const [p, r] = e.rowId.split("|");
    placeId = p;
    race = RACES_BY_ID.get(r);
  }
  const place = placeId ? ALL_PLACES.get(placeId) : undefined;
  const at = placeId ? (place ? `${place.name} (${place.town})` : placeId) : "county-wide";
  const what = race ? race.title : e.kind === "place" ? "U.S. House, 7th District" : e.rowId;
  const where = `${at} · ${what}`;

  let field: string;
  let text = "";
  if (e.path === "$.final") field = "Final";
  else if (e.path === "$.reporting") field = "Precincts reporting";
  else {
    const key = e.path.replace("$.votes.", "");
    const c = race ? race.candidates.find((c) => c.key === key) : OH7_BY_KEY.get(key);
    field = c?.name ?? key;
  }

  if (e.path === "$.final") text = e.amount ? "marked final" : "unmarked final";
  else if (e.op === "add") text = `${(e.amount ?? 0) > 0 ? "+" : "−"}${fmt(Math.abs(e.amount ?? 0))}`;
  else text = e.amount === 0 ? "reset to 0" : `set to ${fmt(e.amount ?? 0)}`;

  return { where, field, text };
}

/** Every save, newest first: who changed what, and the field's value before → after. */
function HistorySection({ log }: { log: Oh7LogEntry[] }) {
  const [who, setWho] = useState("");
  const editors = useMemo(() => [...new Set(log.map((e) => e.editor))].sort(), [log]);
  const shown = who ? log.filter((e) => e.editor === who) : log;

  return (
    <details className="group mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <span className="flex items-center gap-2">
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3 shrink-0 text-gray-400 transition-transform group-open:rotate-90"
            fill="currentColor"
          >
            <path d="M4 2l4 4-4 4z" />
          </svg>
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Change history
          </span>
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {log.length ? `last ${log.length} change${log.length === 1 ? "" : "s"}` : "no changes yet"}
        </span>
      </summary>

      <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
        {editors.length > 1 && (
          <label className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            Person
            <select
              value={who}
              onChange={(e) => setWho(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">Everyone</option>
              {editors.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        {shown.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Nothing logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 dark:text-gray-500">
                <tr>
                  <th className="py-1 pr-3 font-medium">Time</th>
                  <th className="py-1 pr-3 font-medium">Who</th>
                  <th className="py-1 pr-3 font-medium">Where</th>
                  <th className="py-1 pr-3 font-medium">Field</th>
                  <th className="py-1 pr-3 font-medium">Change</th>
                  <th className="py-1 font-medium">Before → after</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-gray-800 dark:text-gray-300">
                {shown.map((e) => {
                  const d = describeLogEntry(e);
                  return (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap py-1 pr-3 tabular-nums text-gray-500 dark:text-gray-400">
                        {new Date(e.at).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="whitespace-nowrap py-1 pr-3 font-medium">{e.editor}</td>
                      <td className="py-1 pr-3">{d.where}</td>
                      <td className="py-1 pr-3">{d.field}</td>
                      <td className="whitespace-nowrap py-1 pr-3">{d.text}</td>
                      <td className="whitespace-nowrap py-1 tabular-nums">
                        {e.path === "$.final"
                          ? `${e.before ? "final" : "open"} → ${e.after ? "final" : "open"}`
                          : `${fmt(e.before ?? 0)} → ${e.after == null ? "?" : fmt(e.after)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}

function CountySection({
  county,
  towns,
  rows,
  onRow,
  raceRows,
  onRaceRow,
  editable,
}: {
  county: string;
  towns: Oh7Town[];
  rows: Record<string, Row>;
  onRow: (id: string, next: Row) => void;
  raceRows: Record<string, RaceRow>;
  onRaceRow: (id: string, next: RaceRow) => void;
  editable: boolean;
}) {
  const places = useMemo(() => towns.flatMap((t) => t.pollingPlaces), [towns]);
  const sub = useMemo(() => tallyOf(places, rows), [places, rows]);
  const total = sub.v[D_KEY] + sub.v[R_KEY] + sub.v[O_KEY];
  const pct = (k: string) => (total ? (sub.v[k] / total) * 100 : 0);
  const hasRaces = county === RACES_COUNTY;

  const { votes: placeRaceVotes } = useContext(PlaceRaceCtx);
  const placeSums = useMemo(() => {
    const sums: Record<string, VoteMap> = {};
    if (!hasRaces) return sums;
    for (const p of places) {
      for (const r of MEDINA_RACES) {
        const v = placeRaceVotes[prKey(p.id, r.id)];
        if (!v) continue;
        const t = (sums[r.id] ??= {});
        for (const [k, n] of Object.entries(v)) t[k] = (t[k] || 0) + (n || 0);
      }
    }
    return sums;
  }, [hasRaces, places, placeRaceVotes]);

  return (
    <details className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <summary className="cursor-pointer list-none px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <svg
              viewBox="0 0 12 12"
              className="h-3 w-3 shrink-0 text-gray-400 transition-transform group-open:rotate-90"
              fill="currentColor"
            >
              <path d="M4 2l4 4-4 4z" />
            </svg>
            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {county} County
            </span>
          </span>
          <span className="flex items-center gap-3 text-xs">
            {total > 0 && (
              <span
                className={`font-semibold ${
                  sub.v[D_KEY] >= sub.v[R_KEY] ? PARTY_TEXT.D : PARTY_TEXT.R
                }`}
              >
                {leadLabel(sub.v)}
              </span>
            )}
            <span className="text-gray-400 dark:text-gray-500">
              {sub.reporting}/{places.length} polling places
            </span>
          </span>
        </div>
        <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <span className="bg-blue-500" style={{ width: `${pct(D_KEY)}%` }} />
          <span className="bg-gray-400" style={{ width: `${pct(O_KEY)}%` }} />
          <span className="ml-auto bg-red-500" style={{ width: `${pct(R_KEY)}%` }} />
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800/60">
          <span
            className="block h-full bg-gray-500 dark:bg-gray-400"
            style={{ width: `${(sub.reporting / places.length) * 100}%` }}
          />
        </div>
      </summary>

      <div className="space-y-4 border-t border-gray-100 p-3 dark:border-gray-800">
        {hasRaces && (
          <details
            open
            className="group/races overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <span className="flex items-center gap-2">
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3 shrink-0 text-gray-400 transition-transform group-open/races:rotate-90"
                  fill="currentColor"
                >
                  <path d="M4 2l4 4-4 4z" />
                </svg>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {county} County races
                </span>
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {MEDINA_RACES.filter((r) => raceRows[r.id]?.final).length}/
                {MEDINA_RACES.length} final
              </span>
            </summary>
            <div className="space-y-3 border-t border-gray-100 p-3 dark:border-gray-800">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Each total is what was entered at the polling places below plus
                the county-wide count (early and absentee votes).
              </p>
              {MEDINA_RACE_GROUPS.map((g) => (
                <details key={g.label} open className="group/set">
                  <summary className="mb-1 flex cursor-pointer list-none items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    <svg
                      viewBox="0 0 12 12"
                      className="h-2.5 w-2.5 shrink-0 transition-transform group-open/set:rotate-90"
                      fill="currentColor"
                    >
                      <path d="M4 2l4 4-4 4z" />
                    </svg>
                    {g.label}
                  </summary>
                  <div className="space-y-2">
                    {g.races.map((r) => (
                      <RaceCard
                        key={r.id}
                        race={r}
                        row={raceRows[r.id]}
                        placeVotes={placeSums[r.id]}
                        onRow={onRaceRow}
                        editable={editable}
                      />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        )}

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {hasRaces ? "All races by polling place" : "Polling places"}
          </h3>
          <div className="space-y-2">
            {towns.map((t) => (
              <TownSection
                key={t.town}
                town={t.town}
                places={t.pollingPlaces}
                rows={rows}
                onRow={onRow}
                withRaces={hasRaces}
                editable={editable}
              />
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}

/**
 * A count box. It shows the field's total and is typed into directly; the
 * entry is saved on Enter or when the field is left. 0 always resets the
 * field. In "add" mode (EntryModeCtx) the box clears on focus and the typed
 * number is added to the total instead of replacing it — a negative number
 * subtracts, for fixing a mistyped batch.
 */
function CountInput({
  value,
  label,
  onEdit,
  disabled,
  className = "w-20",
}: {
  value: number;
  label: string;
  onEdit: (e: Entry) => void;
  disabled?: boolean;
  className?: string;
}) {
  const mode = useContext(EntryModeCtx);
  // null = not being edited, so the box shows the saved total. The ref is
  // what commit() trusts: Enter commits and then blurs, and the blur must
  // not commit the same text a second time.
  const [text, setText] = useState<string | null>(null);
  const draft = useRef<string | null>(null);
  const edit = (t: string | null) => {
    draft.current = t;
    setText(t);
  };

  function commit() {
    const t = draft.current;
    edit(null);
    if (t == null || !t.trim()) return;
    const n = Math.round(Number(t));
    if (!Number.isFinite(n)) return;
    if (n === 0) {
      if (value !== 0) onEdit({ op: "reset" });
    } else if (mode === "add") onEdit({ op: "add", amount: n });
    else if (n > 0 && n !== value) onEdit({ op: "set", amount: n });
  }

  const saved = value ? String(value) : "";
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      title={
        disabled
          ? "Sign in at the top of the page to enter counts."
          : mode === "add"
          ? "Type a count and press Enter to add it to this total. 0 resets."
          : "Type this field's total. 0 resets."
      }
      disabled={disabled}
      value={text ?? saved}
      placeholder={text != null && mode === "add" ? "+ add" : "0"}
      onFocus={(e) => {
        edit(mode === "add" ? "" : saved);
        e.currentTarget.select();
      }}
      onChange={(e) => edit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          e.currentTarget.blur();
        }
      }}
      onBlur={commit}
      className={`${className} rounded border border-gray-200 bg-white px-1.5 py-1 text-right text-sm font-normal tabular-nums disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900`}
    />
  );
}

function RaceCard({
  race,
  row,
  placeVotes,
  onRow,
  editable,
}: {
  race: CountyRace;
  row?: RaceRow;
  /** This race's votes summed over the county's polling places. */
  placeVotes?: VoteMap;
  onRow: (id: string, next: RaceRow) => void;
  editable: boolean;
}) {
  const fetcher = useFetcher();
  const r = row ?? emptyRaceRow();
  // r.votes is the county-wide count; the card shows that plus polling places.
  const votes = (k: string) => (r.votes[k] || 0) + (placeVotes?.[k] || 0);
  const total = race.candidates.reduce((s, c) => s + votes(c.key), 0);
  const saving = fetcher.state !== "idle";
  const pct = (k: string) => (total ? (votes(k) / total) * 100 : 0);

  function send(e: FieldEdit) {
    if (!editable) return;
    if (e.field === "final") onRow(race.id, { ...r, final: "value" in e && e.value });
    else if (e.field === "reporting")
      onRow(race.id, { ...r, reporting: applied(r.reporting, e, MEDINA_PRECINCT_COUNT) });
    else {
      const key = e.field.slice(2);
      onRow(race.id, {
        ...r,
        votes: { ...r.votes, [key]: applied(r.votes[key] || 0, e, MAX_VOTES) },
      });
    }
    fetcher.submit(editForm("raceId", race.id, e), { method: "post" });
  }

  const [first, second] = [...race.candidates].sort(
    (a, b) => votes(b.key) - votes(a.key)
  );
  const margin = votes(first.key) - (second ? votes(second.key) : 0);
  const bar = [...race.candidates].sort(
    (a, b) => BAR_ORDER[a.party] - BAR_ORDER[b.party]
  );

  return (
    <div
      className={`rounded-lg border border-gray-200 p-3 dark:border-gray-800 ${
        r.final ? "bg-green-50/50 dark:bg-green-950/20" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {race.title}
          {saving && (
            <span className="ml-1.5 text-[10px] font-normal text-gray-400 dark:text-gray-500">
              saving…
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
          {r.reporting}/{MEDINA_PRECINCT_COUNT} precincts reporting
          {r.final ? " · final" : ""}
        </span>
      </div>
      {race.note && (
        <div className="text-[11px] text-gray-400 dark:text-gray-500">{race.note}</div>
      )}

      {/* same headline + bars as the District total card */}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-lg font-bold">
        {race.candidates.map((c) => (
          <span key={c.key} className={RACE_TEXT[c.party]} title={c.name}>
            {shortName(c)} {fmt(votes(c.key))}
            {total > 0 && (
              <span className="ml-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                {pct(c.key).toFixed(1)}%
              </span>
            )}
          </span>
        ))}
        <span className={`ml-auto ${RACE_TEXT[first.party]}`}>
          {margin === 0
            ? "Tied"
            : `${first.party === "D" || first.party === "R" ? "" : `${shortName(first)} `}+${marginPct(
                votes(first.key),
                second ? votes(second.key) : 0,
                total
              )}`}
        </span>
      </div>
      <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        {bar.map((c) => (
          <span
            key={c.key}
            className={`${RACE_BAR[c.party]} ${
              c.party === "R" || c.party === "N" ? "ml-auto" : ""
            }`}
            style={{ width: `${pct(c.key)}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800/60">
        <span
          className="block h-full bg-gray-500 dark:bg-gray-400"
          style={{ width: `${(r.reporting / MEDINA_PRECINCT_COUNT) * 100}%` }}
        />
      </div>

      {editable && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <span
            className="w-full text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500"
            title="Votes not tied to a polling place. Election-day counts go in each polling place's row below."
          >
            County-wide (early / absentee)
          </span>
          {race.candidates.map((c) => (
            <label key={c.key} className="flex items-center gap-1.5">
              <span className={RACE_TEXT[c.party]}>
                {c.name}
                {c.incumbent && <span className="ml-1 text-[10px] opacity-70">(i)</span>}
              </span>
              <CountInput
                value={r.votes[c.key] || 0}
                label={`County-wide votes for ${c.name}`}
                onEdit={(e) => send({ field: `v:${c.key}`, ...e })}
              />
            </label>
          ))}
          <label className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            Precincts
            <CountInput
              value={r.reporting}
              label={`Precincts reporting for ${race.title}`}
              className="w-16"
              onEdit={(e) => send({ field: "reporting", ...e })}
            />
          </label>
          <label className="ml-auto flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <input
              type="checkbox"
              checked={r.final}
              onChange={(e) => send({ field: "final", value: e.target.checked })}
              className="h-4 w-4 accent-green-600"
            />
            Final
          </label>
        </div>
      )}
    </div>
  );
}

function TownSection({
  town,
  places,
  rows,
  onRow,
  withRaces,
  editable,
}: {
  town: string;
  places: Oh7PollingPlace[];
  rows: Record<string, Row>;
  onRow: (id: string, next: Row) => void;
  /** Polling places here also take counts for the county's other races. */
  withRaces: boolean;
  editable: boolean;
}) {
  const sub = useMemo(() => tallyOf(places, rows), [places, rows]);
  const anyVotes = sub.v[D_KEY] + sub.v[R_KEY] + sub.v[O_KEY] > 0;
  // Polling places render only while the town is open — a Medina place is a
  // line per race, so rendering every town up front would be thousands of inputs.
  const [open, setOpen] = useState(false);
  // One polling place open at a time; "Next" moves down the list.
  const [openPlace, setOpenPlace] = useState<{ id: string; scroll: boolean } | null>(
    null
  );

  return (
    <details
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group/town overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <span className="flex items-center gap-2">
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3 shrink-0 text-gray-400 transition-transform group-open/town:rotate-90"
            fill="currentColor"
          >
            <path d="M4 2l4 4-4 4z" />
          </svg>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {town}
          </span>
        </span>
        <span className="flex items-center gap-3 text-xs">
          {anyVotes && (
            <span
              className={`font-semibold ${
                sub.v[D_KEY] >= sub.v[R_KEY] ? PARTY_TEXT.D : PARTY_TEXT.R
              }`}
            >
              {leadLabel(sub.v)}
            </span>
          )}
          <span className="text-gray-400 dark:text-gray-500">
            {sub.reporting}/{places.length}
          </span>
        </span>
      </summary>

      {open && (
        <div className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800">
          {places.map((p, i) => {
            const next = places[i + 1];
            return (
              <PlaceBlock
                key={p.id}
                place={p}
                row={rows[p.id]}
                onRow={onRow}
                withRaces={withRaces}
                editable={editable}
                open={openPlace?.id === p.id}
                scrollOnOpen={!!openPlace?.scroll}
                onOpenChange={(o) =>
                  setOpenPlace((cur) =>
                    o ? { id: p.id, scroll: false } : cur?.id === p.id ? null : cur
                  )
                }
                onNext={next ? () => setOpenPlace({ id: next.id, scroll: true }) : undefined}
              />
            );
          })}
        </div>
      )}
    </details>
  );
}

/** One race at one polling place: a count box per candidate. */
function RaceLine({
  title,
  saving,
  candidates,
  votes,
  where,
  editable,
  onEdit,
}: {
  title: string;
  saving: boolean;
  candidates: { key: string; label: string; name: string; text: string }[];
  votes: VoteMap;
  /** Polling place name, for the inputs' accessible labels. */
  where: string;
  editable: boolean;
  onEdit: (key: string, e: Entry) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5 text-xs">
      <span className="w-full font-medium text-gray-700 dark:text-gray-300 lg:w-60">
        {title}
        {saving && (
          <span className="ml-1.5 text-[10px] font-normal text-gray-400 dark:text-gray-500">
            saving…
          </span>
        )}
      </span>
      {candidates.map((c) => (
        <label key={c.key} className="flex items-center gap-1.5" title={c.name}>
          <span className={c.text}>{c.label}</span>
          <CountInput
            value={votes[c.key] || 0}
            label={`Votes for ${c.name}, ${title}, at ${where}`}
            disabled={!editable}
            className="w-16"
            onEdit={(e) => onEdit(c.key, e)}
          />
        </label>
      ))}
    </div>
  );
}

const OH7_LINE = OH7_CANDIDATES.map((c) => ({
  key: c.key,
  label: c.short,
  name: c.name,
  text: PARTY_TEXT[c.party],
}));

/** One of the county's other races at one polling place. */
function PlaceRaceLine({
  place,
  race,
  editable,
}: {
  place: Oh7PollingPlace;
  race: CountyRace;
  editable: boolean;
}) {
  const fetcher = useFetcher();
  const { votes, set } = useContext(PlaceRaceCtx);
  const id = prKey(place.id, race.id);
  const v = votes[id] ?? {};
  const candidates = useMemo(
    () =>
      race.candidates.map((c) => ({
        key: c.key,
        label: shortName(c),
        name: c.name,
        text: RACE_TEXT[c.party],
      })),
    [race]
  );

  function send(key: string, e: Entry) {
    const change = { field: `v:${key}`, ...e };
    set(id, { ...v, [key]: applied(v[key] || 0, change, MAX_VOTES) });
    const fd = editForm("placeId", place.id, change);
    fd.set("raceId", race.id);
    fetcher.submit(fd, { method: "post" });
  }

  return (
    <RaceLine
      title={race.title}
      saving={fetcher.state !== "idle"}
      candidates={candidates}
      votes={v}
      where={place.name}
      editable={editable}
      onEdit={send}
    />
  );
}

/** A polling place: its OH-7 count, then (in the county whose whole ballot is
 *  tracked) every other race on its ballot, each entered the same way. */
function PlaceBlock({
  place,
  row,
  onRow,
  withRaces,
  editable,
  open,
  scrollOnOpen,
  onOpenChange,
  onNext,
}: {
  place: Oh7PollingPlace;
  row?: Row;
  onRow: (id: string, next: Row) => void;
  withRaces: boolean;
  editable: boolean;
  open: boolean;
  /** Bring the place to the top when it opens (set when reached via "Next"). */
  scrollOnOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the town's next polling place; absent on the last one. */
  onNext?: () => void;
}) {
  const fetcher = useFetcher();
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (open && scrollOnOpen) ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [open, scrollOnOpen]);
  const r = row ?? emptyRow();
  const total = rowTotal(r);
  const races = useMemo(
    () => (withRaces ? racesForPrecincts(place.precincts) : []),
    [withRaces, place]
  );

  function send(e: FieldEdit) {
    if (!editable) return;
    if (e.field === "final") onRow(place.id, { ...r, final: "value" in e && e.value });
    else {
      const key = e.field.slice(2);
      onRow(place.id, {
        ...r,
        votes: { ...r.votes, [key]: applied(r.votes[key] || 0, e, MAX_VOTES) },
      });
    }
    fetcher.submit(editForm("placeId", place.id, e), { method: "post" });
  }

  const nP = place.precincts.length;
  const sub =
    (place.address ? place.address + " · " : "") +
    `${nP} precinct${nP === 1 ? "" : "s"}`;

  return (
    <details
      ref={ref}
      open={open}
      onToggle={(e) => {
        if (e.currentTarget.open !== open) onOpenChange(e.currentTarget.open);
      }}
      className={`group/place scroll-mt-2 ${r.final ? "bg-green-50/50 dark:bg-green-950/20" : ""}`}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <div className="flex items-start gap-2">
          <svg
            viewBox="0 0 12 12"
            className="mt-1 h-3 w-3 shrink-0 text-gray-400 transition-transform group-open/place:rotate-90"
            fill="currentColor"
          >
            <path d="M4 2l4 4-4 4z" />
          </svg>
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {place.name}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</div>
          </div>
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          {total > 0 && (
            <span
              className={`font-semibold ${
                r.votes[D_KEY] >= r.votes[R_KEY] ? PARTY_TEXT.D : PARTY_TEXT.R
              }`}
            >
              {leadLabel(r.votes)}
            </span>
          )}
          <span className="mr-2 tabular-nums">
            OH-7 total {total ? fmt(total) : "—"}
          </span>
          <input
            type="checkbox"
            checked={r.final}
            disabled={!editable}
            onChange={(e) => send({ field: "final", value: e.target.checked })}
            className="h-4 w-4 accent-green-600 disabled:opacity-50"
          />
          Final
        </label>
      </summary>
      {/* Only the open place renders its inputs (a Medina place has a line per race). */}
      {open && (
        <div className="px-3 pb-2 pl-8">
          <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
            <RaceLine
              title="U.S. House, 7th District"
              saving={fetcher.state !== "idle"}
              candidates={OH7_LINE}
              votes={r.votes}
              where={place.name}
              editable={editable}
              onEdit={(key, e) => send({ field: `v:${key}`, ...e })}
            />
            {races.map((race) => (
              <PlaceRaceLine key={race.id} place={place} race={race} editable={editable} />
            ))}
          </div>
          {onNext && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={onNext}
                className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Next polling place ›
              </button>
            </div>
          )}
        </div>
      )}
    </details>
  );
}
