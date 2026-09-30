#!/usr/bin/env node
/**
 * One-off: parse the Ashland + Medina + Wayne "Precinct and Polling Locations"
 * screen reports (scraped from lookup.boe.ohio.gov via the browser and saved as
 * scratchpad text, 4 lines per precinct) into
 * scripts/data/oh7-county-polling.json.
 *
 *   node scripts/parse-oh7-county-polling.mjs <scratchpad-dir>
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = process.argv[2];
if (!SRC) throw new Error("pass the scratchpad dir holding *-raw.txt");

const titleCase = (s) =>
  String(s)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

function parse(text, county) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows = [];
  for (let i = 0; i + 3 < lines.length; ) {
    if (!/^\d{2,4}\s/.test(lines[i])) {
      i += 1;
      continue;
    }
    const precinct = lines[i].replace(/^\d{2,4}\s+/, "").replace(/\s*-\s*/g, "-");
    const loc = lines[i + 1];
    const street = lines[i + 2];
    const cityLine = lines[i + 3];
    const m = cityLine.match(/^(.*?)[,]?\s+OH\s+\d{5}$/i);
    const city = m ? m[1].trim() : cityLine;
    rows.push({
      county,
      precinct: titleCase(precinct),
      location: titleCase(loc),
      address: `${titleCase(street)}, ${titleCase(city)}`,
    });
    i += 4;
  }
  return rows;
}

const out = [];
for (const [file, county] of [
  ["ashland-raw.txt", "Ashland"],
  ["medina-raw.txt", "Medina"],
  ["wayne-raw.txt", "Wayne"],
]) {
  const rows = parse(await readFile(resolve(SRC, file), "utf8"), county);
  console.log(`${county}: ${rows.length}`);
  out.push(...rows);
}

await writeFile(
  resolve(root, "scripts/data/oh7-county-polling.json"),
  JSON.stringify(
    {
      source:
        "lookup.boe.ohio.gov Precinct and Polling Locations screen reports (Ashland, Medina, Wayne), pulled via browser",
      pulled: "2026-09-07",
      rows: out,
    },
    null,
    1
  ) + "\n"
);
