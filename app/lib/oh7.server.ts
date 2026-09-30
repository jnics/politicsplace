import { readBlob, writeBlob } from "~/lib/db.server";

/**
 * Server-only store for the /results OH-7 polling-place tally — kept in D1
 * (see schema.sql's `kv_store`) under the "oh7" key.
 */

export interface PlaceResult {
  /** Votes by candidate key ("poindexter" | "miller" | "other"). */
  votes: Record<string, number>;
  /** Marked done — this polling place's count is complete. */
  final?: boolean;
}

export interface Oh7Store {
  results: Record<string, PlaceResult>;
  updatedAt: string | null;
}

const EMPTY: Oh7Store = { results: {}, updatedAt: null };

export async function readOh7(db: D1Database): Promise<Oh7Store> {
  const raw = await readBlob<Partial<Oh7Store>>(db, "oh7", EMPTY);
  return { results: raw.results ?? {}, updatedAt: raw.updatedAt ?? null };
}

/** Upsert one polling place's result. An all-zero, not-final entry is dropped. */
export async function saveOh7Result(
  db: D1Database,
  placeId: string,
  result: PlaceResult
): Promise<Oh7Store> {
  const store = await readOh7(db);
  const total = Object.values(result.votes).reduce((s, n) => s + (n || 0), 0);
  if (total === 0 && !result.final) {
    delete store.results[placeId];
  } else {
    store.results[placeId] = result;
  }
  store.updatedAt = new Date().toISOString();
  await writeBlob(db, "oh7", store);
  return store;
}
