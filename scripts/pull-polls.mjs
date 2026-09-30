#!/usr/bin/env node
/**
 * Pull the latest polling data from RealClearPolling into
 * app/data/polls.generated.json (which app/data/polls.ts merges over anything
 * hand-seeded, keyed by race).
 *
 *   pnpm polls:pull        # this script (RealClearPolling only)
 *   pnpm polls:all         # 538 + Wikipedia + this, in that order
 *
 * This is ONE of three poll importers; each keeps only its own `source` rows, so
 * they compose:
 *   - scripts/import-538-polls.mjs      source "FiveThirtyEight"  (headless; 1998-2022)
 *   - scripts/import-wikipedia-polls.mjs source "Wikipedia"       (headless; 2026 House/Gov/Sen)
 *   - this script                        source "RealClearPolling" (needs Chrome + a human)
 *
 * RealClearPolling sits behind Cloudflare, which 403s plain fetch() and blocks
 * headless automation. This drives your installed Chrome (playwright-core, no
 * browser download) with a PERSISTENT profile in .rcp-profile/ -- clear any
 * Cloudflare check once in the window and it's remembered. Requires Chrome.
 *
 * Candidate names + party are read straight from each race table's header
 * ("BROWN (D)", "HUSTED (R)"), so adding a race is just its RCP path.
 *
 * SOURCE PRIORITY (per-race): RealClearPolling first; where it has nothing
 * (individual U.S. House districts, most notably), fall back to the New York
 * Times district poll pages
 *   https://www.nytimes.com/interactive/polls/<state>-us-house-<n>-polls-2026.html
 * then VoteHub. Anything pulled from a fallback keeps a `sourceNote` so the page
 * can label it. House scraping (NYT) is not automated here yet -- OH-07 is
 * hand-entered in polls.generated.json from the NYT page; wire the NYT scraper
 * in when more House districts are needed.
 */
import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { chromium } from "playwright-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../app/data/polls.generated.json");

