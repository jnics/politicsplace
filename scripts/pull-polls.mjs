#!/usr/bin/env node
/**
 * Pull the latest polling data from RealClearPolling into
 * app/data/polls.generated.json (which app/data/polls.ts merges over anything
 * hand-seeded, keyed by race).
 *
 *   pnpm polls:pull
 *
 * RealClearPolling sits behind Cloudflare, which 403s plain fetch() and blocks
 * headless automation. This drives your installed Chrome (playwright-core, no
 * browser download) with a PERSISTENT profile in .rcp-profile/ -- clear any
 * Cloudflare check once in the window and it's remembered. Requires Chrome.
 *
 * Candidate names + party are read straight from each race table's header
 * ("BROWN (D)", "HUSTED (R)"), so adding a race is just its RCP path.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { chromium } from "playwright-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../app/data/polls.generated.json");

const STATE_NAME = {
  AK: "Alaska", FL: "Florida", GA: "Georgia", IA: "Iowa", ME: "Maine",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", NH: "New Hampshire",
  NM: "New Mexico", NC: "North Carolina", OH: "Ohio", RI: "Rhode Island",
  TN: "Tennessee", TX: "Texas",
};

/**
 * 2026 Senate races with RCP head-to-head polling pages. `path` is the URL
 * under https://www.realclearpolling.com/ . Add rows as RCP publishes pages
 * (safe/uncontested races -- ID, KY, LA, NE, SD, WV, WY... -- usually have none).
 */
const RACES = [
  { state: "AK", seatClass: 2, special: false, path: "polls/senate/general/2026/alaska/peltola-vs-sullivan" },
  { state: "FL", seatClass: 3, special: true,  path: "polls/senate/general/2026/florida/moody-vs-vindman" },
  { state: "GA", seatClass: 2, special: false, path: "polls/senate/general/2026/georgia/ossoff-vs-collins" },
  { state: "IA", seatClass: 2, special: false, path: "polls/senate/general/2026/iowa/hinson-vs-turek" },
  { state: "ME", seatClass: 2, special: false, path: "polls/senate/general/2026/collins-vs-jackson" },
  { state: "MA", seatClass: 2, special: false, path: "polls/senate/general/2026/massachusetts/deaton-vs-markey" },
  { state: "MI", seatClass: 2, special: false, path: "polls/senate/general/2026/michigan/rogers-vs-stevens" },
  { state: "MN", seatClass: 2, special: false, path: "polls/senate/general/2026/minnesota/tafoya-vs-flanagan" },
  { state: "NH", seatClass: 2, special: false, path: "polls/senate/general/2026/new-hampshire/pappas-vs-brown" },
  { state: "NM", seatClass: 2, special: false, path: "polls/senate/general/2026/new-mexico/marker-vs-lujan" },
  { state: "NC", seatClass: 2, special: false, path: "polls/senate/general/2026/north-carolina/cooper-vs-whatley" },
  { state: "OH", seatClass: 3, special: true,  path: "polls/senate/special-election/2026/ohio/husted-vs-brown" },
  { state: "RI", seatClass: 2, special: false, path: "polls/senate/general/2026/rhode-island/mckay-vs-reed" },
  { state: "TN", seatClass: 2, special: false, path: "polls/senate/general/2026/tennessee/hagerty-vs-bradshaw" },
  { state: "TX", seatClass: 2, special: false, path: "polls/senate/general/2026/texas/paxton-vs-talarico" },
];

/** "8/6 - 8/10" rows are newest-first; walk down, dropping a year each time the
 *  end month jumps back up past the previous row. */
function makeYearResolver() {
  let year = new Date().getFullYear();
  let prevEndMonth = 13;
  return (mm) => {
    if (mm > prevEndMonth) year -= 1;
    prevEndMonth = mm;
    return year;
  };
}

