#!/usr/bin/env node
/**
 * Snapshot of the REMOTE D1 database (polls, board results, chase marks,
 * OH-7 tally — everything users write live), written to a local file — no
 * cloud storage involved, so no new billing surface (deliberately not R2:
 * plain local files are the whole ask here).
 *
 * Runs automatically as part of `pnpm run deploy` (see package.json), right
 * before every `wrangler deploy` — so there's always a snapshot from just
 * before the live data or code changed. Also runnable by hand any time:
 *
 *   pnpm db:backup
 *
 * Writes a timestamped `.sql` dump (wrangler's own `d1 export` format — a
 * plain SQL file of CREATE TABLE + INSERT statements) to backups/, which is
 * gitignored. To restore: `wrangler d1 execute politicsplace --remote
 * --file=backups/<file>.sql` (this REPLACES current data with the dump's,
 * so only do that to actually roll back).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const backupDir = resolve(root, "backups");
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = resolve(backupDir, `politicsplace-${stamp}.sql`);

// The D1 export API occasionally returns a transient "Authentication error"
// (Cloudflare-side, not a real auth problem — `wrangler whoami` and a plain
// `d1 execute` both keep working when it happens) that clears on the very
// next attempt. Retry a few times with a short pause before actually failing
// the deploy over it.
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`Exporting remote D1 database to ${outFile} ...`);
  let result;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    result = spawnSync(
      "wrangler",
      ["d1", "export", "politicsplace", "--remote", `--output=${outFile}`],
      { stdio: "inherit", shell: true, cwd: root }
    );
    if (result.status === 0) break;
    if (attempt < MAX_ATTEMPTS) {
      console.warn(
        `Backup attempt ${attempt}/${MAX_ATTEMPTS} failed, retrying in ${RETRY_DELAY_MS}ms...`
      );
      await sleep(RETRY_DELAY_MS);
    }
  }

  if (result.status !== 0) {
    console.error(`Backup failed after ${MAX_ATTEMPTS} attempts.`);
    process.exit(result.status ?? 1);
  }
  console.log(`Backup written: ${outFile}`);
}

main();
