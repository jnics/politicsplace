#!/usr/bin/env node
/**
 * Import 2026 general-election polling from Wikipedia into
 * app/data/polls.generated.json.
 *
 *   node scripts/import-wikipedia-polls.mjs                 # all configured races
 *   node scripts/import-wikipedia-polls.mjs OH-7 GA-sen     # just these
 *
 * Wikipedia's election articles ("2026 United States House of Representatives
 * elections in <state>", "2026 United States Senate election in <state>",
 * "2026 <state> gubernatorial election") aggregate NYT / campaign / university
 * polls into wikitables. This script fetches each article's rendered HTML via
 * the MediaWiki `action=parse` API (no auth), finds the general-election
 * polling table, and parses its rows.
 *
 * Rows are written with `source: "Wikipedia"`. `pnpm polls:pull` (RCP) and
 * import-538-polls.mjs each keep only their own source's rows, so the three
 * importers compose. `app/data/polls.ts` merges pollsSeeded.ts under the
 * generated data, so a race the importer covers supersedes its hand seed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "app/data/polls.generated.json");

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
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const ORD = (n) =>
  `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

// ── race config ──────────────────────────────────────────────────────
// Each: id, raceType, state, [district], article, d (Democrat surname regex),
// r (Republican surname regex), dName / rName (display names).
const HOUSE = [
  ["OH", 1, "Landsman", "Conroy"], ["OH", 7, "Poindexter", "Miller"],
  ["OH", 9, "Kaptur", "Merrin"], ["OH", 10, "Knickerbocker", "Turner"],
  ["OH", 15, "Leonard", "Carey"],
  ["NC", 1, "Davis", "Buckhout"], ["NC", 3, "Smith", "Murphy"],
  ["NC", 7, "Hardy", "Rouzer"], ["NC", 10, "Bell", "Harrigan"],
  ["NC", 11, "Ager", "Edwards"], ["NC", 14, "Womack", "Moore"],
  ["MI", 4, "McCann", "Huizenga"], ["MI", 7, "Lawrence", "Barrett"],
  ["MI", 10, "Hines", "Bouchard"],
  ["PA", 1, "Harvie", "Fitzpatrick"], ["PA", 7, "Brooks", "Mackenzie"],
  ["PA", 8, "Cognetti", "Bresnahan"], ["PA", 10, "Stelson", "Perry"],
  ["AZ", 2, "Nez", "Crane"], ["AZ", 6, "Mendoza", "Ciscomani"],
  ["WI", 1, "Berman", "Steil"], ["WI", 3, "Cooke", "Van Orden"],
  ["WI", 6, "Smith", "Grothman"],
  ["NV", 2, "Benitez-Thompson", "Flippo"],
  ["TX", 15, "Pulido", "De La Cruz"], ["TX", 23, "Padilla Stout", "Herrera"],
  ["TX", 28, "Cuellar", "Tijerina"], ["TX", 34, "Gonzalez", "Flores"],
  ["TX", 35, "Garcia", "De La Cruz"],
  ["VA", 1, "Taylor", "Wittman"], ["VA", 2, "Luria", "Kiggans"],
  ["VA", 5, "Perriello", "McGuire"],
  ["NH", 2, "Goodlander", "Williams"],
  ["MN", 1, "Johnson", "Finstad"], ["MN", 2, "Little", "Pratt"],
  ["CO", 3, "Romero", "Hurd"], ["CO", 5, "Killin", "Crank"],
  ["NM", 2, "Vasquez", "Cunningham"],
  ["IA", 1, "Bohannan", "Miller-Meeks"], ["IA", 2, "James", "Mitchell"],
  ["IA", 3, "Trone Garriott", "Nunn"],
  ["ME", 2, "Dunlap", "LePage"],
  ["MT", 1, "Forstag", "Flint"],
  ["NE", 1, "Backemeyer", "Flood"],
  ["SC", 1, "Lacore", "Honeycutt"], ["SC", 7, "Vincent", "Fry"],
  ["IN", 5, "Ford", "Spartz"],
  ["WA", 3, "Gluesenkamp Perez", "Braun"], ["WA", 5, "Conroy", "Baumgartner"],
];

// Post-primary nominees as of 2026-09-11 (primaries run March-September; a few
// states — TN governor among them — hadn't finished as of this writing, so
// those stay on best-guess frontrunners and may return no general-election
// polling yet).
const SENATE = [
  // state, D surname, R surname, special (omit/false for a regular-cycle seat)
  ["ME", "Jackson", "Collins"], // Troy Jackson replaced Platner as the D nominee
  ["NC", "Cooper", "Whatley"],
  ["GA", "Ossoff", "Dooley|King|Carter"],
  ["MI", "El-Sayed", "Rogers"], // Whitmer is term-limited, not on this ballot
  ["TX", "Talarico", "Paxton"], // Paxton upset Cornyn in the May runoff
  // Ohio's only 2026 Senate race IS the special election for the seat J.D.
  // Vance vacated (became VP); Husted was appointed to hold it. Brown lost
  // re-election to his OTHER (regular, not-up-until-2030) seat in 2024 and
  // is challenging Husted for this one. Must be tagged special so its
  // raceKey doesn't collide with a stale non-special row for the same seat
  // (see the politicsplace-election-night / raceKey memory on this exact
  // collision class).
  ["OH", "Brown", "Husted|Moreno", true],
  ["MN", "Flanagan", "Tafoya"], // Smith retiring; not the MN governor race
  ["NH", "Pappas", "Sununu"],
  ["IA", "Hart|Wahls", "Ernst|Feenstra"],
  ["AK", "Galvin|Peltola", "Sullivan"],
  ["KY", "Booker", "Barr"], // McConnell retiring; Booker beat McGrath in the primary
  ["LA", "Davis", "Letlow"], // Cassidy lost/exited; Letlow is the GOP nominee
  ["SC", "Andrews", "Graham"], // Lindsey Graham died 2026-07-11; sister Darline Graham nominated
  ["FL", "Nixon", "Moody", true], // special election for Rubio's seat (he resigned to be Sec. of State)
  ["CO", "Hickenlooper", "Baisley"],
  ["NJ", "Booker", "Murphy"],
  ["NM", "Lujan", "Marker"], // Luján's seat, not Heinrich's — safe D, may have no polling
  ["MT", "Bankhead", "Alme"],
  ["NE", "Osborn", "Ricketts"],
  ["KS", "Hamilton", "Marshall"],
  ["AL", "Wess", "Moore"], // Tuberville left to run for governor
];

const GOV = [
  ["GA", "Bottoms|Esteves|Jordan", "Jones|Carr|Raffensperger"],
  ["MI", "Benson", "James"],
  ["PA", "Shapiro", "Garrity|Mastriano"],
  ["AZ", "Hobbs", "Robson|Biggs"],
  ["NV", "Ford", "Lombardo"],
  ["FL", "Jolly", "Donalds"],
  ["OH", "Acton", "Ramaswamy"],
  ["WI", "Crowley", "Tiffany"],
  ["KS", "Holscher", "Masterson"],
  ["ME", "Pingree", "Charles"],
  ["MN", "Klobuchar", "Demuth"], // Walz is term-limited, not on this ballot
  ["NM", "Haaland", "Hull"],
  ["SC", "Johnson", "Wilson"],
  ["CO", "Weiser", "Marx"],
  ["TX", "Hinojosa", "Abbott"],
  ["IA", "Sand", "Lahn"],
  ["NH", "Warmington", "Ayotte"],
  ["OK", "Munson", "Mazzei"],
  ["AL", "Jones", "Tuberville"], // rematch of the 2020 Senate race
  ["TN", "Green", "Blackburn"], // best-guess frontrunners; primary may not be final
];

const RE = (s) => (s === "N/A" ? null : new RegExp(`\\b(${s})\\b`, "i"));

const RACES = [
  ...HOUSE.map(([st, d, dn, rn]) => ({
    id: `${st}-${d}`,
    raceType: "house",
    state: st,
    district: d,
    article: `2026 United States House of Representatives elections in ${STATE_NAME[st]}`,
    section: `District ${d}`,
    d: RE(dn),
    r: RE(rn),
  })),
  ...SENATE.map(([st, dn, rn, special]) => ({
    id: `${st}-sen${special ? "-special" : ""}`,
    raceType: "senate",
    state: st,
    special: !!special,
    article: `2026 United States Senate election in ${STATE_NAME[st]}`,
    d: RE(dn),
    r: RE(rn),
  })),
  ...GOV.map(([st, dn, rn]) => ({
    id: `${st}-gov`,
    raceType: "governor",
    state: st,
    article: `2026 ${STATE_NAME[st]} gubernatorial election`,
    d: RE(dn),
    r: RE(rn),
  })),
];

// ── HTML helpers ─────────────────────────────────────────────────────
const decode = (s) =>
  s
    .replace(/<[^>]+>/g, " ") // tags -> space so "First<br>Last" -> "First Last"
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\[\s*\d+\s*\]/g, "") // footnote refs [12]
    .replace(/\[\s*[a-z]\s*\]/gi, "") // note refs [a]
    .replace(/\s+/g, " ")
    .trim();

const cellsOf = (rowHtml) =>
  (rowHtml.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi) || []).map((c) => ({
    text: decode(c),
    colspan: Number((c.match(/colspan="?(\d+)/i) || [])[1] || 1),
    raw: c,
  }));

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";

/** Last calendar date named in a "Feb 12–16, 2026" style string, as ISO. */
function endDate(s) {
  const clean = s.replace(/[–—]/g, "-");
  const year = (clean.match(/\b(20\d{2})\b/) || [])[1];
  if (!year) return null;
  const md = [...clean.matchAll(new RegExp(`(${MONTHS})\\.?\\s+(\\d{1,2})`, "gi"))];
  if (!md.length) return null;
  const last = md[md.length - 1];
  const d = new Date(`${last[1]} ${last[2]}, ${year}`);
  return Number.isNaN(+d) ? null : d.toISOString().slice(0, 10);
}

