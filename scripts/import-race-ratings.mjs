#!/usr/bin/env node
/**
 * Import 2026 consensus race ratings (Cook Political Report, Sabato's
 * Crystal Ball, Inside Elections, and whichever other forecasters a given
 * Wikipedia article's ratings table happens to carry) into
 * app/data/raceRatings.generated.json.
 *
 *   node scripts/import-race-ratings.mjs
 *
 * These are NOT scraped from Cook/Sabato/Inside Elections directly (their
 * detailed ratings are subscription content) — they come from Wikipedia's
 * own compiled ratings tables, the same MediaWiki `action=parse` API and
 * wikitable-parsing approach as import-wikipedia-polls.mjs. That's both the
 * only free source here and the safer one licensing-wise: this reproduces
 * Wikipedia's own attributed compilation of short categorical labels
 * ("Lean R", "Safe D"), not the forecasters' original written analysis.
 *
 * Source articles:
 *  - House: "2026 United States House of Representatives election ratings"
 *    (a dedicated ratings-only article, one row per competitive district)
 *  - Senate: the "Predictions" section's table on
 *    "2026 United States Senate elections"
 *  - Governor: the ratings table on
 *    "2026 United States gubernatorial elections"
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "app/data/raceRatings.generated.json");

const ARTICLES = [
  { raceType: "house", title: "2026 United States House of Representatives election ratings" },
  { raceType: "senate", title: "2026 United States Senate elections" },
  { raceType: "governor", title: "2026 United States gubernatorial elections" },
];

// ── HTML helpers (same approach as import-wikipedia-polls.mjs) ─────────
const decode = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\[\s*\d+\s*\]/g, "")
    .replace(/\[\s*[a-z]\s*\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const cellsOf = (rowHtml) =>
  (rowHtml.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi) || []).map((c) => ({
    text: decode(c),
    colspan: Number((c.match(/colspan="?(\d+)/i) || [])[1] || 1),
    rowspan: Number((c.match(/rowspan="?(\d+)/i) || [])[1] || 1),
  }));

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
        headers: { "user-agent": "politicsplace-ratings-import/1.0 (github; local dev)" },
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

// Recognized forecaster column headers -> our short key. These tables use
// short abbreviations in the actual header cells (confirmed against the
// live Wikipedia markup), not the forecasters' full names — "IE", "Econ.",
// "ST", "FPO", "Silver" — so the regexes match those, not spelled-out names.
const FORECASTERS = {
  cook: /\bcook\b/i,
  sabato: /\bsabato\b|crystal ball/i,
  insideElections: /\bIE\b|inside elections/i,
  economist: /\becon\b|economist/i,
  splitTicket: /\bST\b|split ?ticket/i,
  ddhq: /\bddhq\b|decision desk/i,
  fiftyPlusOne: /\bfpo\b|fifty ?plus ?one/i,
  foxNews: /\bfox\b/i,
  silverBulletin: /\bsilver\b/i,
  rcp: /\brcp\b|real ?clear ?politics/i,
};

const RATING_WORD = /safe|solid|likely|lean|tilt|toss ?up/i;

/** A cell counts as a rating cell if its text matches a known rating word
 *  (so we don't misidentify an incumbent-name or PVI column as a forecaster
 *  column just because its header loosely matches). */
function looksLikeRating(text) {
  return RATING_WORD.test(text);
}

function normalizeRating(text) {
  const flip = /\bflip\b/i.test(text);
  const m = text.match(/safe|solid|likely|lean|tilt|toss ?up/i);
  if (!m) return null;
  let label = m[0].replace(/\s+/g, " ").trim();
  if (/toss ?up/i.test(label)) label = "Tossup";
  else label = label[0].toUpperCase() + label.slice(1).toLowerCase();
  const party = /\bD\b|democrat/i.test(text)
    ? "D"
    : /\bR\b|republican/i.test(text)
    ? "R"
    : null;
  return { label, party, flip };
}

/** Find the ratings table in an article: the first wikitable whose header
 *  row names at least 2 known forecasters. Handles rowspan'd state/district
 *  cells (common in these tables — a multi-seat state's name cell spans
 *  several rows) by carrying the last-seen label forward. */
function scrapeRatingsTable(html, raceType) {
  const tables = html.match(/<table[^>]*wikitable[\s\S]*?<\/table>/gi) || [];
  const rows_out = [];

  for (const table of tables) {
    const rows = table.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
    if (rows.length < 2) continue;

    let headIx = -1;
    let headerCells = [];
    for (let i = 0; i < Math.min(rows.length, 4); i++) {
      const c = cellsOf(rows[i]);
      const matches = c.filter((x) =>
        Object.values(FORECASTERS).some((re) => re.test(x.text))
      ).length;
      if (matches >= 2) {
        headIx = i;
        headerCells = [];
        for (const h of c) for (let k = 0; k < h.colspan; k++) headerCells.push(h.text);
        break;
      }
    }
    if (headIx < 0) continue;

    const forecasterCol = {}; // key -> column index
    headerCells.forEach((text, i) => {
      for (const [key, re] of Object.entries(FORECASTERS)) {
        if (re.test(text) && !(key in forecasterCol)) forecasterCol[key] = i;
      }
    });
    if (Object.keys(forecasterCol).length < 2) continue;

    let lastLabel = null; // carried across rowspan'd identifier cells
    for (const rowHtml of rows.slice(headIx + 1)) {
      const c = cellsOf(rowHtml);
      if (c.length === 0) continue;
      const flat = [];
      for (const x of c) for (let k = 0; k < x.colspan; k++) flat.push(x.text);
      if (flat.length < 3) continue;

      // First non-empty, non-rating cell is the district/state label.
      const label = looksLikeRating(flat[0]) ? lastLabel : flat[0];
      if (!label) continue;
      // The tables' own summary row ("Overall" seat tally) is not a race.
      if (/^(overall|total)\b/i.test(decode(label).trim())) continue;
      lastLabel = label;

      const ratings = {};
      for (const [key, idx] of Object.entries(forecasterCol)) {
        const cellText = flat[idx];
        if (!cellText) continue;
        const r = normalizeRating(cellText);
        if (r) ratings[key] = r;
      }
      if (Object.keys(ratings).length === 0) continue;

      rows_out.push({ label: decode(label), raceType, ratings });
    }
    if (rows_out.length > 0) break; // found the real table, stop scanning
  }
  return rows_out;
}

async function main() {
  const byRace = {};
  const misses = [];

  for (const { raceType, title } of ARTICLES) {
    try {
      const html = await fetchArticle(title);
      const rows = scrapeRatingsTable(html, raceType);
      if (rows.length === 0) {
        misses.push(`${raceType} (no ratings table found)`);
        continue;
      }
      byRace[raceType] = rows;
      console.error(`  ${raceType}: ${rows.length} rated races`);
      await sleep(1500);
    } catch (e) {
      misses.push(`${raceType} (${e.message})`);
    }
  }

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString().slice(0, 10),
        source: "Wikipedia (compiled from Cook Political Report, Sabato's Crystal Ball, Inside Elections, and other public forecasters)",
        byRace,
      },
      null,
      1
    ) + "\n"
  );

  const total = Object.values(byRace).reduce((n, r) => n + r.length, 0);
  console.error(`\n${total} rated races written to ${OUT}`);
  if (misses.length) console.error(`Missed: ${misses.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
