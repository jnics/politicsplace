-- PoliticsPlace D1 schema. Apply with:
--   wrangler d1 execute politicsplace --local --file=./schema.sql   (local dev)
--   wrangler d1 execute politicsplace --remote --file=./schema.sql (after deploy)
--
-- kv_store holds the Big Board (/election2026) and voter chase (/chase)
-- — each is one JSON blob per row, one row per
-- feature, mirroring the *-data.json files they replace exactly (same
-- read-whole-blob / write-whole-blob shape, just backed by D1 instead of the
-- local filesystem, which doesn't persist on Workers).
CREATE TABLE IF NOT EXISTS kv_store (
  store TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Individual polls submitted by hand at /polls/submit. Unlike kv_store this
-- is a real growing list (one row per poll), matched to a race by raceKey
-- (see app/data/polls.ts's raceKey()) and merged into that race's poll list
-- at request time by /polls's loader -- so a submission shows up on the next
-- page load, live, no rebuild needed.
CREATE TABLE IF NOT EXISTS manual_polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  race_key TEXT NOT NULL,
  race_title TEXT NOT NULL,
  poll_json TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_manual_polls_race_key ON manual_polls(race_key);

-- The /results OH-7 election-night tally: one row per polling place
-- (kind = 'place') and one per Medina County race (kind = 'race'), each a
-- small JSON value. Row-per-entry rather than one kv_store blob so two people
-- saving different rows at the same moment can't overwrite each other.
CREATE TABLE IF NOT EXISTS oh7_rows (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (kind, id)
);

-- One-time move of the old single-blob tally (kv_store 'oh7') into oh7_rows.
-- Safe to re-run: existing rows are left alone and the blob is removed once
-- copied, so a later run finds nothing to move.
INSERT OR IGNORE INTO oh7_rows (kind, id, value, updated_at)
  SELECT 'place', j.key, j.value, kv_store.updated_at
  FROM kv_store, json_each(kv_store.value, '$.results') AS j
  WHERE kv_store.store = 'oh7';
INSERT OR IGNORE INTO oh7_rows (kind, id, value, updated_at)
  SELECT 'race', j.key, j.value, kv_store.updated_at
  FROM kv_store, json_each(kv_store.value, '$.races') AS j
  WHERE kv_store.store = 'oh7';
DELETE FROM kv_store WHERE store = 'oh7';

-- Change history for the /results tally: one row per save, written in the
-- same batch as the oh7_rows change it describes. `before`/`after` are the
-- field's value either side of the save (final is 1/0).
CREATE TABLE IF NOT EXISTS oh7_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  editor TEXT NOT NULL,
  kind TEXT NOT NULL,
  row_id TEXT NOT NULL,
  path TEXT NOT NULL,
  op TEXT NOT NULL,
  amount INTEGER,
  before INTEGER,
  after INTEGER
);
