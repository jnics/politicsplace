import type { Route } from "./+types/chase";
import { cloudflareContext } from "~/lib/context.server";
import { useMemo } from "react";
import { useFetcher, useSearchParams, data } from "react-router";
import {
  SUPPORTERS,
  SUPPORT_LABELS,
  CHASE_LOCATIONS,
  precinctsFor,
  type Supporter,
  type SupportLevel,
} from "~/data/supporters";
import { readChase, setVoted } from "~/lib/chase.server";
import { editorFromRequest, tryLogin } from "~/lib/auth.server";
import { LoginForm } from "~/components/LoginForm";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PoliticsPlace — Voter Chase" },
    {
      name: "description",
      content:
        "Election-day GOTV chase: identified supporters who have not yet voted.",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const store = await readChase(context.get(cloudflareContext).env.DB);
  return { voted: store.voted, editor: editorFromRequest(request) };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();

  const login = await tryLogin(request, context.get(cloudflareContext).env.DB, form);
  if (login) return login;

  const editor = editorFromRequest(request);
  if (!editor) return data({ error: "Sign in first." }, { status: 401 });

  const id = String(form.get("id") ?? "").trim();
  if (!id || !SUPPORTERS.some((s) => s.id === id)) {
    return data({ error: "Unknown supporter." }, { status: 400 });
  }
  const voted = form.get("voted") === "1";
  await setVoted(context.get(cloudflareContext).env.DB, id, voted, editor);
  return data({ ok: true });
}

const SUPPORT_DOT: Record<SupportLevel, string> = {
  1: "bg-blue-600",
  2: "bg-blue-400",
  3: "bg-gray-400",
  4: "bg-red-400",
  5: "bg-red-600",
};

type Scoped = {
  supporter: Supporter;
  hasVoted: boolean;
  early: boolean;
};