const AGG = /average|aggregat|rcp\b|270 ?to ?win|polling average|projection/i;

// Earliest field-end date kept for a 2026-cycle poll -- see the comment at
// its one call site in scrapeRace(). Historical (538) years are untouched;
// this only ever applies to raceType/state pairs pulled by THIS script.
const MIN_2026_POLL_DATE = "2026-07-01";

// ── per-race scrape ──────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const articleCache = new Map(); // title -> html | Error

async function fetchArticle(title) {
  if (articleCache.has(title)) {
    const v = articleCache.get(title);
    if (v instanceof Error) throw v;
    return v;
  }
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
    if (attempt) await sleep(3000 * 2 ** (attempt - 1)); // 3s,6s,12s,24s,48s
    let res;
    try {
      res = await fetch(url, {
        headers: { "user-agent": "politicsplace-poll-import/1.0 (github; local dev)" },
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
    articleCache.set(title, j.parse.text);
    return j.parse.text;
  }
  articleCache.set(title, lastErr);
  throw lastErr;
}

const CAND_D = /\((?:D|DEM|DFL|D-[A-Z]{2})\)/i;
const CAND_R = /\((?:R|REP|R-[A-Z]{2})\)/i;
const NAME_JUNK =
  /^(Other|Undecided|Margin|Lead|Spread|Sample ?size|Date|Poll source|Pollster|Marginof error|Generic|No opinion|Someone else|Neither)/i;
const stripParty = (s) => s.replace(/\s*\((?:D|R|I|L|G|DEM|REP|IND|DFL|D-[A-Z]{2}|R-[A-Z]{2})\)\s*/gi, " ").trim();

/** Parse every 2-way (one Democrat, one Republican) general-election polling
 *  wikitable in the article and merge the rows. */
function scrapeRace(html, race) {
  const tables = html.match(/<table[^>]*wikitable[\s\S]*?<\/table>/gi) || [];
  const seen = new Set();
  const polls = [];
  const dNames = {},
    rNames = {};

  for (const table of tables) {
    const rows = table.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
    if (rows.length < 2) continue;

    let headIx = -1;
    let cols = [];
    for (let i = 0; i < Math.min(rows.length, 4); i++) {
      const c = cellsOf(rows[i]);
      const joined = c.map((x) => x.text).join(" | ");
      if (/poll source|pollster|sample\s*size|margin\s*of\s*error/i.test(joined)) {
        headIx = i;
        cols = [];
        for (const h of c) for (let k = 0; k < h.colspan; k++) cols.push(h.text);
        break;
      }
    }
    if (headIx < 0) continue;

    // The race config's surname regexes identify the matchup — this scopes a
    // multi-district House article to one district and a Senate article to the
    // configured nominee(s), ignoring hypothetical-opponent tables.
    if (!race.d || !race.r) continue;
    let di = -1,
      ri = -1;
    cols.forEach((t, i) => {
      if (i < 3 || NAME_JUNK.test(t)) return;
      if (di < 0 && race.d.test(t) && !CAND_R.test(t)) di = i;
      if (ri < 0 && race.r.test(t) && !CAND_D.test(t)) ri = i;
    });
    if (di < 0 || ri < 0 || di === ri) continue;
    const dHdr = stripParty(cols[di]);
    const rHdr = stripParty(cols[ri]);
    dNames[dHdr] = (dNames[dHdr] || 0) + 1;
    rNames[rHdr] = (rNames[rHdr] || 0) + 1;

    for (const rowHtml of rows.slice(headIx + 1)) {
      const c = cellsOf(rowHtml);
      if (c.length < 4 || c[0].colspan > 2) continue;

      const pollsterRaw = c[0].text;
      if (!pollsterRaw || AGG.test(pollsterRaw) || /^\s*20\d\d\b/.test(pollsterRaw)) continue;

      const flat = [];
      for (const x of c) for (let k = 0; k < x.colspan; k++) flat.push(x.text);

      const dv = parseFloat(String(flat[di] || "").replace(/[^\d.]/g, ""));
      const rv = parseFloat(String(flat[ri] || "").replace(/[^\d.]/g, ""));
      if (!Number.isFinite(dv) || !Number.isFinite(rv) || dv > 100 || rv > 100) continue;
      // A real 2-way poll sums to ~80-100 (rest = undecided/other); a fragmented
      // multi-candidate table (WA/CA/LA top-two primaries, big-field early polls)
      // sums much lower — that D-vs-R split isn't meaningful.
      if (dv + rv < 65) continue;

      const end = endDate(flat[1] || "");
      if (!end) continue;
      // Drop stale pre-nominee/early-cycle polling for the current 2026
      // races — by September the real field is settled and a February
      // head-to-head (often against a different opponent, pre-primary) is
      // no longer representative. Specific to this cycle; reconsider the
      // cutoff for a future one, not a permanent "always skip Jan-Jun" rule.
      if (end < MIN_2026_POLL_DATE) continue;

      const key = `${pollsterRaw.toLowerCase().replace(/\W+/g, "")}|${end}|${dHdr}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const ss = String(flat[2] || "").match(/([\d,]{2,})\s*\(?\s*(LV|RV|A|V)?\)?/i);
      const size = ss ? Number(ss[1].replace(/,/g, "")) : 0;
      const pop = ss && /^(LV|RV|A)$/i.test(ss[2] || "") ? ss[2].toUpperCase() : undefined;

      const partisan = /\(\s*(D|DEM)\s*\)/i.test(pollsterRaw) || /house majority pac|\bdccc\b|\bdscc\b/i.test(pollsterRaw)
        ? "D"
        : /\(\s*(R|REP)\s*\)/i.test(pollsterRaw) || /\bnrcc\b|\bnrsc\b|\brga\b|\bsenate leadership fund\b/i.test(pollsterRaw)
        ? "R"
        : undefined;

      polls.push({
        pollster: stripParty(pollsterRaw).replace(/\s*\((?:D|R|DEM|REP)\)\s*/i, "").trim(),
        startDate: end,
        endDate: end,
        ...(size ? { sampleSize: size } : {}),
        ...(pop ? { population: pop } : {}),
        ...(partisan ? { partisan } : {}),
        results: [
          { candidate: dHdr, party: "D", pct: dv },
          { candidate: rHdr, party: "R", pct: rv },
        ],
      });
    }
  }

  const modal = (m) =>
    Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { polls, dName: modal(dNames), rName: modal(rNames) };
}

// ── main ─────────────────────────────────────────────────────────────
async function main() {
  const only = process.argv.slice(2);
  const wanted = only.length
    ? RACES.filter((r) => only.includes(r.id) || only.includes(r.state))
    : RACES;

  const today = new Date().toISOString().slice(0, 10);
  const imported = [];
  const misses = [];

  for (const race of wanted) {
    try {
      if (!articleCache.has(race.article)) await sleep(2500); // gentle on the API
      const html = await fetchArticle(race.article);
      const { polls, dName, rName } = scrapeRace(html, race);
      if (!polls.length) {
        misses.push(`${race.id} (no general poll table)`);
        continue;
      }
      polls.sort((a, b) => b.endDate.localeCompare(a.endDate));
      const title =
        race.raceType === "house"
          ? `${STATE_NAME[race.state]} ${ORD(race.district)} District`
          : `${STATE_NAME[race.state]} ${race.raceType === "senate" ? "Senate" : "Governor"}${
              race.special ? " (special)" : ""
            }`;
      imported.push({
        raceType: race.raceType,
        state: race.state,
        ...(race.district ? { district: race.district } : {}),
        ...(race.special ? { special: true } : {}),
        title,
        candidates: [
          { name: dName, party: "D" },
          { name: rName, party: "R" },
        ],
        polls,
        source: "Wikipedia",
        sourceNote: "Wikipedia",
        lastPulled: today,
      });
      process.stderr.write(`  ${race.id}: ${polls.length} polls\n`);
    } catch (e) {
      misses.push(`${race.id} (${e.message})`);
    }
  }

  let prev = { generatedAt: today, source: "Wikipedia + FiveThirtyEight", races: [] };
  try { prev = JSON.parse(readFileSync(OUT, "utf8")); } catch {}
  // Full run: drop every prior Wikipedia race. Subset run (id/state args): keep
  // the Wikipedia races this run didn't touch, so a targeted re-pull of a few
  // rate-limited races doesn't wipe the rest.
  const touched = new Set(
    wanted.map((r) => `${r.raceType}:${r.state}:${r.district ?? ""}`)
  );
  // A race that came back with no poll table this run keeps its previous
  // entry (often a zero-poll stub) instead of vanishing — pull-fundraising
  // reads its race list from this file.
  const got = new Set(
    imported.map((r) => `${r.raceType}:${r.state}:${r.district ?? ""}`)
  );
  const kept = (prev.races ?? []).filter((r) => {
    if (r.source !== "Wikipedia") return true;
    const key = `${r.raceType}:${r.state}:${r.district ?? ""}`;
    return touched.has(key) ? !got.has(key) : only.length > 0;
  });
  // Wikipedia is the only live source, so its run sets the page's "updated" date.
  const out = {
    ...prev,
    generatedAt: today,
    source: "Wikipedia + FiveThirtyEight",
    races: [...kept, ...imported].sort(
      (a, b) =>
        (a.year ?? 2026) - (b.year ?? 2026) ||
        a.raceType.localeCompare(b.raceType) ||
        a.state.localeCompare(b.state) ||
        (a.district ?? 0) - (b.district ?? 0)
    ),
  };
  writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");

  console.error(
    `\nWikipedia: ${imported.length} races (${imported.reduce((n, r) => n + r.polls.length, 0)} polls), ` +
      `kept ${kept.length} other-source races -> ${out.races.length} total`
  );
  if (misses.length) console.error(`no data: ${misses.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
