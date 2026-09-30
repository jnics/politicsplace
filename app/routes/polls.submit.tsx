import type { Route } from "./+types/polls.submit";
import { cloudflareContext } from "~/lib/context.server";
import { useMemo, useState } from "react";
import { useFetcher, Link, data } from "react-router";
import { POLLS, raceKey, raceYear, type Poll, type PollResult } from "~/data/polls";
import { addManualPoll, readSubmissionLog } from "~/lib/pollsManual.server";
import { editorFromRequest, tryLogin } from "~/lib/auth.server";
import { LoginForm } from "~/components/LoginForm";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PoliticsPlace — Submit a Poll" },
    {
      name: "description",
      content: "Add a poll to an existing PoliticsPlace race by hand.",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const races = POLLS.map((r) => ({
    key: raceKey(r),
    title: r.title,
    raceType: r.raceType,
    state: r.state,
    district: r.district,
    year: raceYear(r),
    candidates: r.candidates,
  })).sort((a, b) => a.title.localeCompare(b.title));
  const log = await readSubmissionLog(context.get(cloudflareContext).env.DB);
  return { races, log, editor: editorFromRequest(request) };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();

  const login = tryLogin(form);
  if (login) return login;

  const editor = editorFromRequest(request);
  if (!editor) {
    return data({ error: "Sign in first." }, { status: 401 });
  }

  const key = String(form.get("raceKey") ?? "");
  if (!key) {
    return data({ error: "Pick a race." }, { status: 400 });
  }
  const pollster = String(form.get("pollster") ?? "").trim();
  const endDate = String(form.get("endDate") ?? "").trim();
  if (!pollster || !endDate) {
    return data({ error: "Pollster and end date are required." }, { status: 400 });
  }
  const startDate = String(form.get("startDate") ?? "").trim() || endDate;

  const results: PollResult[] = [];
  for (let i = 0; ; i++) {
    const name = form.get(`cand_${i}_name`);
    if (name == null) break;
    const party = String(form.get(`cand_${i}_party`) ?? "O");
    const pctRaw = String(form.get(`cand_${i}_pct`) ?? "").trim();
    if (pctRaw === "") continue;
    const pct = Number(pctRaw);
    if (!Number.isFinite(pct)) continue;
    results.push({ candidate: String(name), party: party as PollResult["party"], pct });
  }
  if (results.length === 0) {
    return data({ error: "Enter at least one candidate's percentage." }, { status: 400 });
  }

  const sampleSizeRaw = String(form.get("sampleSize") ?? "").trim();
  const population = String(form.get("population") ?? "").trim();
  const url = String(form.get("url") ?? "").trim();
  const sponsor = String(form.get("sponsor") ?? "").trim();

  const poll: Poll = {
    pollster,
    startDate,
    endDate,
    results,
    ...(sampleSizeRaw && Number.isFinite(Number(sampleSizeRaw))
      ? { sampleSize: Number(sampleSizeRaw) }
      : {}),
    ...(population === "LV" || population === "RV" || population === "A"
      ? { population: population as Poll["population"] }
      : {}),
    ...(url ? { url } : {}),
    ...(sponsor ? { sponsor } : {}),
  };

  const race = POLLS.find((r) => raceKey(r) === key);
  if (!race) {
    return data(
      { error: `No tracked race matches ${key} — can't add a poll to an untracked race yet.` },
      { status: 400 }
    );
  }

  await addManualPoll(context.get(cloudflareContext).env.DB, key, race.title, poll, editor);
  return data({ ok: true, raceTitle: race.title });
}

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function PollsSubmit({ loaderData }: Route.ComponentProps) {
  const { races, log, editor } = loaderData;
  const fetcher = useFetcher<typeof action>();
  const [raceKeySel, setRaceKeySel] = useState("");

  const race = useMemo(
    () => races.find((r) => r.key === raceKeySel) ?? null,
    [races, raceKeySel]
  );

  const submitting = fetcher.state !== "idle";
  const result = fetcher.data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-5">
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <Link to="/polls" className="hover:underline">
            Polls
          </Link>
          <span>/</span>
          <span>Submit</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          Add a poll
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Pick a race PoliticsPlace already tracks and enter one poll by hand.
          It's added straight to that race's list, alongside anything pulled
          automatically.
        </p>
      </header>

      {!editor ? (
        <LoginForm title="Sign in to add a poll" />
      ) : (
        <>
          <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
            Signed in as <span className="font-medium">{editor}</span>.
          </p>
          <fetcher.Form
            method="post"
            className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Race
              </span>
              <select
                name="raceKey"
                required
                value={raceKeySel}
                onChange={(e) => setRaceKeySel(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="" disabled>
                  Choose a race…
                </option>
                {races.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>

            {race && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {race.candidates.map((c, i) => (
                  <label key={c.name} className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      {c.name} ({c.party}) %
                    </span>
                    <input type="hidden" name={`cand_${i}_name`} value={c.name} />
                    <input type="hidden" name={`cand_${i}_party`} value={c.party} />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      name={`cand_${i}_pct`}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    />
                  </label>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Pollster
                </span>
                <input
                  type="text"
                  name="pollster"
                  required
                  placeholder="e.g. Quinnipiac"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Sample size
                </span>
                <input
                  type="number"
                  name="sampleSize"
                  min="0"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Field start
                </span>
                <input
                  type="date"
                  name="startDate"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Field end
                </span>
                <input
                  type="date"
                  name="endDate"
                  required
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Population
                </span>
                <select
                  name="population"
                  defaultValue=""
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="">—</option>
                  <option value="LV">Likely voters</option>
                  <option value="RV">Registered voters</option>
                  <option value="A">Adults</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Sponsor
                </span>
                <input
                  type="text"
                  name="sponsor"
                  placeholder="if partisan/campaign-sponsored"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Source link
              </span>
              <input
                type="url"
                name="url"
                placeholder="https://…"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting || !raceKeySel}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
              >
                {submitting ? "Saving…" : "Add poll"}
              </button>
              {result && "raceTitle" in result && result.ok && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  Added to {result.raceTitle}.
                </span>
              )}
              {result && "error" in result && (
                <span className="text-sm text-red-600 dark:text-red-400">{result.error}</span>
              )}
            </div>
          </fetcher.Form>
        </>
      )}

      {log.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Recently submitted
          </h2>
          <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
            {log.slice(0, 30).map((e, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2">
                <span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {e.raceTitle}
                  </span>{" "}
                  — {e.poll.pollster} ({e.poll.results.map((r) => `${r.candidate} ${r.pct}%`).join(", ")})
                </span>
                <span className="shrink-0 tabular-nums text-gray-400 dark:text-gray-500">
                  {e.by} · {fmtWhen(e.at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
