#!/usr/bin/env node
/**
 * Import historical race-level polling from FiveThirtyEight's pollster-ratings
 * "raw-polls" database into app/data/polls.generated.json, so the Polls page's
 * office-average bar has comparison years.
 *
 *   node scripts/import-538-polls.mjs            # fetch the CSV, default years
 *   node scripts/import-538-polls.mjs raw.csv    # use a local copy
 *   YEARS=2018,2022 node scripts/import-538-polls.mjs
 *
 * Source: github.com/fivethirtyeight/data/pollster-ratings/2023/raw-polls.csv
 * (cumulative 1998-2022; no auth). Covers Senate (Sen-G), Governor (Gov-G) and
 * President (Pres-G). 538 shut down before 2024, so 2024 must come from the RCP
 * scraper or Wikipedia.
 *
 * These rows carry `source: "FiveThirtyEight"`; `pnpm polls:pull` keeps them
 * (it only refreshes RealClearPolling rows), and re-running this script replaces
 * them.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const OUT = resolve(root, "app/data/polls.generated.json");
const CSV_URL =
  "https://raw.githubusercontent.com/fivethirtyeight/data/master/pollster-ratings/2023/raw-polls.csv";

const YEARS = new Set(
  (process.env.YEARS ?? "2016,2018,2020,2022").split(",").map((s) => Number(s.trim()))
);

const STATE_NAME = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

const party = (p) => {
  const s = String(p || "").toUpperCase();
  if (s === "DEM" || s === "D") return "D";
  if (s === "REP" || s === "R") return "R";
  if (s === "IND" || s === "I" || s === "LIB" || s === "GRE") return "I";
  return "O";
};
const isoDate = (mdy) => {
  const m = String(mdy).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return "";
  const [, mo, d, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

// A raw-polls line: the trailing `comment` field can contain commas, but every
// field we read (0-24) is before it and never quoted / comma-bearing in 538's
// data, so a plain split is safe.
function parse(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const head = lines[0].split(",");
  const ix = (n) => head.indexOf(n);
  const I = {
    year: ix("year"), race: ix("race"), loc: ix("location"), type: ix("type_simple"),
    pollster: ix("pollster"), method: ix("methodology"), partisan: ix("partisan"),
    date: ix("polldate"), n: ix("samplesize"),
    c1n: ix("cand1_name"), c1p: ix("cand1_party"), c1v: ix("cand1_pct"),
    c2n: ix("cand2_name"), c2p: ix("cand2_party"), c2v: ix("cand2_pct"),
    edate: ix("electiondate"),
  };
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(",");
    rows.push({
      year: Number(f[I.year]),
      race: f[I.race],
      loc: f[I.loc],
      type: f[I.type],
      pollster: f[I.pollster],
      partisan: f[I.partisan],
      date: f[I.date],
      n: f[I.n],
      c1n: f[I.c1n], c1p: f[I.c1p], c1v: Number(f[I.c1v]),
      c2n: f[I.c2n], c2p: f[I.c2p], c2v: Number(f[I.c2v]),
      edate: f[I.edate],
    });
  }
  return rows;
}

const TYPE_TO_OFFICE = {
  "Sen-G": "senate",
  "Gov-G": "governor",
  "Pres-G": "president",
  "House-G": "house",
};

const CSV_CACHE = resolve(root, "scripts/data/raw-polls-538.csv");

async function main() {
  const local = process.argv[2];
  let csv;
  if (local && existsSync(local)) {
    csv = readFileSync(local, "utf8");
  } else {
    try {
      console.error(`fetching ${CSV_URL} …`);
      const res = await fetch(CSV_URL, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`538 CSV ${res.status}`);
      csv = await res.text();
      try {
        writeFileSync(CSV_CACHE, csv);
      } catch {}
    } catch (e) {
      // 538's data is frozen (they shut down in 2025), so a fetch failure is
      // non-fatal: use the last cached copy, or — if the output file already has
      // FiveThirtyEight rows — leave them alone and exit 0 so `polls:all` keeps
      // going to the Wikipedia + RCP legs.
      if (existsSync(CSV_CACHE)) {
        console.error(`  fetch failed (${e.message}); using cached ${CSV_CACHE}`);
        csv = readFileSync(CSV_CACHE, "utf8");
      } else {
        let has538 = false;
        try {
          has538 = (JSON.parse(readFileSync(OUT, "utf8")).races ?? []).some(
            (r) => r.source === "FiveThirtyEight"
          );
        } catch {}
        console.error(
          `  fetch failed (${e.message}); no cache. ` +
            (has538
              ? "Existing FiveThirtyEight rows kept — skipping."
              : "No 538 rows imported.")
        );
        process.exit(0);
      }
    }
  }

  const rows = parse(csv);
  // race key -> { raceType, state, year, title, candidates, polls }
  const races = new Map();
  let skipped = 0;

  for (const r of rows) {
    const office = TYPE_TO_OFFICE[r.type];
    if (!office || !YEARS.has(r.year)) continue;
    // election-year polls only (drops year-before noise)
    if (isoDate(r.date).slice(0, 4) !== String(r.year)) continue;
    // president: national head-to-head only
    if (office === "president" && r.loc !== "US") continue;
    const p1 = party(r.c1p);
    const p2 = party(r.c2p);
    // keep only clean D-vs-R matchups
    if (!((p1 === "D" && p2 === "R") || (p1 === "R" && p2 === "D"))) { skipped++; continue; }
    if (!Number.isFinite(r.c1v) || !Number.isFinite(r.c2v)) { skipped++; continue; }

    let state, district;
    if (office === "president") state = "US";
    else if (office === "house") {
      const [st, dist] = String(r.loc).split("-");
      state = st;
      district = Number(dist);
      if (!Number.isInteger(district)) { skipped++; continue; } // at-large / odd
    } else state = r.loc;

    const key = `${r.year}:${office}:${state}:${district ?? ""}`;
    if (!races.has(key)) {
      const title =
        office === "president"
          ? `${r.year} President`
          : office === "house"
          ? `${r.year} ${STATE_NAME[state] ?? state} ${district}${district === 1 ? "st" : district === 2 ? "nd" : district === 3 ? "rd" : "th"} District`
          : `${r.year} ${STATE_NAME[state] ?? state} ${office === "senate" ? "Senate" : "Governor"}`;
      races.set(key, {
        raceType: office,
        state,
        year: r.year,
        ...(district ? { district } : {}),
        title,
        candidates: [
          { name: r.c1n, party: p1 },
          { name: r.c2n, party: p2 },
        ],
        polls: [],
      });
    }
    const race = races.get(key);
    const end = isoDate(r.date);
    race.polls.push({
      pollster: r.pollster,
      startDate: end,
      endDate: end,
      ...(Number(r.n) ? { sampleSize: Number(r.n) } : {}),
      ...(r.partisan === "D" || r.partisan === "R" ? { partisan: r.partisan } : {}),
      results: [
        { candidate: r.c1n, party: p1, pct: r.c1v },
        { candidate: r.c2n, party: p2, pct: r.c2v },
      ],
    });
  }

  // pin each race's candidate order to the one its newest poll used, so the
  // Democrat is candidates[0] wherever possible (matches the RCP rows).
  const today = new Date().toISOString().slice(0, 10);
  const imported = [...races.values()]
    .filter((x) => x.polls.length > 0)
    .map((x) => {
      x.polls.sort((a, b) => b.endDate.localeCompare(a.endDate));
      const dFirst =
        x.candidates[0].party === "D"
          ? x.candidates
          : [x.candidates[1], x.candidates[0]];
      return {
        raceType: x.raceType,
        state: x.state,
        year: x.year,
        ...(x.district ? { district: x.district } : {}),
        title: x.title,
        candidates: dFirst,
        polls: x.polls,
        source: "FiveThirtyEight",
        sourceNote: "FiveThirtyEight",
        lastPulled: today,
      };
    });

  // merge: keep everything that isn't a prior 538 import
  let prev = { generatedAt: today, source: "RealClearPolling", races: [] };
  try { prev = JSON.parse(readFileSync(OUT, "utf8")); } catch {}
  const kept = (prev.races ?? []).filter((r) => r.source !== "FiveThirtyEight");
  const out = {
    ...prev,
    races: [...kept, ...imported].sort(
      (a, b) =>
        (a.year ?? 2026) - (b.year ?? 2026) ||
        a.raceType.localeCompare(b.raceType) ||
        a.state.localeCompare(b.state)
    ),
  };
  writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");

  const byYear = {};
  for (const r of imported) {
    const b = (byYear[r.year] ||= {});
    b[r.raceType] = (b[r.raceType] || 0) + 1;
  }
  console.error(
    `imported ${imported.length} races (${skipped} rows skipped):`
  );
  for (const [y, c] of Object.entries(byYear))
    console.error(
      `  ${y}: ` +
        ["senate", "governor", "house", "president"]
          .filter((o) => c[o])
          .map((o) => `${c[o]} ${o}`)
          .join(", ")
    );
  console.error(`kept ${kept.length} existing races -> ${out.races.length} total`);
}

main().catch((e) => { console.error(e); process.exit(1); });
