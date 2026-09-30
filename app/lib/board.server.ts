import { readBlob, writeBlob } from "~/lib/db.server";
import type { BoardResult } from "~/data/boardResults";

/**
 * Server-only store for the /election2026 Big Board — live results, kept in
 * D1 (see schema.sql's `kv_store`) under the "board" key. Auth for who can
 * write is shared across every feature now, in ~/lib/auth.server.
 */

export interface BoardStore {
  results: Record<string, BoardResult>;
  /** raceId -> { at, by } of the last edit, for a light audit trail. */
  log: Record<string, { at: string; by: string }>;
}

const EMPTY: BoardStore = { results: {}, log: {} };

export async function readStore(db: D1Database): Promise<BoardStore> {
  const raw = await readBlob<Partial<BoardStore>>(db, "board", EMPTY);
  return { results: raw.results ?? {}, log: raw.log ?? {} };
}

export async function saveResult(
  db: D1Database,
  raceId: string,
  result: BoardResult,
  by: string
): Promise<void> {
  const store = await readStore(db);
  store.results[raceId] = result;
  store.log[raceId] = { at: new Date().toISOString(), by };
  await writeBlob(db, "board", store);
}
