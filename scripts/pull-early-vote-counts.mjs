#!/usr/bin/env node
/**
 * Pulls per-state early-vote COUNTS (ballots cast before Election Day) for the
 * 2026 general, plus final early-vote totals from past cycles to compare
 * against. Feeds the map's "2026 Early Vote" tab.
 *
 *   pnpm earlyvoting:counts
 *
 * Sources (all public, no key):
 *   - 2026 + 2024: the University of Florida Election Lab (Michael McDonald),
 *     which backs election.lab.ufl.edu/early-vote/. Its dashboard loads one
 *     CSV per cycle -- /data-downloads/earlyvote/<year>/US.csv -- with mail
 *     ballots requested / returned, in-person early, and total voted, split by
 *     party registration where the state reports party. The 2026 file also
 *     carries each state's total 2022 turnout (`turn_2022`), the midterm
 *     baseline for "% of the electorate that has voted"; the 2024 file is the
 *     near-final 2024 count and carries 2020 total turnout (`turn_2020`).
 *   - 2020: McDonald's older US Elections Project site
 *     (electproject.github.io/Early-Vote-2020G), whose index page embeds the
 *     final per-state numbers in a highcharter widget's JSON.
 *   - 2016: the Election Lab's Google Sheet of the 2016 advance-turnout report
 *     (linked from election.lab.ufl.edu/early-vote/).
 *
 * No per-state 2018 or 2022 early-vote file is published anywhere we've found
 * (the 2022 report is national-only), so those cycles are compared through
 * total turnout instead.
 *
 * TargetSmart's TargetEarly (modeled party for every state) was tried as a
 * second source but sits behind a Cloudflare block (HTTP 403), same as RCP.
 *
 * Re-fetches everything on each run -- the Election Lab updates daily through
 * Election Day. Writes app/data/earlyVoteCounts.generated.json.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { townKey } from "./lib/town-key.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT_PATH = resolve(root, "app/data/earlyVoteCounts.generated.json");
// County rows are big enough to keep out of the Worker bundle, so they go next
// to the county geometry and are fetched at runtime (see app/lib/stateGeo.ts).
const COUNTY_OUT_PATH = resolve(root, "app/data/geo/earlyvote-2026-counties.json");
const GEO_DIR = resolve(root, "app/data/geo");
const THEO_PAGE = "https://theoelections.com/early-vote";
// ElectIndex's tracker repo: one row per state per day, 2020-2026, mostly
// from the state election offices (source_tier 1).
const ELECTINDEX_DAILY = "https://raw.githubusercontent.com/ElectIndex/26_early_vote/HEAD/output/ev_state_daily.csv";
const ELECTION_DAY_2026 = Date.UTC(2026, 10, 3);

const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const UF = "https://election.lab.ufl.edu/data-downloads/earlyvote";
const EV_2020_PAGE = "https://electproject.github.io/Early-Vote-2020G/index.html";
const SHEET_2016 =
  "https://docs.google.com/spreadsheets/d/1fz_V3oAUL8XJMEudq5wm5hDT_f554uagt6sIm_sJDro/export?format=csv";

async function fetchText(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 politicsplace" } });
    if (res.ok) return res.text();
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    throw new Error(`${url}: HTTP ${res.status}`);
  }
  throw new Error(`${url}: gave up after retries`);
}

/** Minimal RFC-4180 CSV parser -- the UF notes column has quoted commas and
 *  doubled quotes, so a split(",") isn't enough. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ""));
}

/** CSV text -> array of { header: value } objects. */
function csvObjects(text) {
  const [header, ...rows] = parseCsv(text);
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const num = (v) => {
  const n = Number(String(v ?? "").replace(/[,%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
/** 0 in the UF files means "not reported", not "zero ballots". */
const orNull = (n) => (n > 0 ? n : null);

/** "10/24/2026" -> "2026-10-24" */
function isoDate(mdy) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(mdy ?? "");
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}

function partySplit(row, prefix) {
  const dem = num(row[`${prefix}_dem`]);
  const rep = num(row[`${prefix}_rep`]);
  const none = num(row[`${prefix}_none`]);
  // States without party registration report all-zero party columns.
  return dem + rep > 0 ? { dem, rep, other: none } : null;
}

async function pull2026() {
  const rows = csvObjects(await fetchText(`${UF}/2026/US.csv`));
  const out = {};
  for (const r of rows) {
    const usps = r.state_abbv;
    if (!usps) continue;
    out[usps] = {
      voted: num(r.voted_all),
      mailReturned: orNull(num(r.accept_all)),
      inPerson: orNull(num(r.inperson_all)),
      mailRequested: orNull(num(r.request_all)),
      party: partySplit(r, "voted"),
      mailRequestedParty: partySplit(r, "request"),
      turnout2022: orNull(num(r.turn_2022)),
      lastUpdate: isoDate(r.last_update),
      source: r.data_source || null,
      notes: r.notes && r.notes !== "NA" ? r.notes : null,
    };
  }
  return out;
}

async function pull2024() {
  const rows = csvObjects(await fetchText(`${UF}/2024/US.csv`));
  const out = {};
  for (const r of rows) {
    if (!r.state_abbv) continue;
    out[r.state_abbv] = {
      voted: orNull(num(r.voted_all)),
      party: partySplit(r, "voted"),
      turnout2020: orNull(num(r.turn_2020)),
      asOf: isoDate(r.last_update),
    };
  }
  return out;
}

async function pull2020() {
  const html = await fetchText(EV_2020_PAGE);
  const out = {};
  for (const [, json] of html.matchAll(
    /<script type="application\/json" data-for="[^"]+">([\s\S]*?)<\/script>/g
  )) {
    const series = JSON.parse(json).x?.hc_opts?.series ?? [];
    if (!series[0]?.data?.[0]?.total_early_2020) continue;
    for (const d of series[0].data) {
      out[d.state] = {
        voted: orNull(num(d.total_early_2020)),
        turnout2016: orNull(num(d.total_ballots_2016)),
        asOf: isoDate(d.report_date),
      };
    }
    break;
  }
  return out;
}

async function pull2016() {
  const rows = parseCsv(await fetchText(SHEET_2016));
  // Two title rows, then the real header ("State, CD, Source, ...").
  const headerAt = rows.findIndex((r) => r[0] === "State");
  const header = rows[headerAt];
  const totalCol = header.indexOf("Total Advance");
  const asOfCol = header.indexOf("As of");
  const out = {};
  for (const r of rows.slice(headerAt + 1)) {
    // Rows with a CD are congressional-district breakouts, not the state.
    if (!/^[A-Z]{2}$/.test(r[0]) || r[1]) continue;
    const voted = orNull(num(r[totalCol]));
    // "As of" is month/day with no year ("11/6").
    if (voted) out[r[0]] = { voted, asOf: isoDate(`${r[asOfCol]}/2016`) };
  }
  return out;
}

/**
 * Texas statewide totals from theoelections.com. Its data files sit behind
 * Cloudflare and refuse scripted requests, but the statewide figures are
 * printed in the page's own HTML, so read those -- statewide only. (The page
 * also splits voters by past primary; that isn't party registration, so it's
 * not used.) Returns null when the page can't be read or its wording changes.
 */
async function pullTexasTotals() {
  const html = await fetchText(THEO_PAGE);
  const tpl = /<template data-big="0">([\s\S]*?)<\/template>/.exec(html);
  if (!tpl) return null;
  const text = tpl[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const asOf = /as of ([A-Z][a-z]{2} \d{1,2}, \d{4})/.exec(html)?.[1] ?? null;
  // Its totals header: "4,251,983 total 4,036,642 in person 215,341 by mail".
  const t = /([\d,]+) total ([\d,]+) in person ([\d,]+) by mail/.exec(text);
  return t ? { asOf, totals: { voted: num(t[1]), inPerson: num(t[2]), mail: num(t[3]) } } : null;
}

/**
 * Ohio's early ballots by county from the Secretary of State's Absentee and
 * Early Voting dashboard (data.ohiosos.gov/portal/election-dashboards). The
 * portal page is behind Cloudflare, but the dashboard is a public Power BI
 * report whose data API (Microsoft's, not the state's) answers plain
 * requests, so query it directly: one query for every county. Refreshed daily
 * around noon. (The dashboard also has a "voter-affiliated party" from past
 * primaries; Ohio has no party registration, so that isn't used.)
 *
 * Model, dataset and report ids come from the report's own
 * modelsAndExploration response each run, so a republished report still
 * works as long as the table and column names hold.
 */
const OH_PBI_KEY = "69e1004e-3cb9-41b1-b23c-b3d80f4afdb4"; // the `k` in the dashboard's public link
const OH_PBI_API = "https://wabi-us-gov-iowa-api.analysis.usgovcloudapi.net/public/reports";
const OH_PBI_TABLE = "absentee v_detailed_grouped";
const OH_ELECTION = "2026 NOV GENERAL";

async function pbiPost(path, body) {
  const res = await fetch(`${OH_PBI_API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-PowerBI-ResourceKey": OH_PBI_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ohio SOS Power BI ${path}: HTTP ${res.status}`);
  return res.json();
}

/** Decode a Power BI data-shape result: rows repeat earlier values (bitmask
 *  `R`), mark nulls (bitmask `Ø`), and store strings in value dictionaries. */
function pbiRows(json) {
  const data = json.results[0].result.data;
  const ds = data.dsr.DS[0];
  const names = data.descriptor.Select.map((s) => s.Name.replace(/^(Sum\()?a\.|\)$/g, ""));
  let schema = null;
  let prev = [];
  const out = [];
  for (const row of ds.PH[0].DM0) {
    if (row.S) schema = row.S;
    const vals = [];
    let ci = 0;
    for (let i = 0; i < schema.length; i++) {
      if (row.R & (1 << i)) vals.push(prev[i]);
      else if (row["Ø"] & (1 << i)) vals.push(null);
      else {
        const v = row.C[ci++];
        vals.push(schema[i].DN && typeof v === "number" ? ds.ValueDicts[schema[i].DN][v] : v);
      }
    }
    prev = vals;
    out.push(Object.fromEntries(names.map((n, i) => [n, vals[i]])));
  }
  return out;
}

async function pullOhioSos() {
  const meta = await (
    await fetch(`${OH_PBI_API}/${OH_PBI_KEY}/modelsAndExploration?preferReadOnlySession=true`, {
      headers: { "X-PowerBI-ResourceKey": OH_PBI_KEY },
    })
  ).json();
  const model = meta.models[0];
  const ref = (p) => ({ Column: { Expression: { SourceRef: { Source: "a" } }, Property: p } });
  const groups = ["County_Name", "REFRESH_DATE"];
  const sums = ["BALLOTS_RECEIVED_INCL_EIP", "BALLOTS_RECEIVED_EIP", "BALLOTS_RECEIVED_NO_EIP", "BALLOTS_SENT_NO_EIP"];
  const select = [
    ...groups.map((p) => ({ ...ref(p), Name: `a.${p}` })),
    ...sums.map((p) => ({ Aggregation: { Expression: ref(p), Function: 0 }, Name: `Sum(a.${p})` })),
  ];
  const json = await pbiPost("querydata?synchronous=true", {
    version: "1.0.0",
    queries: [
      {
        Query: {
          Commands: [
            {
              SemanticQueryDataShapeCommand: {
                Query: {
                  Version: 2,
                  From: [{ Name: "a", Entity: OH_PBI_TABLE, Type: 0 }],
                  Select: select,
                  Where: [
                    {
                      Condition: {
                        In: {
                          Expressions: [ref("Election_Description")],
                          Values: [[{ Literal: { Value: `'${OH_ELECTION}'` } }]],
                        },
                      },
                    },
                  ],
                },
                Binding: {
                  Primary: { Groupings: [{ Projections: select.map((_, i) => i) }] },
                  DataReduction: { DataVolume: 4, Primary: { Window: { Count: 30000 } } },
                  Version: 1,
                },
              },
            },
          ],
        },
        QueryId: "",
        ApplicationContext: { DatasetId: model.dbName, Sources: [{ ReportId: meta.exploration.report.objectId }] },
      },
    ],
    cancelQueries: [],
    modelId: model.id,
  });

  const counties = {};
  const totals = { voted: 0, inPerson: 0, mailReturned: 0, mailRequested: 0 };
  let refreshed = 0;
  for (const r of pbiRows(json)) {
    if (!r.County_Name) continue;
    refreshed = Math.max(refreshed, r.REFRESH_DATE ?? 0);
    const c = (counties[r.County_Name] ??= { v: 0, i: 0, m: 0, r: 0 });
    c.v += r.BALLOTS_RECEIVED_INCL_EIP ?? 0;
    c.i += r.BALLOTS_RECEIVED_EIP ?? 0;
    c.m += r.BALLOTS_RECEIVED_NO_EIP ?? 0;
    c.r += r.BALLOTS_SENT_NO_EIP ?? 0;
  }
  for (const c of Object.values(counties)) {
    totals.voted += c.v;
    totals.inPerson += c.i;
    totals.mailReturned += c.m;
    totals.mailRequested += c.r;
  }
  if (!(totals.voted > 0)) return null;
  const asOf = refreshed ? new Date(refreshed).toISOString().slice(0, 10) : null;
  return { totals, counties, asOf };
}

/** Ohio SOS county rows -> the county map's shape, keyed by FIPS. */
function ohioCountyRows(ohio) {
  const index = countyIndex("OH");
  if (!index) return null;
  const out = {};
  for (const [name, c] of Object.entries(ohio.counties)) {
    const fips = index.get(countyKey(name))?.[0];
    if (fips) out[fips] = { n: name, ...c };
  }
  return Object.keys(out).length >= 80 ? out : null;
}

/**
 * On Point Politics' early-vote map (onpointpolitics.us/maps/early-vote) is a
 * Next.js page whose server-rendered flight payload carries one record per
 * state: `pm` is its party model -- reported party shares where a state
 * publishes party, On Point Polling's modeled shares (`est: 1`) where it
 * doesn't -- plus the 2022 final early vote (`e22`) and the same-day pace
 * against 2022 and 2024 (`pace22` / `pace24`, 2026 so far ÷ that cycle at the
 * same number of days out). Used only where a state has no reported party, and
 * for the 2022 / same-day comparisons UF doesn't publish per state.
 */
/**
 * 2022 cumulative early vote by days before Election Day, per state, from
 * ElectIndex: { OR: { 8: 590337, ... } }. Fills the "vs same day '22" figure
 * for states On Point has no 2022 pace for.
 */
async function pull2022Daily() {
  const [head, ...lines] = (await fetchText(ELECTINDEX_DAILY)).trim().split(/\r?\n/);
  const col = Object.fromEntries(head.split(",").map((k, i) => [k, i]));
  const out = {};
  for (const line of lines) {
    const r = line.split(",");
    const total = num(r[col.ballots_total]);
    if (r[col.cycle] !== "2022" || !(total > 0)) continue;
    (out[r[col.state]] ??= {})[Number(r[col.days_to_election])] = total;
  }
  return out;
}

async function pullOnPoint() {
  const html = await fetchText("https://onpointpolitics.us/maps/early-vote");
  let flight = "";
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
    flight += JSON.parse(`"${m[1]}"`);
  }
  const out = {};
  let i = 0;
  while ((i = flight.indexOf('{"st":"', i)) >= 0) {
    // Find the record's closing brace (string-aware bracket count).
    let depth = 0, j = i, inStr = false;
    for (; j < flight.length; j++) {
      const c = flight[j];
      if (inStr) {
        if (c === "\\") j++;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) break;
    }
    try {
      const r = JSON.parse(flight.slice(i, j + 1));
      if (r.st && r.pm) out[r.st] = r;
    } catch {
      // a fragment that isn't a whole record -- skip
    }
    i = j + 1;
  }
  return out;
}

// ── County level ─────────────────────────────────────────────────────────

/** "ACCOMACK COUNTY" / "St. Mary's" / "Hawai'i" -> a comparable key. */
const countyKey = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(county|parish|borough|census area|municipality|city and borough)\b/g, "")
    .replace(/\bsaint\b/g, "st")
    .replace(/[^a-z]/g, "");

/** Name -> FIPS lookup for one state, from the app's own county geometry, so
 *  every row we keep lines up with a shape the map can draw. */
function countyIndex(usps) {
  const path = resolve(GEO_DIR, `${usps}.json`);
  if (!existsSync(path)) return null;
  const { counties } = JSON.parse(readFileSync(path, "utf8"));
  const byKey = new Map();
  for (const c of counties) {
    const k = countyKey(c.name);
    byKey.set(k, [...(byKey.get(k) ?? []), c.fips]);
  }
  return byKey;
}

/** FIPS -> county name for one state, from the same geometry file. */
function countyNames(usps) {
  const { counties } = JSON.parse(readFileSync(resolve(GEO_DIR, `${usps}.json`), "utf8"));
  return Object.fromEntries(counties.map((c) => [c.fips, c.name]));
}

/** Independent cities (VA, MO's St. Louis, MD's Baltimore) share a name with a
 *  county; their FIPS county codes are 500+, so "X city" takes the 500+ one. */
function pickFips(candidates, rawName) {
  if (candidates.length === 1) return candidates[0];
  const isCity = /\bcity\b/i.test(rawName);
  return candidates.find((f) => (Number(f.slice(2)) >= 500) === isCity) ?? candidates[0];
}

/** Chicago reports apart from suburban Cook; fold it in so Cook is whole. */
const COUNTY_ALIASES = { IL: { cityofchicago: "cook", chicago: "cook" } };

/** UF reports CT, ME, MA, RI and VT by town; this rolls towns up into their
 *  counties (built by scripts/build-town-county.mjs from Census data). */
const TOWN_COUNTY = JSON.parse(readFileSync(resolve(root, "scripts/data/town-county.json"), "utf8"));

/** States with no party registration whose own counts are in hand. A
 *  past-primary split isn't party, and a model isn't needed with real
 *  counts, so these show counts only, with a note. */
const NO_PARTY = ["GA", "OH", "TX"];

async function pullCounties(usps) {
  const index = countyIndex(usps);
  if (!index) return null;
  let text;
  try {
    text = await fetchText(`${UF}/2026/${usps}_county.csv`);
  } catch {
    return null;
  }
  if (text.trimStart().startsWith("<")) return null;
  const rows = csvObjects(text);
  const towns = TOWN_COUNTY[usps];
  const out = {};
  let unmatched = 0;
  for (const r of rows) {
    const raw = r.county ?? "";
    let fips;
    if (towns) {
      fips = towns[townKey(raw)];
    } else {
      let key = countyKey(raw.replace(/\bcity\b/i, ""));
      key = COUNTY_ALIASES[usps]?.[key] ?? key;
      const candidates = index.get(key) ?? index.get(countyKey(raw));
      if (candidates) fips = pickFips(candidates, raw);
    }
    if (!fips) {
      unmatched += 1;
      continue;
    }
    const voted = num(r.voted_all) || num(r.accept_all) + num(r.inperson_all);
    // Party: the voted_* split when present, else mail + in-person added up.
    let dem = num(r.voted_dem), rep = num(r.voted_rep), none = num(r.voted_none);
    if (dem + rep === 0) {
      dem = num(r.accept_dem) + num(r.inperson_dem);
      rep = num(r.accept_rep) + num(r.inperson_rep);
      none = num(r.accept_none) + num(r.inperson_none);
    }
    const prev = out[fips];
    const add = (a, b) => (a ?? 0) + b;
    out[fips] = {
      n: prev?.n ?? (towns ? countyNames(usps)[fips] : raw),
      v: add(prev?.v, voted),
      m: add(prev?.m, num(r.accept_all)),
      i: add(prev?.i, num(r.inperson_all)),
      r: add(prev?.r, num(r.request_all)),
      p:
        dem + rep > 0 || prev?.p
          ? [add(prev?.p?.[0], dem), add(prev?.p?.[1], rep), add(prev?.p?.[2], none)]
          : null,
    };
  }
  // Keep a state only when most of its rows matched a county.
  const matched = rows.length - unmatched;
  if (Object.keys(out).length === 0 || unmatched > matched)
    return { usps, skipped: true, rows: rows.length, unmatched };
  return { usps, counties: out, unmatched };
}

async function main() {
  const [y2026, y2024, y2020, y2016, txTotals, onPoint, daily2022, ohio] = await Promise.all([
    pull2026(),
    pull2024(),
    pull2020().catch((e) => (console.warn(`2020 skipped: ${e.message}`), {})),
    pull2016().catch((e) => (console.warn(`2016 skipped: ${e.message}`), {})),
    pullTexasTotals().catch((e) => (console.warn(`TX theoelections totals skipped: ${e.message}`), null)),
    pullOnPoint().catch((e) => (console.warn(`On Point skipped: ${e.message}`), {})),
    pull2022Daily().catch((e) => (console.warn(`ElectIndex 2022 daily skipped: ${e.message}`), {})),
    pullOhioSos().catch((e) => (console.warn(`Ohio SOS skipped: ${e.message}`), null)),
  ]);

  // Party where the state reports registration (UF), else On Point's model --
  // except NO_PARTY states, which show counts only.
  for (const s of Object.values(y2026)) s.partyBasis = s.party ? "registration" : null;
  // Texas totals from theoelections when its page has them: UF's copy of the
  // state roster trails the county reports (2026-10-26: 4.17M vs 4.25M). UF's
  // numbers stay as the fallback. Its counties (the county map) still sum to
  // UF's total -- theoelections is statewide only.
  const tx = txTotals?.totals;
  if (tx?.voted > 0 && y2026.TX) {
    Object.assign(y2026.TX, {
      voted: tx.voted,
      inPerson: tx.inPerson,
      mailReturned: tx.mail,
      mailRequested: null, // Texas doesn't report requests
      source: "https://theoelections.com/early-vote",
    });
    if (txTotals.asOf) y2026.TX.lastUpdate = new Date(`${txTotals.asOf} UTC`).toISOString().slice(0, 10);
  }
  // Ohio's totals come from the SOS, same reason: UF's copy trails the state
  // (2026-10-28: 1.19M vs 1.29M), and its county rows add up to them.
  if (ohio && y2026.OH) {
    Object.assign(y2026.OH, ohio.totals, {
      source: "https://data.ohiosos.gov/portal/election-dashboards",
      notes: null,
    });
    if (ohio.asOf) y2026.OH.lastUpdate = ohio.asOf;
  }
  for (const usps of NO_PARTY) {
    if (y2026[usps]) Object.assign(y2026[usps], { party: null, partyBasis: null, partySource: null, noParty: true });
  }
  let modeled = 0;
  for (const [usps, s] of Object.entries(y2026)) {
    const op = onPoint[usps];
    if (!op) continue;
    // 2026 so far as a share of the same point in 2022 / 2024.
    s.sameDay = { 2022: op.pace22 ?? null, 2024: op.pace24 ?? null };
    if (!s.party && !s.noParty && s.voted > 0 && op.pm?.est === 1) {
      s.party = {
        dem: Math.round(op.pm.d * s.voted),
        rep: Math.round(op.pm.r * s.voted),
        other: Math.round(op.pm.o * s.voted),
      };
      s.partyBasis = "modeled";
      s.partySource = "On Point Polling";
      modeled += 1;
    }
  }

  // No On Point 2022 pace: compare against ElectIndex's 2022 count at the
  // same number of days out as this state's own 2026 as-of date (exact day
  // only -- no interpolating).
  const filled22 = [];
  for (const [usps, s] of Object.entries(y2026)) {
    if (s.sameDay?.[2022] || !(s.voted > 0) || !s.lastUpdate) continue;
    const daysOut = Math.round((ELECTION_DAY_2026 - Date.parse(s.lastUpdate)) / 864e5);
    const then = daily2022[usps]?.[daysOut];
    if (!then) continue;
    s.sameDay = { 2022: s.voted / then, 2024: s.sameDay?.[2024] ?? null, source2022: "ElectIndex" };
    filled22.push(usps);
  }

  // Counties, a few states at a time to stay polite.
  const countyByState = {};
  const countyReport = [];
  for (let i = 0; i < STATES.length; i += 6) {
    const batch = await Promise.all(STATES.slice(i, i + 6).map(pullCounties));
    for (const res of batch) {
      if (!res) continue;
      if (res.skipped) {
        countyReport.push(`${res.usps} skipped (${res.unmatched}/${res.rows} rows not counties)`);
        continue;
      }
      countyByState[res.usps] = res.counties;
      countyReport.push(
        `${res.usps} ${Object.keys(res.counties).length}${res.unmatched ? ` (-${res.unmatched})` : ""}`
      );
    }
  }
  // Ohio's counties from the SOS too, so they sum to the statewide total.
  const ohCounties = ohio && ohioCountyRows(ohio);
  if (ohCounties) countyByState.OH = ohCounties;
  // No party in the NO_PARTY states' county rows either.
  for (const usps of NO_PARTY) for (const row of Object.values(countyByState[usps] ?? {})) row.p = null;
  // Drop a state whose county rows cover well under its statewide total --
  // Connecticut's town file has mail ballots only (2026-10-28: 39K of 238K),
  // which would make every county look far behind.
  for (const [usps, rows] of Object.entries(countyByState)) {
    const total = y2026[usps]?.voted;
    const sum = Object.values(rows).reduce((a, r) => a + r.v, 0);
    if (total > 0 && sum < 0.5 * total) {
      delete countyByState[usps];
      countyReport.push(`${usps} dropped (counties sum to ${Math.round((100 * sum) / total)}% of state)`);
    }
  }
  writeFileSync(
    COUNTY_OUT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), byState: countyByState })
  );

  const states = new Set([...Object.keys(y2026), ...Object.keys(y2024)]);
  const byState = {};
  for (const usps of [...states].sort()) {
    byState[usps] = {
      current: y2026[usps] ?? null,
      past: {
        2024: y2024[usps] ?? null,
        // On Point's 2022 final early vote (some states rounded); UF has no
        // per-state 2022 file.
        2022: onPoint[usps]?.e22 ? { voted: onPoint[usps].e22, asOf: null } : null,
        2020: y2020[usps] ?? null,
        2016: y2016[usps] ?? null,
      },
    };
  }

  const reporting = Object.values(y2026).filter((s) => s.voted > 0);
  const total = reporting.reduce((a, s) => a + s.voted, 0);
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source:
          "University of Florida Election Lab (2026, 2024), US Elections Project (2020), Election Lab 2016 advance-turnout sheet",
        statesReporting: reporting.length,
        totalVoted: total,
        byState,
      },
      null,
      2
    )
  );
  console.log(
    `${reporting.length} states reporting, ${total.toLocaleString()} early ballots cast so far.`
  );
  console.log(
    `Past cycles: 2024 ${Object.keys(y2024).length} states, 2020 ${Object.keys(y2020).length}, 2016 ${Object.keys(y2016).length}.`
  );
  console.log(
    `TX: totals from ${
      tx?.voted > 0 ? `theoelections (as of ${txTotals.asOf})` : "UF (theoelections had none)"
    }; no party.`
  );
  console.log(
    ohio
      ? `OH: totals from the Secretary of State (as of ${ohio.asOf}), ${
          ohCounties ? Object.keys(ohCounties).length : "no"
        } counties; no party.`
      : "OH: Secretary of State not available; UF totals."
  );
  console.log(`On Point: ${Object.keys(onPoint).length} states read, ${modeled} given modeled party.`);
  console.log(`2022 same-day from ElectIndex: ${filled22.join(", ") || "none"}.`);
  console.log(`Counties: ${countyReport.join(", ")}`);
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Wrote ${COUNTY_OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
