#!/usr/bin/env node
/**
 * Run the poll importers in order, continuing past a failure so one dead source
 * doesn't block the others:
 *
 *   1. import-538-polls.mjs       source "FiveThirtyEight"  (headless, frozen 1998-2022)
 *   2. import-wikipedia-polls.mjs source "Wikipedia"        (headless, 2026 House/Gov/Senate)
 *
 * pull-polls.mjs (source "RealClearPolling") is DISABLED here — as of 2026-09,
 * RealClearPolling's Cloudflare bot management fingerprints the CDP connection
 * playwright uses to drive Chrome (`--remote-debugging-pipe`) and blocks it with
 * "Access is temporarily restricted", even non-headless with a real Chrome
 * channel, a clean `.rcp-profile`, and a different network — so it isn't a
 * rate-limit or cookie problem to wait out or reset. Re-enable the step below
 * (and in package.json's `polls:pull`) only after confirming by hand that
 * realclearpolling.com no longer blocks that browser profile.
 *
 * Each importer keeps only its own `source` rows in app/data/polls.generated.json,
 * so they compose regardless of which ones succeed.
 *
 *   pnpm polls:all
 *
 * Args are forwarded to import-wikipedia-polls.mjs only (e.g. `pnpm polls:all OH-7`).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const wikiArgs = process.argv.slice(2);

const steps = [
  ["538", "import-538-polls.mjs", []],
  ["Wikipedia", "import-wikipedia-polls.mjs", wikiArgs],
  // ["RealClearPolling", "pull-polls.mjs", []], // disabled — see header comment
];

const results = [];
for (const [label, script, args] of steps) {
  console.error(`\n=== ${label} ===`);
  const r = spawnSync(process.execPath, [resolve(here, script), ...args], {
    stdio: "inherit",
  });
  results.push([label, r.status === 0]);
  if (r.status !== 0)
    console.error(`  ${label} exited ${r.status ?? "(signal)"} — continuing.`);
}

console.error("\n=== summary ===");
for (const [label, ok] of results) console.error(`  ${ok ? "ok  " : "FAIL"} ${label}`);
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