const STATE_NAME = {
  AK: "Alaska", AZ: "Arizona", CA: "California", CT: "Connecticut", FL: "Florida",
  GA: "Georgia", IA: "Iowa", ME: "Maine", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", NH: "New Hampshire", NM: "New Mexico", NC: "North Carolina",
  NY: "New York", OH: "Ohio", PA: "Pennsylvania", RI: "Rhode Island",
  TN: "Tennessee", TX: "Texas", WI: "Wisconsin", WY: "Wyoming",
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

/**
 * Historical race pages (completed cycles) so the Polls page's office-average
 * bar has comparison years. RCP keeps old race pages up; the slug is usually
 * `<year>/<state>/<loser>-vs-<winner>` or alphabetical. `year` + `office` are
 * carried through to polls.generated.json; app/data/polls.ts keys races by year
 * so these never collide with the 2026 rows. 2016-2020 RCP coverage is thin —
 * add rows as pages are confirmed.
 */
const HIST_RACES = [
  // 2024 Senate battlegrounds
  { year: 2024, office: "senate", state: "AZ", path: "polls/senate/general/2024/arizona/lake-vs-gallego" },
  { year: 2024, office: "senate", state: "MI", path: "polls/senate/general/2024/michigan/rogers-vs-slotkin" },
  { year: 2024, office: "senate", state: "MT", path: "polls/senate/general/2024/montana/sheehy-vs-tester" },
  { year: 2024, office: "senate", state: "NV", path: "polls/senate/general/2024/nevada/brown-vs-rosen" },
  { year: 2024, office: "senate", state: "OH", path: "polls/senate/general/2024/ohio/moreno-vs-brown" },
  { year: 2024, office: "senate", state: "PA", path: "polls/senate/general/2024/pennsylvania/mccormick-vs-casey" },
  { year: 2024, office: "senate", state: "WI", path: "polls/senate/general/2024/wisconsin/hovde-vs-baldwin" },
  { year: 2024, office: "senate", state: "TX", path: "polls/senate/general/2024/texas/cruz-vs-allred" },
  { year: 2024, office: "senate", state: "FL", path: "polls/senate/general/2024/florida/scott-vs-mucarsel-powell" },
  { year: 2024, office: "senate", state: "MD", path: "polls/senate/general/2024/maryland/hogan-vs-alsobrooks" },
  { year: 2024, office: "senate", state: "NE", path: "polls/senate/general/2024/nebraska/fischer-vs-osborn" },
  // 2024 Governor
  { year: 2024, office: "governor", state: "NC", path: "polls/governor/general/2024/north-carolina/robinson-vs-stein" },
  { year: 2024, office: "governor", state: "NH", path: "polls/governor/general/2024/new-hampshire/ayotte-vs-craig" },
  // 2022 Senate battlegrounds
  { year: 2022, office: "senate", state: "AZ", path: "polls/senate/general/2022/arizona/masters-vs-kelly" },
  { year: 2022, office: "senate", state: "GA", path: "polls/senate/general/2022/georgia/walker-vs-warnock" },
  { year: 2022, office: "senate", state: "NV", path: "polls/senate/general/2022/nevada/laxalt-vs-cortez-masto" },
  { year: 2022, office: "senate", state: "PA", path: "polls/senate/general/2022/pennsylvania/oz-vs-fetterman" },
  { year: 2022, office: "senate", state: "WI", path: "polls/senate/general/2022/wisconsin/johnson-vs-barnes" },
  { year: 2022, office: "senate", state: "NH", path: "polls/senate/general/2022/new-hampshire/bolduc-vs-hassan" },
  { year: 2022, office: "senate", state: "NC", path: "polls/senate/general/2022/north-carolina/budd-vs-beasley" },
  { year: 2022, office: "senate", state: "OH", path: "polls/senate/general/2022/ohio/vance-vs-ryan" },
  // 2022 Governor
  { year: 2022, office: "governor", state: "AZ", path: "polls/governor/general/2022/arizona/lake-vs-hobbs" },
  { year: 2022, office: "governor", state: "WI", path: "polls/governor/general/2022/wisconsin/michels-vs-evers" },
  { year: 2022, office: "governor", state: "PA", path: "polls/governor/general/2022/pennsylvania/mastriano-vs-shapiro" },
  { year: 2022, office: "governor", state: "MI", path: "polls/governor/general/2022/michigan/dixon-vs-whitmer" },
  { year: 2022, office: "governor", state: "NV", path: "polls/governor/general/2022/nevada/lombardo-vs-sisolak" },
  { year: 2022, office: "governor", state: "GA", path: "polls/governor/general/2022/georgia/kemp-vs-abrams" },
];

/** 2026 Governor races with RCP head-to-head polling pages. */
const GOV_RACES = [
  { state: "AZ", path: "polls/governor/general/2026/arizona/hobbs-vs-biggs" },
  { state: "CA", path: "polls/governor/general/2026/california/hilton-vs-becerra" },
  { state: "CT", path: "polls/governor/general/2026/connecticut/fazio-vs-lamont" },
  { state: "FL", path: "polls/governor/general/2026/florida/donalds-vs-jolly" },
  { state: "GA", path: "polls/governor/general/2026/georgia/lance-bottoms-vs-jackson" },
  { state: "IA", path: "polls/governor/general/2026/iowa/lahn-vs-sand" },
  { state: "MA", path: "polls/governor/general/2026/massachusetts/healey-vs-shortsleeve" },
  { state: "ME", path: "polls/governor/general/2026/maine/charles-vs-pingree" },
  { state: "MI", path: "polls/governor/general/2026/michigan/benson-vs-james" },
  { state: "NH", path: "polls/governor/general/2026/new-hampshire/ayotte-vs-warmington" },
  { state: "NM", path: "polls/governor/general/2026/new-mexico/hull-vs-haaland" },
  { state: "MN", path: "polls/governor/general/2026/minnesota/demuth-vs-klobuchar" },
  { state: "NY", path: "polls/governor/general/2026/new-york/hochul-vs-blakeman" },
  { state: "OH", path: "polls/governor/general/2026/ohio/ramaswamy-vs-acton" },
  { state: "PA", path: "polls/governor/general/2026/pennsylvania/shapiro-vs-garrity" },
  { state: "TN", path: "polls/governor/general/2026/tennessee/blackburn-vs-green" },
  { state: "TX", path: "polls/governor/general/2026/texas/abbott-vs-hinojosa" },
  { state: "WI", path: "polls/governor/general/2026/wisconsin/crowley-vs-tiffany" },
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

  const name = STATE_NAME[race.state] ?? race.state;
  const yr = race.year ?? 2026;
  const yrPrefix = yr === 2026 ? "" : `${yr} `;
  const title =
    race.office === "governor"
      ? `${yrPrefix}${name} Governor`
      : `${yrPrefix}${name} Senate${race.special ? " (special)" : ""}`;
  return {
    raceType: race.office === "governor" ? "governor" : "senate",
    state: race.state,
    ...(yr === 2026 ? {} : { year: yr }),
    ...(race.office === "governor"
      ? {}
      : { seatClass: race.seatClass, special: race.special }),
    title,
    candidates: cols.map((c) => ({ name: c.name, party: c.party })),
    aggregateAverage,
    polls: latestPerPollster(polls),
    source: "RealClearPolling",
    lastPulled: new Date().toISOString().slice(0, 10),
  };
}

/** Keep only each pollster's most recent poll -- one stale Emerson from March
 *  isn't telling you anything the August Emerson isn't. */
function latestPerPollster(polls) {
  const byPollster = new Map();
  for (const p of polls) {
    const key = p.pollster.toLowerCase();
    const kept = byPollster.get(key);
    if (!kept || p.endDate > kept.endDate) byPollster.set(key, p);
  }
  return [...byPollster.values()].sort((a, b) =>
    b.endDate.localeCompare(a.endDate)
  );
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
  const queue = [
    ...RACES.map((r) => ({ ...r, office: "senate" })),
    ...GOV_RACES.map((r) => ({ ...r, office: "governor" })),
    ...(process.env.PULL_SKIP_HISTORICAL === "1" ? [] : HIST_RACES),
  ];
  for (const race of queue) {
    try {
      const data = await scrapeRace(page, race);
      out.races.push(data);
      console.log(`✓ ${data.title}: ${data.polls.length} polls`);
    } catch (err) {
      failures += 1;
      console.error(`✗ ${race.state} ${race.office}: ${err.message}`);
    }
  }
  await ctx.close();

  if (out.races.length === 0) {
    console.error("\nNothing pulled. Leaving polls.generated.json untouched.");
    process.exit(1);
  }

  // Keep races that came from a fallback source (NYT, VoteHub) -- this script
  // only refreshes the RealClearPolling ones.
  try {
    const prev = JSON.parse(await readFile(OUT, "utf8"));
    for (const race of prev.races ?? []) {
      if (race.sourceNote && race.sourceNote !== "RealClearPolling") {
        out.races.push(race);
        console.log(`= kept ${race.title} (via ${race.sourceNote})`);
      }
    }
  } catch {
    // no previous file
  }

  out.races.sort(
    (a, b) =>
      a.raceType.localeCompare(b.raceType) ||
      (STATE_NAME[a.state] ?? a.state).localeCompare(
        STATE_NAME[b.state] ?? b.state
      ) || (a.district ?? 0) - (b.district ?? 0)
  );
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${out.races.length}/${queue.length} race(s) to ${OUT}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
