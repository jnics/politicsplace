import type { Route } from "./+types/election2026";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, data } from "react-router";
import {
  BOARD_SENATE,
  BOARD_HOUSE,
  type BoardParty,
  type BoardRace,
} from "~/data/bigBoard2026";
import { raceId, type BoardResult } from "~/data/boardResults";
import { STATE_PATHS } from "~/data/statePaths";
import { readStore, saveResult } from "~/lib/board.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PoliticsPlace — 2026 Election Night" },
    {
      name: "description",
      content: "The 2026 general-election big board: every Senate and House race.",
    },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  const store = await readStore();
  return { results: store.results as Record<string, BoardResult> };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  if (form.get("intent") !== "result") {
    return data({ error: "Unknown action." }, { status: 400 });
  }
  const id = String(form.get("raceId"));
  const by = String(form.get("by") ?? "").trim() || "anon";
  const reportedPct = Math.max(
    0,
    Math.min(100, Number(form.get("reportedPct")) || 0)
  );
  const votes: Record<string, number> = {};
  for (const [k, v] of form.entries()) {
    if (k.startsWith("v:") && v !== "")
      votes[k.slice(2)] = Math.max(0, Number(v) || 0);
  }
  const calledRaw = String(form.get("called") ?? "");
  const called = ["D", "R", "I", "L", "G", "O"].includes(calledRaw)
    ? (calledRaw as BoardParty)
    : undefined;
  await saveResult(id, { reportedPct, votes, called }, by);
  return data({ ok: true });
}

const STATE_NAME: Record<string, string> = Object.fromEntries(
  STATE_PATHS.map((s) => [s.id, s.name])
);

const PARTY_DOT: Record<BoardParty, string> = {
  D: "bg-blue-500", R: "bg-red-500", I: "bg-green-500",
  L: "bg-yellow-500", G: "bg-emerald-500", O: "bg-gray-400",
};
const PARTY_TEXT: Record<BoardParty, string> = {
  D: "text-blue-600 dark:text-blue-400",
  R: "text-red-600 dark:text-red-400",
  I: "text-green-600 dark:text-green-400",
  L: "text-yellow-600 dark:text-yellow-400",
  G: "text-emerald-600 dark:text-emerald-400",
  O: "text-gray-500",
};

function statusOf(race: BoardRace, res?: BoardResult) {
  if (!res) return null;
  if (res.called) {
    const flip = res.called !== race.incumbentParty;
    return {
      label: `${res.called} ${flip ? "FLIP" : "HOLD"}`,
      cls:
        res.called === "D"
          ? "bg-blue-600 text-white"
          : res.called === "R"
          ? "bg-red-600 text-white"
          : "bg-green-600 text-white",
    };
  }
  if (res.reportedPct > 0) {
    const lead = Object.entries(res.votes).sort((a, b) => b[1] - a[1])[0];
    return {
      label: `${(lead?.[0] ?? "").split(" ").pop()} +`,
      cls: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    };
  }
  return null;
}

function tally(races: BoardRace[], results: Record<string, BoardResult>) {
  let d = 0, r = 0, other = 0, called = 0;
  for (const race of races) {
    const res = results[raceId(race)];
    if (!res?.called) continue;
    called += 1;
    if (res.called === "D") d += 1;
    else if (res.called === "R") r += 1;
    else other += 1;
  }
  return { d, r, other, called, total: races.length };
}

