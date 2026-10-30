#!/usr/bin/env node
/**
 * Georgia early voters by past primary party, from the Secretary of State's
 * own voter files. Georgia has no party registration; its voter history
 * files record which party's ballot each voter took in a primary, keyed by
 * registration number, and its absentee file lists everyone who has voted
 * early (in person or by mail) with the same number. Joining the two gives
 * a D / R / other split like Texas's and Ohio's.
 *
 *   node scripts/build-ga-early-party.mjs <absentee zip> <history zip>...
 *
 * Both come from mvp.sos.ga.gov, which refuses scripted requests, so they're
 * downloaded by hand (or by Claude in Chrome):
 *   - absentee: /s/voter-absentee-files, election "NOVEMBER 3, 2026 - GENERAL
 *     AND SPECIAL ELECTIONS", all counties (~170 MB zip, updated daily);
 *   - history: /s/voter-history-files, one or more primaries, oldest first
 *     (a later primary overrides an earlier one for the same voter).
 *
 * Writes scripts/data/ga-early-party.json -- totals only, no voter rows:
 * { asOf, primaries, state: { voted, inPerson, mail, requested, dem, rep,
 * other }, counties: { NAME: { same } } }. Counts accepted ballots (status
 * "A"); "mail" includes electronic ballots for overseas voters; "requested"
 * is accepted mail applications; "other" is voters with no D or R primary
 * ballot on file. The early-vote pull reads it.
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = resolve(root, "scripts/data/ga-early-party.json");

const [absZip, ...histZips] = process.argv.slice(2);
if (!absZip || histZips.length === 0) {
  console.error("usage: node scripts/build-ga-early-party.mjs <absentee zip> <history zip>...");
  process.exit(1);
}

/** Lines of one CSV inside a zip (Git for Windows ships `unzip`). */
async function* zipLines(zip, member) {
  const child = spawn("unzip", ["-p", zip, ...(member ? [member] : [])]);
  yield* createInterface({ input: child.stdout, crlfDelay: Infinity });
}

function splitCsv(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function* rows(zip, member) {
  let idx = null;
  for await (const line of zipLines(zip, member)) {
    const f = splitCsv(line);
    if (!idx) {
      idx = Object.fromEntries(f.map((name, i) => [name.trim(), i]));
      continue;
    }
    yield (name) => f[idx[name]];
  }
}

const party = new Map(); // registration number -> "D" | "R"
const primaries = [];
for (const zip of histZips) {
  let date = null;
  for await (const get of rows(zip)) {
    date ??= get("Election Date");
    const p = get("Party");
    if (p === "DEMOCRAT") party.set(get("Voter Registration Number"), "D");
    else if (p === "REPUBLICAN") party.set(get("Voter Registration Number"), "R");
  }
  primaries.push(date);
}

const blank = () => ({ voted: 0, inPerson: 0, mail: 0, requested: 0, dem: 0, rep: 0, other: 0 });
const state = blank();
const counties = {};
let asOf = "";
const today = new Date().toISOString().slice(0, 10); // a few rows carry typo dates (2029)
for await (const get of rows(absZip, "STATEWIDE.csv")) {
  const county = get("County");
  const c = (counties[county] ??= blank());
  const inPerson = get("Ballot Style") === "EARLY IN-PERSON";
  if (!inPerson && get("Application Status") === "A") {
    state.requested += 1;
    c.requested += 1;
  }
  if (get("Ballot Status") !== "A") continue;
  const p = party.get(get("Voter Registration #"));
  const slot = p === "D" ? "dem" : p === "R" ? "rep" : "other";
  for (const t of [state, c]) {
    t.voted += 1;
    t[inPerson ? "inPerson" : "mail"] += 1;
    t[slot] += 1;
  }
  const returned = get("Ballot Return Date"); // MM/DD/YYYY
  const iso = returned ? `${returned.slice(6)}-${returned.slice(0, 2)}-${returned.slice(3, 5)}` : "";
  if (iso > asOf && iso <= today) asOf = iso;
}

writeFileSync(OUT, JSON.stringify({ asOf, primaries, state, counties }, null, 1) + "\n");
const pct = (n) => ((100 * n) / state.voted).toFixed(1);
console.log(
  `GA through ${asOf}: ${state.voted} accepted (${state.inPerson} in person, ${state.mail} mail) -- D ${pct(state.dem)}%, R ${pct(state.rep)}%, other ${pct(
    state.other
  )}% (primaries ${primaries.join(", ")}); ${Object.keys(counties).length} counties`
);
console.log(`Wrote ${OUT}`);
