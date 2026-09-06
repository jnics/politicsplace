#!/usr/bin/env node
/**
 * Pull the latest polling data from RealClearPolling into
 * app/data/polls.generated.json (which app/data/polls.ts merges over the
 * hand-seeded examples, keyed by race).
 *
 *   pnpm polls:pull
 *
 * RealClearPolling sits behind bot protection that 403s plain fetch(), so this
 * drives your installed Chrome with playwright-core (no browser download) and
 * scrapes the rendered polling table. Requires Google Chrome on the machine.
 *
 * Add races to RACES below as coverage grows (House needs `district`, governor
 * uses raceType "governor", etc). `rcpPath` is the path under
 * https://www.realclearpolling.com/ .
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { chromium } from "playwright-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../app/data/polls.generated.json");

const STATE_NAME = {
  OH: "Ohio", TX: "Texas", ME: "Maine", NC: "North Carolina", GA: "Georgia",
  MI: "Michigan", FL: "Florida", NH: "New Hampshire", MN: "Minnesota",
  IA: "Iowa", MT: "Montana", KY: "Kentucky", LA: "Louisiana", AK: "Alaska",
};

// RealClearPolling race-page URL shape:
//   polls/senate/general/2026/<state-slug>/<dem-last>-vs-<rep-last>
//   polls/senate/special-election/2026/<state-slug>/<dem-last>-vs-<rep-last>
// Enable races here as head-to-head matchups firm up. `d`/`r` are the last-name
// slugs RCP uses; the two candidate objects are built from them.
const RACES = [
  {
    state: "OH",
    seatClass: 3,
    special: true,
    slug: "ohio",
    d: { name: "Sherrod Brown", last: "brown" },
    r: { name: "Jon Husted", last: "husted", incumbent: true },
  },
  {
    state: "TX",
    seatClass: 2,
    special: false,
    slug: "texas",
    d: { name: "James Talarico", last: "talarico" },
    r: { name: "Ken Paxton", last: "paxton" },
  },
  // ── Remaining 2026 Senate races — fill in `slug` + candidate last names and
  //    uncomment as RCP publishes head-to-head pages for them:
  // { state: "ME", seatClass: 2, special: false, slug: "maine",       d: {name:"", last:""}, r: {name:"Susan Collins", last:"collins", incumbent:true} },
  // { state: "NC", seatClass: 2, special: false, slug: "north-carolina", d: {name:"", last:""}, r: {name:"", last:""} },
  // { state: "GA", seatClass: 2, special: false, slug: "georgia",     d: {name:"Jon Ossoff", last:"ossoff", incumbent:true}, r: {name:"", last:""} },
  // { state: "MI", seatClass: 2, special: false, slug: "michigan",    d: {name:"", last:""}, r: {name:"", last:""} },
  // ...33 regular Class 2 races + FL & OH specials.
].map((race) => ({
  raceType: "senate",
  state: race.state,
  seatClass: race.seatClass,
  special: race.special,
  title: `${STATE_NAME[race.state] ?? race.state} Senate${race.special ? " (special)" : ""}`,
  candidates: [
    { name: race.d.name, party: "D", incumbent: race.d.incumbent },
    { name: race.r.name, party: "R", incumbent: race.r.incumbent },
  ],
  rcpPath: `polls/senate/${race.special ? "special-election" : "general"}/2026/${
    race.slug
  }/${race.d.last}-vs-${race.r.last}`,
}));

/** "8/6 - 8/10" (+ the year it was scraped) -> ISO start/end, guessing the year
 *  so end dates never land in the future. */
