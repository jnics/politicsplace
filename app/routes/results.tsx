import type { Route } from "./+types/results";
import { cloudflareContext } from "~/lib/context.server";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, data } from "react-router";
import {
  OH7_CANDIDATES,
  OH7_TITLE,
  OH7_TOWNS,
  OH7_PLACE_COUNT,
  type PartyCode,
} from "~/data/oh7";
import { readOh7, saveOh7Result } from "~/lib/oh7.server";
import { editorFromRequest, tryLogin } from "~/lib/auth.server";
import { LoginForm } from "~/components/LoginForm";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PoliticsPlace — OH-7 Election Night" },
    {
      name: "description",
      content:
        "Polling-place election-night tally for Ohio's 7th Congressional District (Poindexter vs. Miller).",
    },
  ];
}

const PLACE_IDS = new Set(
  OH7_TOWNS.flatMap((t) => t.pollingPlaces.map((p) => p.id))
);

export async function loader({ request, context }: Route.LoaderArgs) {
  const editor = editorFromRequest(request);
  if (!editor) return { editor: null };
  const store = await readOh7(context.get(cloudflareContext).env.DB);
  return { editor, results: store.results, updatedAt: store.updatedAt };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();

  const login = await tryLogin(request, context.get(cloudflareContext).env.DB, form);
  if (login) return login;

  if (!editorFromRequest(request)) {
    return data({ error: "Sign in first." }, { status: 401 });
  }

  const placeId = String(form.get("placeId") ?? "");
  if (!PLACE_IDS.has(placeId)) {
    return data({ error: "Unknown polling place." }, { status: 400 });
  }
  const votes: Record<string, number> = {};
  for (const c of OH7_CANDIDATES) {
    votes[c.key] = Math.max(0, Math.round(Number(form.get(`v:${c.key}`)) || 0));
  }
  await saveOh7Result(context.get(cloudflareContext).env.DB, placeId, {
    votes,
    final: form.get("final") === "1",
  });
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

function leadLabel(d: number, r: number): string {
  if (d === r) return "Tied";
  const c = d > r ? OH7_CANDIDATES[0] : OH7_CANDIDATES[1];
  return `${c.short} +${fmt(Math.abs(d - r))}`;
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

export default function Results({ loaderData }: Route.ComponentProps) {
  const editor = loaderData.editor;
  // Hooks must run unconditionally (same count every render) even though the
  // whole page is gated below -- falls back to an empty tally pre-login.
  const results = loaderData.editor ? loaderData.results : {};
  const updatedAt = loaderData.editor ? loaderData.updatedAt : null;

  // Live tally: seed from the server, then update as numbers are typed so the
  // totals move without waiting for the save round-trip.
  const [rows, setRows] = useState<Record<string, Row>>(() => {
    const m: Record<string, Row> = {};
    for (const [id, r] of Object.entries(results)) {
      m[id] = { votes: { ...emptyRow().votes, ...r.votes }, final: !!r.final };
    }
    return m;
  });
  const setRow = (id: string, next: Row) =>
    setRows((prev) => ({ ...prev, [id]: next }));

  // Pre-login the loader never sends real results (see below), so once a
  // login succeeds and the loader revalidates with the real tally, reseed
  // `rows` -- the useState initializer above only ran once, against the
  // empty pre-login placeholder.
  useEffect(() => {
    if (!editor) return;
    setRows(() => {
      const m: Record<string, Row> = {};
      for (const [id, r] of Object.entries(results)) {
        m[id] = { votes: { ...emptyRow().votes, ...r.votes }, final: !!r.final };
      }
      return m;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const allPlaces = useMemo(
    () => OH7_TOWNS.flatMap((t) => t.pollingPlaces),
    []
  );
  const totals = useMemo(() => tallyOf(allPlaces, rows), [allPlaces, rows]);

  const grand = totals.v[D_KEY] + totals.v[R_KEY] + totals.v[O_KEY];
  const dLead = totals.v[D_KEY] - totals.v[R_KEY];
  const pctIn = Math.round((totals.reporting / OH7_PLACE_COUNT) * 100);
  const pct = (k: string) => (grand ? (totals.v[k] / grand) * 100 : 0);

  if (!editor) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
            OH-7 Election Night
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sign in to view the live tally.
          </p>
        </header>
        <LoginForm title="Sign in to view the tally" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          OH-7 Election Night
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {OH7_TITLE} &mdash; type each polling place&rsquo;s count into its row.
          It saves as you go and totals for everyone.
          {updatedAt
            ? ` Last edit ${new Date(updatedAt).toLocaleString()}.`
            : ""}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {OH7_PLACE_COUNT} polling places across Cuyahoga (split), Medina,
          Ashland and the OH-7 part of Wayne &mdash; locations from the county
          boards of elections.
        </p>
      </header>

      <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
        Signed in as <span className="font-medium">{editor}</span>.
      </p>

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
            {leadLabel(totals.v[D_KEY], totals.v[R_KEY])}
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

      <div className="space-y-2">
        {OH7_TOWNS.map((t) => (
          <TownSection
            key={`${t.county}-${t.town}`}
            town={t.town}
            county={t.county}
            places={t.pollingPlaces}
            rows={rows}
            onRow={setRow}
            editable={!!editor}
          />
        ))}
      </div>
    </div>
  );
}

function TownSection({
  town,
  county,
  places,
  rows,
  onRow,
  editable,
}: {
  town: string;
  county: string;
  places: import("~/data/oh7").Oh7PollingPlace[];
  rows: Record<string, Row>;
  onRow: (id: string, next: Row) => void;
  editable: boolean;
}) {
  const sub = useMemo(() => tallyOf(places, rows), [places, rows]);
  const anyVotes = sub.v[D_KEY] + sub.v[R_KEY] + sub.v[O_KEY] > 0;

  return (
    <details className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
            {town}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {county}
          </span>
        </span>
        <span className="flex items-center gap-3 text-xs">
          {anyVotes && (
            <span
              className={`font-semibold ${
                sub.v[D_KEY] >= sub.v[R_KEY] ? PARTY_TEXT.D : PARTY_TEXT.R
              }`}
            >
              {leadLabel(sub.v[D_KEY], sub.v[R_KEY])}
            </span>
          )}
          <span className="text-gray-400 dark:text-gray-500">
            {sub.reporting}/{places.length}
          </span>
        </span>
      </summary>

      <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-gray-500 dark:text-gray-400">
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-3 py-2 font-medium">Polling place</th>
              {OH7_CANDIDATES.map((c) => (
                <th
                  key={c.key}
                  className={`px-2 py-2 text-right font-medium ${PARTY_TEXT[c.party]}`}
                >
                  {c.short}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-medium">Total</th>
              <th className="px-2 py-2 text-center font-medium">Final</th>
            </tr>
          </thead>
          <tbody>
            {places.map((p) => (
              <PlaceRow
                key={p.id}
                place={p}
                row={rows[p.id]}
                onRow={onRow}
                editable={editable}
              />
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function PlaceRow({
  place,
  row,
  onRow,
  editable,
}: {
  place: import("~/data/oh7").Oh7PollingPlace;
  row?: Row;
  onRow: (id: string, next: Row) => void;
  editable: boolean;
}) {
  const fetcher = useFetcher();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const r = row ?? emptyRow();
  const total = rowTotal(r);
  const saving = fetcher.state !== "idle";

  function push(next: Row) {
    if (!editable) return;
    onRow(place.id, next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const fd = new FormData();
      fd.set("placeId", place.id);
      for (const c of OH7_CANDIDATES)
        fd.set(`v:${c.key}`, String(next.votes[c.key] || 0));
      if (next.final) fd.set("final", "1");
      fetcher.submit(fd, { method: "post" });
    }, 600);
  }

  const nP = place.precincts.length;
  const sub =
    (place.address ? place.address + " · " : "") +
    `${nP} precinct${nP === 1 ? "" : "s"}`;

  return (
    <tr
      className={`border-b border-gray-50 last:border-0 dark:border-gray-800/60 ${
        r.final ? "bg-green-50/50 dark:bg-green-950/20" : ""
      }`}
    >
      <td className="px-3 py-1.5">
        <div className="font-medium text-gray-800 dark:text-gray-200">
          {place.name}
          {saving && (
            <span className="ml-1.5 text-[10px] text-gray-400 dark:text-gray-500">
              saving…
            </span>
          )}
        </div>
        <div className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</div>
      </td>
      {OH7_CANDIDATES.map((c) => (
        <td key={c.key} className="px-2 py-1.5 text-right align-top">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            disabled={!editable}
            value={r.votes[c.key] || ""}
            placeholder="0"
            onChange={(e) =>
              push({
                ...r,
                votes: {
                  ...r.votes,
                  [c.key]: Math.max(0, Math.round(Number(e.target.value) || 0)),
                },
              })
            }
            className="w-20 rounded border border-gray-200 bg-white px-1.5 py-1 text-right tabular-nums disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
          />
        </td>
      ))}
      <td className="px-2 py-1.5 text-right align-top tabular-nums font-medium text-gray-900 dark:text-gray-100">
        {total ? fmt(total) : "—"}
      </td>
      <td className="px-2 py-1.5 text-center align-top">
        <input
          type="checkbox"
          checked={r.final}
          disabled={!editable}
          onChange={(e) => push({ ...r, final: e.target.checked })}
          className="h-4 w-4 accent-green-600 disabled:opacity-50"
        />
      </td>
    </tr>
  );
}
