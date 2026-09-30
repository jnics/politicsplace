import type { Poll } from "~/data/polls";

/**
 * Server-only handling for polls submitted by hand at /polls/submit — kept
 * in D1's `manual_polls` table (see schema.sql), one row per poll. Unlike
 * the *-data.json-style stores (board/chase/oh7), this one is a real growing
 * list rather than a single blob, and it's read back in TWO different ways:
 *
 *  - `readManualPollsFor` — every submitted poll for a set of race keys,
 *    merged into the base (SEEDED+GENERATED, still a build-time import)
 *    races by /polls's own loader at request time. A submission shows up on
 *    the very next page load, live — no rebuild needed, unlike the old
 *    approach of writing into polls.generated.json (a build-time import,
 *    so a live edit to that file was invisible until the next deploy).
 *  - `readSubmissionLog` — the flat "who submitted what, when" feed shown
 *    on the submit page itself.
 *
 * Auth for who can submit is shared across every feature now, in
 * ~/lib/auth.server.
 */
export interface ManualSubmission {
  at: string;
  by: string;
  raceKey: string;
  raceTitle: string;
  poll: Poll;
}

interface ManualPollRow {
  race_key: string;
  race_title: string;
  poll_json: string;
  submitted_by: string;
  submitted_at: string;
}

export async function readSubmissionLog(
  db: D1Database,
  limit = 200
): Promise<ManualSubmission[]> {
  const { results } = await db
    .prepare(
      "SELECT race_key, race_title, poll_json, submitted_by, submitted_at " +
        "FROM manual_polls ORDER BY id DESC LIMIT ?"
    )
    .bind(limit)
    .all<ManualPollRow>();
  return results.map((r) => ({
    at: r.submitted_at,
    by: r.submitted_by,
    raceKey: r.race_key,
    raceTitle: r.race_title,
    poll: JSON.parse(r.poll_json) as Poll,
  }));
}

/** Every manually-submitted poll, grouped by race key, for just the races
 *  asked about — used by /polls's loader to fold submissions into the races
 *  it's about to render.
 *
 *  This reads the whole (small) manual_polls table and filters in JS rather
 *  than binding one `?` per race key in a SQL `IN (...)` clause — with a
 *  few hundred tracked races that blew past D1/SQLite's ~100 bound-variable
 *  limit per statement (`D1_ERROR: too many SQL variables`). manual_polls
 *  only ever holds hand-submitted polls, so it stays small regardless of how
 *  many races the site tracks. */
export async function readManualPollsFor(
  db: D1Database,
  raceKeys: string[]
): Promise<Record<string, Poll[]>> {
  if (raceKeys.length === 0) return {};
  const wanted = new Set(raceKeys);
  const { results } = await db
    .prepare("SELECT race_key, poll_json FROM manual_polls ORDER BY id ASC")
    .all<Pick<ManualPollRow, "race_key" | "poll_json">>();
  const out: Record<string, Poll[]> = {};
  for (const r of results) {
    if (!wanted.has(r.race_key)) continue;
    (out[r.race_key] ??= []).push(JSON.parse(r.poll_json));
  }
  return out;
}

/** Add one poll for the given (already-tracked) race. */
export async function addManualPoll(
  db: D1Database,
  raceKey: string,
  raceTitle: string,
  poll: Poll,
  by: string
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO manual_polls (race_key, race_title, poll_json, submitted_by, submitted_at) " +
        "VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind(raceKey, raceTitle, JSON.stringify(poll), by || "anon", new Date().toISOString())
    .run();
}
