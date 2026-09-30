-- PoliticsPlace D1 schema. Apply with:
--   wrangler d1 execute politicsplace --local --file=./schema.sql   (local dev)
--   wrangler d1 execute politicsplace --remote --file=./schema.sql (after deploy)
--
-- kv_store holds the Big Board (/election2026), voter chase (/chase), and
-- OH-7 tally (/results) — each is one JSON blob per row, one row per
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