export default function Election2026({ loaderData }: Route.ComponentProps) {
  const { results } = loaderData;
  const [chamber, setChamber] = useState<"senate" | "house">("senate");
  const [houseFilter, setHouseFilter] = useState<"all" | "flippable">("all");
  const [editorName, setEditorName] = useState("");

  useEffect(() => {
    try {
      setEditorName(localStorage.getItem("board-editor") ?? "");
    } catch {}
  }, []);
  function updateEditorName(v: string) {
    setEditorName(v);
    try {
      localStorage.setItem("board-editor", v);
    } catch {}
  }

  const senT = useMemo(() => tally(BOARD_SENATE, results), [results]);
  const houseT = useMemo(() => tally(BOARD_HOUSE, results), [results]);

  const houseByState = useMemo(() => {
    const groups = new Map<string, BoardRace[]>();
    for (const race of BOARD_HOUSE)
      groups.set(race.state ?? "??", [
        ...(groups.get(race.state ?? "??") ?? []),
        race,
      ]);
    return [...groups.entries()]
      .map(([state, races]) => ({
        state,
        races: [...races].sort((a, b) => (a.district ?? 0) - (b.district ?? 0)),
      }))
      .sort((a, b) =>
        (STATE_NAME[a.state] ?? a.state).localeCompare(STATE_NAME[b.state] ?? b.state)
      );
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
            2026 Election Night
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Every Senate and House race. Type counts straight into a row &mdash; it
            saves as you go and updates for everyone.
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          your name
          <input
            value={editorName}
            onChange={(e) => updateEditorName(e.target.value)}
            placeholder="optional"
            className="w-28 rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <ControlCard title="Senate" t={senT} />
        <ControlCard title="House" t={houseT} />
      </div>

      <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-900">
        {(["senate", "house"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setChamber(c)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              chamber === c
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {c}{" "}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {c === "senate" ? BOARD_SENATE.length : BOARD_HOUSE.length}
            </span>
          </button>
        ))}
      </div>

      {chamber === "senate" ? (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {[...BOARD_SENATE]
            .sort((a, b) => a.place.localeCompare(b.place))
            .map((race) => (
              <RaceRow
                key={race.place}
                race={race}
                res={results[raceId(race)]}
                editorName={editorName}
              />
            ))}
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-2 text-xs">
            {(["all", "flippable"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setHouseFilter(f)}
                className={`rounded-full px-3 py-1 font-medium ${
                  houseFilter === f
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400"
                }`}
              >
                {f === "all" ? "All 435" : "Contested"}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {houseByState.map(({ state, races }) => {
              const shown =
                houseFilter === "all"
                  ? races
                  : races.filter((r) => r.candidates.length >= 2);
              if (shown.length === 0) return null;
              return (
                <details
                  key={state}
                  className="group overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800/50">
                    <span>
                      <svg
                        viewBox="0 0 12 12"
                        className="mr-2 inline h-3 w-3 text-gray-400 transition-transform group-open:rotate-90"
                        fill="currentColor"
                      >
                        <path d="M4 2l4 4-4 4z" />
                      </svg>
                      {STATE_NAME[state] ?? state}
                    </span>
                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                      {shown.length} seat{shown.length === 1 ? "" : "s"}
                    </span>
                  </summary>
                  <div className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                    {shown.map((race) => (
                      <RaceRow
                        key={race.place}
                        race={race}
                        res={results[raceId(race)]}
                        editorName={editorName}
                        compact
                      />
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ControlCard({
  title,
  t,
}: {
  title: string;
  t: { d: number; r: number; other: number; called: number; total: number };
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {t.called}/{t.total} called
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-3 text-lg font-bold">
        <span className="text-blue-600 dark:text-blue-400">{t.d} D</span>
        {t.other > 0 && (
          <span className="text-green-600 dark:text-green-400">{t.other} I</span>
        )}
        <span className="ml-auto text-red-600 dark:text-red-400">{t.r} R</span>
      </div>
      <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <span className="bg-blue-500" style={{ width: `${(t.d / t.total) * 100}%` }} />
        <span
          className="bg-green-500"
          style={{ width: `${(t.other / t.total) * 100}%` }}
        />
        <span className="bg-red-500" style={{ width: `${(t.r / t.total) * 100}%` }} />
      </div>
    </div>
  );
}

function RaceRow({
  race,
  res,
  editorName,
  compact,
}: {
  race: BoardRace;
  res?: BoardResult;
  editorName: string;
  compact?: boolean;
}) {
  const fetcher = useFetcher();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const st = statusOf(race, res);
  const totalVotes = res ? Object.values(res.votes).reduce((s, v) => s + v, 0) : 0;
  const saving = fetcher.state !== "idle";

  // Debounced auto-save on any input change.
  function scheduleSave() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (formRef.current) fetcher.submit(formRef.current);
    }, 700);
  }

  const cands = race.candidates.slice(0, 3);

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-start gap-3">
        <div className={compact ? "w-12 shrink-0 pt-0.5" : "w-24 shrink-0 pt-0.5"}>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {compact ? race.district || "AL" : race.place}
          </div>
        </div>

        <fetcher.Form
          ref={formRef}
          method="post"
          onChange={scheduleSave}
          className="min-w-0 flex-1 space-y-1"
        >
          <input type="hidden" name="intent" value="result" />
          <input type="hidden" name="raceId" value={raceId(race)} />
          <input type="hidden" name="by" value={editorName} />

          {cands.map((c) => {
            const v = res?.votes[c.name] ?? 0;
            const pct = totalVotes > 0 ? (v / totalVotes) * 100 : 0;
            return (
              <div key={c.name} className="flex items-center gap-2 text-xs">
                <span className={`h-2 w-2 shrink-0 rounded-full ${PARTY_DOT[c.party]}`} />
                <span className="w-32 shrink-0 truncate text-gray-700 dark:text-gray-300">
                  {c.name}
                  {c.incumbent ? " *" : ""}
                </span>
                <input
                  name={`v:${c.name}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  defaultValue={res?.votes[c.name] ?? ""}
                  placeholder="votes"
                  className="w-24 rounded border border-gray-200 bg-white px-1.5 py-0.5 tabular-nums dark:border-gray-700 dark:bg-gray-900"
                />
                <span
                  className={`ml-auto w-10 shrink-0 text-right tabular-nums ${PARTY_TEXT[c.party]}`}
                >
                  {res && totalVotes > 0 ? `${pct.toFixed(0)}%` : ""}
                </span>
              </div>
            );
          })}

          <div className="flex items-center gap-2 pt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <label className="flex items-center gap-1">
              % in
              <input
                name="reportedPct"
                type="number"
                min={0}
                max={100}
                defaultValue={res?.reportedPct ?? ""}
                className="w-14 rounded border border-gray-200 bg-white px-1.5 py-0.5 tabular-nums dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="flex items-center gap-1">
              call
              <select
                name="called"
                defaultValue={res?.called ?? ""}
                className="rounded border border-gray-200 bg-white px-1 py-0.5 dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">—</option>
                <option value="D">D</option>
                <option value="R">R</option>
                <option value="I">I</option>
              </select>
            </label>
            {st && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${st.cls}`}>
                {st.label}
              </span>
            )}
            {saving && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">saving…</span>
            )}
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