function parseRange(text, resolveYear) {
  const m = text.match(/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})/);
  if (!m) return { startDate: "", endDate: "" };
  const [, sm, sd, em, ed] = m.map(Number);
  const endYear = resolveYear(em);
  const startYear = sm > em ? endYear - 1 : endYear;
  const iso = (y, mo, d) =>
    `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { startDate: iso(startYear, sm, sd), endDate: iso(endYear, em, ed) };
}

function parseSample(text) {
  const m = String(text).match(/([\d,]+)?\s*(LV|RV|A)?/i);
  return {
    sampleSize: m && m[1] ? Number(m[1].replace(/,/g, "")) : undefined,
    population: m && m[2] ? m[2].toUpperCase() : undefined,
  };
}

async function scrapeRace(page, race) {
  await page.goto(`https://www.realclearpolling.com/${race.path}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const table = await page
    .waitForFunction(() => {
      const t = [...document.querySelectorAll("table")].find((x) =>
        /POLLSTER/i.test(x.rows?.[0]?.innerText || "")
      );
      if (!t) return null;
      return {
        header: [...t.rows[0].cells].map((c) =>
          c.innerText.trim().replace(/\s+/g, " ")
        ),
        body: [...t.rows]
          .slice(1)
          .map((r) => [...r.cells].map((c) => c.innerText.trim().replace(/\s+/g, " "))),
      };
    }, { timeout: 45000 })
    .then((h) => h.jsonValue());

  const { header, body } = table;
  const cols = header
    .map((h, i) => {
      const m = h.match(/^(.*?)\s*\*?\s*\((D|R|I)\)/i);
      return m ? { i, name: m[1].trim(), party: m[2].toUpperCase() } : null;
    })
    .filter(Boolean);
  if (cols.length < 2) throw new Error(`couldn't read candidates from: ${header.join(" | ")}`);

  const dateCol = header.findIndex((h) => /^date$/i.test(h));
  const sampleCol = header.findIndex((h) => /sample/i.test(h));
  const resolveYear = makeYearResolver();

  const polls = [];
  let aggregateAverage;
  for (const row of body) {
    const pollster = row[0].replace(/\*+$/, "").trim();
    const results = cols
      .map((c) => ({ candidate: c.name, party: c.party, pct: Number(row[c.i]) }))
      .filter((r) => Number.isFinite(r.pct));
    if (results.length < 2) continue;
    if (/^rcp average$/i.test(pollster)) {
      aggregateAverage = {
        spread: row[row.length - 1],
        period: row[dateCol] ?? "",
        results,
      };
      continue;
    }
    polls.push({
      pollster,
      ...parseRange(row[dateCol] ?? "", resolveYear),
      ...parseSample(row[sampleCol] ?? ""),
      results,
    });
  }

  return {
    raceType: "senate",
    state: race.state,
    seatClass: race.seatClass,
    special: race.special,
    title: `${STATE_NAME[race.state] ?? race.state} Senate${race.special ? " (special)" : ""}`,
    candidates: cols.map((c) => ({ name: c.name, party: c.party })),
    aggregateAverage,
    polls,
    source: "RealClearPolling",
    lastPulled: new Date().toISOString().slice(0, 10),
  };
}

async function main() {
  const profileDir = resolve(__dirname, "../.rcp-profile");
  const ctx = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: process.env.PULL_HEADLESS === "1",
    viewport: { width: 1280, height: 900 },
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

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

  const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: "RealClearPolling",
    races: [],
  };
  let failures = 0;
  for (const race of RACES) {
    try {
      const data = await scrapeRace(page, race);
      out.races.push(data);
      console.log(`✓ ${data.title}: ${data.polls.length} polls`);
    } catch (err) {
      failures += 1;
      console.error(`✗ ${race.state}: ${err.message}`);
    }
  }
  await ctx.close();

  if (out.races.length === 0) {
    console.error("\nNothing pulled. Leaving polls.generated.json untouched.");
    process.exit(1);
  }
  out.races.sort((a, b) =>
    (STATE_NAME[a.state] ?? a.state).localeCompare(STATE_NAME[b.state] ?? b.state)
  );
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${out.races.length}/${RACES.length} race(s) to ${OUT}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
