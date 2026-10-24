#!/usr/bin/env node
/**
 * Every pull we refresh daily, in order, continuing past a failure so one
 * dead source doesn't block the rest:
 *
 *   1. polls-all.mjs              538, Wikipedia polls, generic ballot, and the
 *                                 RCP connector cache (offline -- only Claude
 *                                 can refresh scripts/data/rcp-*.json, so the
 *                                 scheduled run reuses the last cache)
 *   2. import-race-ratings.mjs    race ratings (Wikipedia)
 *   3. pull-early-voting.mjs      Google Civic early-voting info
 *   4. pull-early-vote-counts.mjs early-vote counts (UF, On Point, theoelections)
 *   5. pull-party-registration.mjs county party registration / primary votes
 *
 * Steps 1 and 2 both hit Wikipedia, so they run one after the other (never
 * in parallel) to stay clear of HTTP 429.
 *
 * FEC pulls (fundraising:*) are deliberately left out -- paused until asked.
 *
 *   pnpm daily
 *
 * Run by the "PoliticsPlace daily pull" Windows scheduled task (see
 * scripts/register-daily-task.ps1) with `--log-dir`, so the output lands in a
 * dated log under %LOCALAPPDATA%\politicsplace\logs.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, openSync, writeSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// `--log-dir <dir>`: append everything (ours and every step's) to
// <dir>/daily-YYYY-MM-DD.log instead of the console. The scheduled task uses
// this rather than shell redirection -- Windows PowerShell 5.1 turns a
// redirected native program's stderr into errors and reports a failed run
// even when every step succeeded.
const logDirArg = process.argv.indexOf("--log-dir");
let out = 2; // stderr
if (logDirArg > 0 && process.argv[logDirArg + 1]) {
  const dir = process.argv[logDirArg + 1];
  mkdirSync(dir, { recursive: true });
  const day = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local
  out = openSync(join(dir, `daily-${day}.log`), "a");
}
const log = (line) => writeSync(out, `${line}\n`);

const steps = [
  ["Polls (538, Wikipedia, generic ballot, RCP cache)", "polls-all.mjs"],
  ["Race ratings", "import-race-ratings.mjs"],
  ["Early-voting info (Google Civic)", "pull-early-voting.mjs"],
  ["Early-vote counts", "pull-early-vote-counts.mjs"],
  ["County party registration", "pull-party-registration.mjs"],
];

log(`daily pull started ${new Date().toISOString()}`);
const results = [];
for (const [label, script] of steps) {
  log(`\n=== ${label} ===`);
  const started = Date.now();
  const r = spawnSync(process.execPath, [resolve(here, script)], {
    stdio: ["ignore", out === 2 ? "inherit" : out, out === 2 ? "inherit" : out],
    cwd: resolve(here, ".."),
  });
  const secs = Math.round((Date.now() - started) / 1000);
  results.push([label, r.status === 0, secs]);
  if (r.status !== 0) log(`  ${label} exited ${r.status ?? "(signal)"} -- continuing.`);
}

log(`\n=== summary (${new Date().toISOString()}) ===`);
for (const [label, ok, secs] of results) log(`  ${ok ? "ok  " : "FAIL"} ${label} (${secs}s)`);
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
