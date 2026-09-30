import { readBlob, writeBlob } from "~/lib/db.server";

/**
 * Server-only store for the election-day voter chase (/chase) — kept in D1
 * (see schema.sql's `kv_store`) under the "chase" key. Tracks which
 * identified supporters have been marked as having voted, so the chase list
 * is "my supporters − voted".
 *
 * Gate writes with ~/lib/auth.server's shared pseudo-auth when this needs to
 * be multi-user; currently unauthenticated, matching its prior behavior.
 */

export interface VotedMark {
  at: string;
  by: string;
}

export interface ChaseStore {
  /** supporter id -> when they were marked voted. Absent = still to chase. */
  voted: Record<string, VotedMark>;
}

const EMPTY: ChaseStore = { voted: {} };

export async function readChase(db: D1Database): Promise<ChaseStore> {
  const raw = await readBlob<Partial<ChaseStore>>(db, "chase", EMPTY);
  return { voted: raw.voted ?? {} };
}

/** Mark a supporter voted / not voted. */
export async function setVoted(
  db: D1Database,
  supporterId: string,
  voted: boolean,
  by: string
): Promise<ChaseStore> {
  const store = await readChase(db);
  if (voted) {
    store.voted[supporterId] = { at: new Date().toISOString(), by: by || "anon" };
  } else {
    delete store.voted[supporterId];
  }
  await writeBlob(db, "chase", store);
  return store;
}
