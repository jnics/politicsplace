/**
 * Generic JSON-blob-per-row store on top of D1's `kv_store` table (see
 * schema.sql) — one row per feature (board/chase/oh7), same shape as the
 * *-data.json file each used to be: read the whole blob, mutate it in
 * memory, write the whole blob back. D1 (not the local filesystem) is what
 * makes that survive on Workers, where there's no persistent disk between
 * requests.
 *
 * Every loader/action that needs one of these passes its own D1 binding in
 * (`context.cloudflare.env.DB`) rather than this module reaching for one
 * globally — there's no ambient "the" database on Workers the way
 * `process.cwd()` pointed at "the" file before.
 */

export async function readBlob<T>(db: D1Database, store: string, empty: T): Promise<T> {
  const row = await db
    .prepare("SELECT value FROM kv_store WHERE store = ?")
    .bind(store)
    .first<{ value: string }>();
  if (!row) return empty;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return empty;
  }
}

export async function writeBlob<T>(db: D1Database, store: string, value: T): Promise<void> {
  await db
    .prepare(
      "INSERT INTO kv_store (store, value, updated_at) VALUES (?1, ?2, ?3) " +
        "ON CONFLICT(store) DO UPDATE SET value = ?2, updated_at = ?3"
    )
    .bind(store, JSON.stringify(value), new Date().toISOString())
    .run();
}
