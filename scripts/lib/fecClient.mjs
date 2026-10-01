/**
 * Shared FEC API client for the pull-fundraising / pull-donor-locations
 * scripts: request pacing, budget, retry, and .dev.vars loading in one
 * place so both scripts enforce the same limits the same way.
 *
 * The advertised limit on an api.data.gov key is 1000 requests/hour, but
 * that's NOT the binding one in practice — FEC's own `X-Ratelimit-Limit`
 * response header reads 60 and replenishes within a minute, so the real
 * ceiling is ~60 requests/minute. Confirmed by tripping a 429 at 70
 * requests paced 5/sec. This client paces at ~50/minute and retries a 429
 * with backoff instead of treating one as fatal.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export const REQUEST_BUDGET = 900;
// Widened from 1250ms after a day of heavy cumulative pulling started
// tripping 429s again well before the 900-request budget or even a full
// minute of sustained calling -- the account's effective ceiling seems to
// tighten with heavier same-day usage, not just reset cleanly every minute.
const REQUEST_DELAY_MS = 2000;
const MAX_RETRIES = 3;

/** This runs as plain `node`, outside wrangler, so it doesn't get .dev.vars
 *  for free the way `pnpm dev` does — read it by hand if needed. */
export function loadDevVars(root) {
  const path = resolve(root, ".dev.vars");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

export function requireApiKey() {
  const key = process.env.FEC_API_KEY;
  if (!key) {
    console.error(
      "FEC_API_KEY not set. Add it to .dev.vars (local) — see README-deploy.md."
    );
    process.exit(1);
  }
  return key;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Creates a paced, budgeted, retrying FEC client. Every call counts
 *  against the shared budget and is appended to `requestLog`. */
export function createFecClient(apiKey, requestLog) {
  let requestCount = 0;

  async function fecFetch(path, params, label) {
    if (requestCount >= REQUEST_BUDGET) {
      throw new Error("BUDGET_HIT");
    }
    const url = new URL(`https://api.open.fec.gov/v1/${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("api_key", apiKey);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      requestCount += 1;
      requestLog.push({ at: new Date().toISOString(), label, path, params });
      console.log(`  [${requestCount}/${REQUEST_BUDGET}] ${label}`);

      const res = await fetch(url);
      if (res.status === 429) {
        if (attempt === MAX_RETRIES) throw new Error("RATE_LIMITED");
        const backoff = REQUEST_DELAY_MS * 4 * (attempt + 1);
        console.warn(
          `    -> 429, backing off ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await sleep(backoff);
        continue;
      }
      await sleep(REQUEST_DELAY_MS);
      if (!res.ok) {
        console.warn(`    -> HTTP ${res.status} for ${label}`);
        return null;
      }
      return res.json();
    }
  }

  return { fecFetch, get requestCount() { return requestCount; } };
}