export default function Chase({ loaderData }: Route.ComponentProps) {
  const { voted, editor } = loaderData;
  const [params, setParams] = useSearchParams();

  const location = params.get("location") || CHASE_LOCATIONS[0]?.id || "";
  const precinct = params.get("precinct") || "";
  const maxSupport = Math.min(
    5,
    Math.max(1, Number(params.get("support")) || 2)
  ) as SupportLevel;
  const show = params.get("show") === "all" ? "all" : "chase";
  const sheet = params.get("sheet") === "1";

  const precincts = useMemo(() => precinctsFor(location), [location]);

  function patch(next: Record<string, string | null>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === "") p.delete(k);
      else p.set(k, v);
    }
    setParams(p, { replace: true });
  }

  const scoped: Scoped[] = useMemo(() => {
    return SUPPORTERS.filter(
      (s) => s.location === location && (!precinct || s.precinct === precinct)
    )
      .map((s) => ({
        supporter: s,
        early: !!s.earlyVoted,
        hasVoted: !!s.earlyVoted || !!voted[s.id],
      }))
      .sort(
        (a, b) =>
          a.supporter.precinct.localeCompare(b.supporter.precinct) ||
          a.supporter.support - b.supporter.support ||
          a.supporter.name.localeCompare(b.supporter.name)
      );
  }, [location, precinct, voted]);

  const identified = scoped.length;
  const votedCount = scoped.filter((x) => x.hasVoted).length;
  const targets = scoped.filter(
    (x) => x.supporter.support <= maxSupport && !x.hasVoted
  );
  const pctIn = identified > 0 ? Math.round((votedCount / identified) * 100) : 0;

  const listed = show === "all" ? scoped : targets;
  const exportHref = `/chase/export?${new URLSearchParams({
    location,
    ...(precinct ? { precinct } : {}),
    support: String(maxSupport),
  }).toString()}`;

  const locLabel =
    CHASE_LOCATIONS.find((l) => l.id === location)?.label ?? location;

  if (sheet) {
    return (
      <WalkSheet
        title={`${locLabel}${precinct ? ` — ${precinct}` : ""}`}
        rows={targets.map((x) => x.supporter)}
        maxSupport={maxSupport}
        onClose={() => patch({ sheet: null })}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          Voter Chase
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Identified supporters who haven&rsquo;t voted yet. Mark people as they
          check in at the polls &mdash; it saves for everyone working the chase.
        </p>
      </header>

      {!editor ? (
        <div className="mb-4">
          <LoginForm title="Sign in to mark voters" />
        </div>
      ) : (
        <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
          Signed in as <span className="font-medium">{editor}</span>.
        </p>
      )}

      {/* location / precinct / support — the layer between place and data */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <Field label="Location">
          <select
            value={location}
            onChange={(e) => patch({ location: e.target.value, precinct: null })}
            className={SELECT}
          >
            {CHASE_LOCATIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Precinct">
          <select
            value={precinct}
            onChange={(e) => patch({ precinct: e.target.value || null })}
            className={SELECT}
          >
            <option value="">All precincts</option>
            {precincts.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chase support level">
          <select
            value={String(maxSupport)}
            onChange={(e) => patch({ support: e.target.value })}
            className={SELECT}
          >
            <option value="1">1 only (strong)</option>
            <option value="2">1–2 (strong + lean)</option>
            <option value="3">1–3 (include undecided)</option>
          </select>
        </Field>
        <div className="ml-auto flex gap-2 no-print">
          <a
            href={exportHref}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Download CSV
          </a>
          <button
            onClick={() => patch({ sheet: "1" })}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Walk sheet
          </button>
        </div>
      </div>

      {/* progress */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {precinct || "All precincts"}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {pctIn}% of identified supporters have voted
          </span>
        </div>
        <div className="mt-2 flex gap-4 text-sm">
          <Stat n={identified} label="identified" />
          <Stat n={votedCount} label="voted" tone="text-green-600 dark:text-green-400" />
          <Stat
            n={targets.length}
            label="to chase"
            tone="text-blue-600 dark:text-blue-400"
          />
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <span
            className="block h-full bg-green-500"
            style={{ width: `${pctIn}%` }}
          />
        </div>
      </div>

      <div className="mb-3 flex gap-2 text-xs no-print">
        {(["chase", "all"] as const).map((v) => (
          <button
            key={v}
            onClick={() => patch({ show: v === "chase" ? null : v })}
            className={`rounded-full px-3 py-1 font-medium ${
              show === v
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            {v === "chase" ? `To chase (${targets.length})` : `All identified (${identified})`}
          </button>
        ))}
      </div>

      {listed.length === 0 ? (
        <p className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {show === "chase"
            ? "Nobody left to chase in this scope — nice."
            : "No identified supporters loaded for this scope yet."}
        </p>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {listed.map((x) => (
            <SupporterRow
              key={x.supporter.id}
              scoped={x}
              showPrecinct={!precinct}
              editable={!!editor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const SELECT =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
      {label}
      {children}
    </label>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className={`text-lg font-bold ${tone ?? "text-gray-900 dark:text-gray-100"}`}>
        {n}
      </span>
      <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
    </span>
  );
}

function SupporterRow({
  scoped,
  showPrecinct,
  editable,
}: {
  scoped: Scoped;
  showPrecinct: boolean;
  editable: boolean;
}) {
  const { supporter: s, hasVoted, early } = scoped;
  const fetcher = useFetcher();
  // optimistic: reflect the in-flight toggle immediately
  const pending = fetcher.formData?.get("id") === s.id;
  const voted = pending ? fetcher.formData?.get("voted") === "1" : hasVoted;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 ${
        voted ? "bg-green-50/60 dark:bg-green-950/20" : ""
      }`}
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SUPPORT_DOT[s.support]}`}
        title={SUPPORT_LABELS[s.support]}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {s.name}
          </span>
          {showPrecinct && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {s.precinct}
            </span>
          )}
          {early && (
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
              early / absentee
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {s.address}, {s.city} {s.zip}
        </div>
        {(s.phone || s.email) && (
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
            {s.phone && (
              <a
                href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {s.phone}
              </a>
            )}
            {s.email && (
              <a
                href={`mailto:${s.email}`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {s.email}
              </a>
            )}
          </div>
        )}
      </div>
      <fetcher.Form method="post" className="no-print shrink-0">
        <input type="hidden" name="id" value={s.id} />
        <input type="hidden" name="voted" value={voted ? "0" : "1"} />
        <button
          type="submit"
          disabled={early || !editable}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
            voted
              ? "bg-green-600 text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          } ${early ? "cursor-not-allowed opacity-60" : ""}`}
        >
          {voted ? "Voted ✓" : "Mark voted"}
        </button>
      </fetcher.Form>
    </div>
  );
}

function WalkSheet({
  title,
  rows,
  maxSupport,
  onClose,
}: {
  title: string;
  rows: Supporter[];
  maxSupport: SupportLevel;
  onClose: () => void;
}) {
  const byPrecinct = new Map<string, Supporter[]>();
  for (const r of rows) {
    byPrecinct.set(r.precinct, [...(byPrecinct.get(r.precinct) ?? []), r]);
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-4 flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back to chase
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            Print
          </button>
        </div>

        <h1 className="text-lg font-bold text-gray-900">
          Chase walk sheet — {title}
        </h1>
        <p className="mb-4 text-xs text-gray-500">
          Support level 1&ndash;{maxSupport}, not yet voted &middot;{" "}
          {rows.length} voter{rows.length === 1 ? "" : "s"} &middot; generated{" "}
          {new Date().toLocaleString()}
        </p>

        {[...byPrecinct.entries()].map(([p, list]) => (
          <div key={p} className="mb-5 break-inside-avoid">
            <h2 className="mb-1 text-sm font-semibold text-gray-900">
              {p} ({list.length})
            </h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-400 text-left">
                <th className="w-8 py-1">✓</th>
                <th className="py-1 pr-2">Name</th>
                <th className="py-1 pr-2">Address</th>
                <th className="py-1 pr-2">Phone</th>
                <th className="py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-gray-200">
                  <td className="py-1.5">☐</td>
                  <td className="py-1.5 pr-2">{r.name}</td>
                  <td className="py-1.5 pr-2">
                    {r.address}, {r.city}
                  </td>
                  <td className="py-1.5 pr-2">{r.phone ?? ""}</td>
                  <td className="py-1.5" />
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ))}
      </div>
    </div>
  );
}
