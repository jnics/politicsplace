/**
 * Server-only store for the /results OH-7 election-night tally — kept in D1's
 * `oh7_rows` table (see schema.sql), one row per polling place and one per
 * Medina County race (the county-wide count), and one per race at each Medina
 * polling place. Each save changes one field of its own row inside a
 * single SQL statement, so several people entering counts at once can't
 * overwrite each other the way they could when the whole tally was a single
 * read-modify-write blob in `kv_store`.
 */

export interface PlaceResult {
  /** Votes by candidate key ("poindexter" | "miller" | "other"). */
  votes: Record<string, number>;
  /** Marked done — this polling place's count is complete. */
  final?: boolean;
}

export interface RaceResult {
  /** Votes by candidate key (see ~/data/medinaRaces). */
  votes: Record<string, number>;
  /** Precincts counted so far for this race. */
  reporting?: number;
  final?: boolean;
}

export interface Oh7Store {
  results: Record<string, PlaceResult>;
  /** County-wide results for the other Medina County races, by race id. */
  races: Record<string, RaceResult>;
  /** Votes for one race at one Medina polling place, by "<placeId>|<raceId>". */
  placeRaces: Record<string, Record<string, number>>;
  updatedAt: string | null;
}

export type Kind = "place" | "race" | "placeRace";

export async function readOh7(db: D1Database): Promise<Oh7Store> {
  const { results: rows } = await db
    .prepare("SELECT kind, id, value, updated_at FROM oh7_rows")
    .all<{ kind: Kind; id: string; value: string; updated_at: string }>();
  const store: Oh7Store = { results: {}, races: {}, placeRaces: {}, updatedAt: null };
  for (const row of rows) {
    let value;
    try {
      value = JSON.parse(row.value);
    } catch {
      continue;
    }
    if (row.kind === "place") store.results[row.id] = value;
    else if (row.kind === "race") store.races[row.id] = value;
    else if (row.kind === "placeRace") store.placeRaces[row.id] = value.votes ?? {};
    if (!store.updatedAt || row.updated_at > store.updatedAt)
      store.updatedAt = row.updated_at;
  }
  return store;
}

export type Oh7Change =
  /** Add `amount` (may be negative) to a numeric field, clamped to 0..max. */
  | { op: "add"; amount: number; max: number }
  /** Overwrite the field: a number (0 = reset) or the `final` flag. */
  | { op: "set"; value: number | boolean };

/**
 * Apply one change to one field of one row, in a single statement — the add
 * happens inside SQLite, so two people adding to the same field at the same
 * moment both count. `path` is a JSON path into the row's value:
 * "$.votes.<candidateKey>", "$.reporting" or "$.final".
 *
 * The change is logged to `oh7_log` (who, what, before → after) in the same
 * batch, so the history can't drift from the counts.
 */
export async function changeOh7(
  db: D1Database,
  editor: string,
  kind: Kind,
  id: string,
  path: string,
  change: Oh7Change
): Promise<void> {
  const now = new Date().toISOString();
  const current =
    "(SELECT json_extract(value, ?3) FROM oh7_rows WHERE kind = ?1 AND id = ?2)";
  const update =
    change.op === "add"
      ? db
          .prepare(
            "INSERT INTO oh7_rows (kind, id, value, updated_at) " +
              "VALUES (?1, ?2, json_set('{\"votes\":{}}', ?3, CAST(min(?5, max(0, ?4)) AS INTEGER)), ?6) " +
              "ON CONFLICT(kind, id) DO UPDATE SET value = json_set(oh7_rows.value, ?3, " +
              "CAST(min(?5, max(0, coalesce(json_extract(oh7_rows.value, ?3), 0) + ?4)) AS INTEGER)), updated_at = ?6"
          )
          .bind(kind, id, path, change.amount, change.max, now)
      : db
          .prepare(
            "INSERT INTO oh7_rows (kind, id, value, updated_at) " +
              "VALUES (?1, ?2, json_set('{\"votes\":{}}', ?3, json(?4)), ?5) " +
              "ON CONFLICT(kind, id) DO UPDATE SET value = json_set(oh7_rows.value, ?3, json(?4)), updated_at = ?5"
          )
          .bind(kind, id, path, JSON.stringify(change.value), now);
  const amount =
    change.op === "add" ? change.amount : typeof change.value === "boolean" ? +change.value : change.value;

  // A batch runs as one transaction, so max(id) is the row logged just above.
  await db.batch([
    db
      .prepare(
        "INSERT INTO oh7_log (at, editor, kind, row_id, path, op, amount, before) " +
          `VALUES (?4, ?5, ?1, ?2, ?3, ?6, ?7, coalesce(${current}, 0))`
      )
      .bind(kind, id, path, now, editor, change.op, amount),
    update,
    db
      .prepare(
        `UPDATE oh7_log SET after = coalesce(${current}, 0) WHERE id = (SELECT max(id) FROM oh7_log)`
      )
      .bind(kind, id, path),
  ]);
}

export interface Oh7LogEntry {
  id: number;
  at: string;
  editor: string;
  kind: Kind;
  rowId: string;
  path: string;
  op: "add" | "set";
  amount: number | null;
  before: number | null;
  after: number | null;
}

/** The most recent saves, newest first. */
export async function readOh7Log(db: D1Database, limit = 300): Promise<Oh7LogEntry[]> {
  const { results } = await db
    .prepare(
      "SELECT id, at, editor, kind, row_id AS rowId, path, op, amount, before, after " +
        "FROM oh7_log ORDER BY id DESC LIMIT ?1"
    )
    .bind(limit)
    .all<Oh7LogEntry>();
  return results;
}
