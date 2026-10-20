#!/usr/bin/env node
/**
 * Import the current-cycle national generic congressional ballot average into
 * app/data/genericBallot.generated.json, which app/data/genericBallot.ts lays
 * over its hand-maintained 2026 row.
 *
 *   node scripts/import-generic-ballot.mjs
 *
 * Source: the "Generic congressional ballot aggregate polls" table on
 * Wikipedia's "2026 United States House of Representatives elections" article,
 * read through the same MediaWiki `action=parse` API as
 * import-wikipedia-polls.mjs. That table lists several aggregators' averages
 * (Decision Desk HQ, FiftyPlusOne, NBC News, Silver Bulletin, ...) plus an
 * "Average" row across them; we use the Average row as the headline figure and
 * keep the per-aggregator rows for reference.
 *
 * Deliberately NOT scraped from the aggregators themselves: RealClearPolling
 * blocks automated access (see polls-all.mjs) and FiftyPlusOne's API terms
 * forbid scraping and use in a public site.
 *
 * On any failure (article moved, table reshaped) the script exits non-zero and
 * leaves the existing generated file untouched, so the page keeps the last
 * good figure.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "app/data/genericBallot.generated.json");

const YEAR = 2026;
const ARTICLE = `${YEAR} United States House of Representatives elections`;
const TABLE_HEADING = /generic congressional ballot aggregate/i;

// ── HTML helpers (same approach as import-wikipedia-polls.mjs) ─────────
const decode = (s) =>
  s
    .replace(/<sup[\s\S]*?<\/sup>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/\[\s*\d+\s*\]/g, "")
    .replace(/\[\s*[a-z]\s*\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();

/** A row's cells with colspans expanded, so column indexes line up with the
 *  header row even where the Average row merges its two date columns. */
const cellsOf = (rowHtml) =>
  (rowHtml.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi) || []).flatMap((c) => {
    const span = Number((c.match(/colspan="?(\d+)/i) || [])[1] || 1);
    return Array(span).fill(decode(c));
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchArticle(title) {
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "parse",
      page: title,
      prop: "text",
      format: "json",
      formatversion: "2",
      redirects: "1",
    });
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt) await sleep(3000 * 2 ** (attempt - 1));
    let res;
    try {
      res = await fetch(url, {
        headers: { "user-agent": "politicsplace-generic-ballot-import/1.0 (github; local dev)" },
        signal: AbortSignal.timeout(20000),
      });
    } catch (e) {
      lastErr = new Error(`${title}: ${e.name === "TimeoutError" ? "timeout" : e.message}`);
      continue;
    }
    if (res.status === 429) { lastErr = new Error(`${title}: HTTP 429`); continue; }
    if (!res.ok) { lastErr = new Error(`${title}: HTTP ${res.status}`); break; }
    const j = await res.json();
    if (j.error) { lastErr = new Error(`${title}: ${j.error.info}`); break; }
    return j.parse.text;
  }
  throw lastErr;
}

const pct = (s) => {
  const m = String(s).match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : null;
};

/** "October 18, 2026" -> "2026-10-18"; null if it doesn't parse. */
const isoDate = (s) => {
  const d = new Date(`${s} UTC`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const spreadOf = (d, r) => {
  const m = Math.round((d - r) * 10) / 10;
  return m === 0 ? "Even" : `${m > 0 ? "D" : "R"}+${Math.abs(m).toFixed(1)}`;
};

function scrapeAggregateTable(html) {
  const at = html.search(TABLE_HEADING);
  if (at < 0) throw new Error(`no "${TABLE_HEADING.source}" heading in ${ARTICLE}`);
  const start = html.indexOf("<table", at);
  const end = html.indexOf("</table>", start);
  if (start < 0 || end < 0) throw new Error("aggregate table not found after heading");
  const rows = html.slice(start, end).split(/<tr\b[^>]*>/i).slice(1).map(cellsOf);

  const header = rows[0] || [];
  const col = (re) => header.findIndex((h) => re.test(h));
  const iName = col(/source|aggregat/i);
  const iUpdated = col(/updated/i);
  const iD = col(/democrat/i);
  const iR = col(/republican/i);
  if ([iName, iUpdated, iD, iR].some((i) => i < 0))
    throw new Error(`unexpected header: ${header.join(" | ")}`);

  let average = null;
  const aggregators = [];
  for (const cells of rows.slice(1)) {
    const name = cells[iName];
    const d = pct(cells[iD]);
    const r = pct(cells[iR]);
    if (!name || d == null || r == null) continue;
    const row = { name, d, r, spread: spreadOf(d, r), updated: isoDate(cells[iUpdated]) };
    if (/^average$/i.test(name)) average = row;
    else aggregators.push(row);
  }
  if (!average) throw new Error("no Average row in aggregate table");
  return { average, aggregators };
}

async function main() {
  const html = await fetchArticle(ARTICLE);
  const { average, aggregators } = scrapeAggregateTable(html);

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString().slice(0, 10),
        source: `Wikipedia ("${ARTICLE}", generic ballot aggregate table)`,
        year: YEAR,
        d: average.d,
        r: average.r,
        spread: average.spread,
        asOf: average.updated ?? new Date().toISOString().slice(0, 10),
        aggregators,
      },
      null,
      1
    ) + "\n"
  );

  console.error(
    `  ${YEAR} generic ballot: D ${average.d} / R ${average.r} (${average.spread}), ` +
      `average of ${aggregators.length} aggregators, updated ${average.updated}`
  );
  console.error(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
