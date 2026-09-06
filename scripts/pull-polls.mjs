#!/usr/bin/env node
/**
 * Pull the latest polling data from RealClearPolling and write it to
 * app/data/polls.generated.json (which app/data/polls.ts merges over the
 * hand-seeded examples).
 *
 * Run: pnpm polls:pull
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STATUS: RealClearPolling actively blocks non-browser clients.
 *   - A plain server-side fetch of a race page returns HTTP 403.
 *   - The site is a Next.js app; when a page *does* load, the poll data is
 *     in the <script id="__NEXT_DATA__"> blob (see parseNextData below).
 *
 * This script tries a browser-like fetch first. If RCP keeps 403-ing, the
 * options are:
 *   1. Run it behind a headless browser (add `playwright`, load the page,
 *      read `__NEXT_DATA__` from the rendered DOM).
 *   2. Point RACES[].url at a mirror / your own copy.
 *   3. Keep editing app/data/polls.ts by hand for now.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../app/data/polls.generated.json");

/**
 * Races to pull. Add entries here as coverage expands (House needs `district`,
 * governor uses raceType "governor", etc). `rcpPath` is the path under
 * https://www.realclearpolling.com/ .
 */
const RACES = [
  {
    raceType: "senate",
    state: "OH",
    seatClass: 3,
    special: true,
    title: "Ohio Senate (special)",
    candidates: [
      { name: "Jon Husted", party: "R", incumbent: true },
      { name: "Sherrod Brown", party: "D" },
    ],
    // TODO: confirm the real RCP slug for this race.
    rcpPath: "polls/senate/2026/ohio",
  },
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

async function fetchPage(path) {
  const url = `https://www.realclearpolling.com/${path}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/** Extract the Next.js data blob a RCP race page embeds. */
function parseNextData(html) {
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!m) throw new Error("no __NEXT_DATA__ in page");
  return JSON.parse(m[1]);
}

/**
 * Map RCP's poll objects to our Poll shape. RCP's exact field names shift; this
 * is written against the observed shape and logs whatever it can't map so the
 * selectors can be fixed quickly.
 */
function mapPolls(nextData, race) {
  // RCP nests the poll list a few levels into pageProps; probe common spots.
  const pp = nextData?.props?.pageProps ?? {};
  const candidates =
    pp?.poll?.polls ??
    pp?.race?.polls ??
    pp?.polls ??
    pp?.data?.polls ??
    [];
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("could not locate poll array in __NEXT_DATA__");
  }
  return candidates.map((p) => ({
    pollster: p.pollster ?? p.affiliation ?? p.name ?? "Unknown",
    startDate: (p.startDate ?? p.start_date ?? "").slice(0, 10),
    endDate: (p.endDate ?? p.end_date ?? p.date ?? "").slice(0, 10),
    sampleSize: p.sampleSize ?? p.sample_size ?? undefined,
    population: p.population ?? p.sampleType ?? undefined,
    url: p.link ?? p.url ?? undefined,
    results: (p.candidates ?? p.answers ?? p.results ?? []).map((c) => ({
      candidate: c.name ?? c.candidate ?? c.choice,
      party: (c.party ?? "O").toUpperCase().slice(0, 1),
      pct: Number(c.value ?? c.pct ?? c.percent),
    })),
  }));
}

async function main() {
  const now = new Date().toISOString().slice(0, 10);
  const out = { generatedAt: now, source: "RealClearPolling", races: [] };
  let failures = 0;

  for (const race of RACES) {
    const { rcpPath, ...meta } = race;
    try {
      const html = await fetchPage(rcpPath);
      const nextData = parseNextData(html);
      const polls = mapPolls(nextData, race);
      out.races.push({ ...meta, polls, source: "RealClearPolling", lastPulled: now });
      console.log(`✓ ${race.title}: ${polls.length} polls`);
    } catch (err) {
      failures += 1;
      console.error(`✗ ${race.title}: ${err.message}`);
    }
  }

  if (out.races.length === 0) {
    console.error(
      "\nNo races pulled. RCP is likely blocking this client (403).\n" +
        "See the header comment in scripts/pull-polls.mjs for options.\n" +
        "Leaving app/data/polls.generated.json untouched."
    );
    process.exit(failures > 0 ? 1 : 0);
  }

  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${out.races.length} race(s) to ${OUT}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
