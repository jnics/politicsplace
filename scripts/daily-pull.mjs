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
 *   pnpm daily              pull only
 *   pnpm daily --publish    pull, then commit the data files and deploy
 *                           (see publish() below)
 *
 * Run by the "PoliticsPlace daily pull" Windows scheduled task (see
 * scripts/register-daily-task.ps1) with `--publish` and `--log-dir`, so the
 * output lands in a dated log under %LOCALAPPDATA%\politicsplace\logs.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, openSync, readFileSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// What the pulls write -- the only paths `--publish` commits. Not all of
// app/data: its .ts files are code.
const DATA_PATHS = [
  "app/data/*.generated.json",
  "app/data/geo",
  "public/geo",
  "scripts/data/rcp-polls.json",
  "scripts/data/rcp-races.json",
];
const quoted = DATA_PATHS.map((p) => `"${p}"`).join(" ");

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
const allOk = results.every(([, ok]) => ok);

// `--publish`: when every step passed and the data looks sane, commit the
// data files (only those -- code changes in the working tree are left alone)
// and deploy that commit. The build runs in a throwaway worktree of HEAD so
// a half-finished edit in the working tree never ships. Not pushed.
if (process.argv.includes("--publish")) {
  log(`\n=== publish ===`);
  if (!allOk) {
    log("  skipped: a pull step failed.");
    process.exit(1);
  }
  process.exit(publish() ? 0 : 1);
}
process.exit(allOk ? 0 : 1);

function publish() {
  const root = resolve(here, "..");
  const sh = (cmd, cwd = root) => {
    const r = spawnSync(cmd, { cwd, shell: true, stdio: ["ignore", out === 2 ? "inherit" : out, out === 2 ? "inherit" : out] });
    if (r.status !== 0) log(`  "${cmd}" exited ${r.status ?? "(signal)"}`);
    return r.status === 0;
  };
  const git = (args) => spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });

  const branch = git(["branch", "--show-current"]).stdout.trim();
  if (branch !== "main") {
    log(`  skipped: on branch "${branch}", not main.`);
    return false;
  }

  const problems = sanityCheck(root, git);
  if (problems.length) {
    log("  skipped: data failed sanity checks:");
    for (const p of problems) log(`    - ${p}`);
    return false;
  }

  const changed = git(["status", "--porcelain", "--", ...DATA_PATHS]).stdout.trim();
  if (changed) {
    const day = new Date().toLocaleDateString("en-CA");
    if (!sh(`git add -- ${quoted}`)) return false;
    if (!sh(`git commit -q -m "Daily pull (${day}): polls, ratings, early vote, registration" -- ${quoted}`))
      return false;
  } else {
    log("  no data changes since the last commit.");
  }

  const wt = join(tmpdir(), `politicsplace-deploy-${Date.now()}`);
  if (!sh(`git worktree add --detach "${wt}" HEAD`)) return false;
  try {
    return (
      sh("pnpm install --frozen-lockfile --prefer-offline", wt) &&
      sh("pnpm build", wt) &&
      // Backup from the main checkout so the dump lands in its backups/.
      sh("pnpm db:backup") &&
      sh("pnpm exec wrangler deploy", wt)
    );
  } finally {
    sh(`git worktree remove --force "${wt}"`);
  }
}

/** Refuse to publish a pull that lost data compared with the last commit. */
function sanityCheck(root, git) {
  const problems = [];
  const read = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));
  const head = (p) => {
    const r = git(["show", `HEAD:${p}`]);
    return r.status === 0 ? JSON.parse(r.stdout) : null;
  };

  // Early ballots only go up: no state may drop more than 2%.
  const ev = "app/data/earlyVoteCounts.generated.json";
  const [now, before] = [read(ev), head(ev)];
  if (before) {
    if (now.totalVoted < before.totalVoted)
      problems.push(`early-vote total fell ${before.totalVoted} -> ${now.totalVoted}`);
    for (const [st, s] of Object.entries(before.byState)) {
      const was = s.current?.voted ?? 0;
      const is = now.byState[st]?.current?.voted ?? 0;
      if (was > 0 && is < was * 0.98) problems.push(`${st} early vote fell ${was} -> ${is}`);
    }
  }

  // Polls and ratings: no more than 10% of races may disappear.
  for (const [p, count] of [
    ["app/data/polls.generated.json", (d) => d.races.length],
    ["app/data/raceRatings.generated.json", (d) => Object.keys(d.byRace).length],
  ]) {
    const prev = head(p);
    if (prev && count(read(p)) < count(prev) * 0.9)
      problems.push(`${p}: ${count(prev)} -> ${count(read(p))} races`);
  }
  return problems;
}