function parseDateRange(text, scrapeYear) {
  const m = text.match(/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})/);
  if (!m) return { startDate: "", endDate: "" };
  const [, sm, sd, em, ed] = m.map(Number);
  const today = new Date();
  let endYear = scrapeYear;
  if (
    em > today.getMonth() + 1 ||
    (em === today.getMonth() + 1 && ed > today.getDate())
  ) {
    endYear -= 1; // range hasn't happened yet this year -> it's last year's
  }
  const startYear = sm > em ? endYear - 1 : endYear; // wrapped over New Year
  const iso = (y, mo, d) =>
    `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { startDate: iso(startYear, sm, sd), endDate: iso(endYear, em, ed) };
}

/** "1008 RV" -> { sampleSize: 1008, population: "RV" } */
function parseSample(text) {
  const m = text.match(/([\d,]+)\s*(LV|RV|A)?/i);
  if (!m) return {};
  return {
    sampleSize: Number(m[1].replace(/,/g, "")) || undefined,
    population: m[2] ? m[2].toUpperCase() : undefined,
  };
}

async function scrapeRace(page, race) {
  const url = `https://www.realclearpolling.com/${race.rcpPath}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("table", { timeout: 45000 });

  const rows = await page.evaluate(() => {
    const t = [...document.querySelectorAll("table")].find(
      (x) =>
        x.rows.length >= 3 &&
        x.rows[0]?.cells?.[0]?.innerText.trim().toUpperCase() === "POLLSTER"
    );
    if (!t) return null;
    const header = [...t.rows[0].cells].map((c) =>
      c.innerText.trim().replace(/\s+/g, " ").replace(/\s*\*$/, "")
    );
    const body = [...t.rows]
      .slice(1)
      .map((r) => [...r.cells].map((c) => c.innerText.trim().replace(/\s+/g, " ")));
    return { header, body };
  });
  if (!rows) throw new Error("polling table not found on page");

  const { header, body } = rows;
  const scrapeYear = new Date().getFullYear();
  const nameCol = (party) =>
    header.findIndex((h) => {
      const cand = race.candidates.find((c) => c.party === party);
      return cand && h.toUpperCase().includes(cand.name.split(" ").pop().toUpperCase());
    });
  const dCol = nameCol("D");
  const rCol = nameCol("R");
  const dateCol = header.findIndex((h) => /date/i.test(h));
  const sampleCol = header.findIndex((h) => /sample/i.test(h));

  const polls = [];
  let aggregateAverage;
  for (const row of body) {
    const pollster = row[0];
    if (/^rcp average$/i.test(pollster)) {
      aggregateAverage = {
        spread: row[row.length - 1],
        period: row[dateCol] ?? "",
        results: race.candidates.map((c) => ({
          candidate: c.name,
          party: c.party,
          pct: Number(row[c.party === "D" ? dCol : rCol]),
        })),
      };
      continue;
    }
    const { startDate, endDate } = parseDateRange(row[dateCol] ?? "", scrapeYear);
    polls.push({
      pollster,
      startDate,
      endDate,
      ...parseSample(row[sampleCol] ?? ""),
      results: race.candidates
        .map((c) => ({
          candidate: c.name,
          party: c.party,
          pct: Number(row[c.party === "D" ? dCol : rCol]),
        }))
        .filter((r) => Number.isFinite(r.pct)),
    });
  }
  return { polls: polls.filter((p) => p.results.length > 0), aggregateAverage };
}

async function main() {
  const now = new Date().toISOString().slice(0, 10);

  // RealClearPolling is behind Cloudflare, which blocks headless automation.
  // We drive a real Chrome window with a PERSISTENT profile (.rcp-profile/), so
  // once you clear a Cloudflare check the first time it's remembered. The window
  // is visible; set PULL_HEADLESS=1 to try headless (usually fails).
  const profileDir = resolve(__dirname, "../.rcp-profile");
  const ctx = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: process.env.PULL_HEADLESS === "1",
    viewport: { width: 1280, height: 900 },
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  // First navigation: give the user a chance to clear any Cloudflare gate.
  await page.goto("https://www.realclearpolling.com/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  if (process.env.PULL_HEADLESS !== "1") {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    await rl.question(
      "If RealClearPolling shows a Cloudflare check, clear it in the window, then press Enter… "
    );
    rl.close();
  }

  const out = { generatedAt: now, source: "RealClearPolling", races: [] };
  let failures = 0;
  for (const race of RACES) {
    const { rcpPath, ...meta } = race;
    try {
      const { polls, aggregateAverage } = await scrapeRace(page, race);
      out.races.push({
        ...meta,
        polls,
        aggregateAverage,
        source: "RealClearPolling",
        lastPulled: now,
      });
      console.log(`✓ ${race.title}: ${polls.length} polls`);
    } catch (err) {
      failures += 1;
      console.error(`✗ ${race.title}: ${err.message}`);
    }
  }

  await ctx.close();

  if (out.races.length === 0) {
    console.error("\nNothing pulled. Leaving polls.generated.json untouched.");
    process.exit(1);
  }
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${out.races.length} race(s) to ${OUT}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
