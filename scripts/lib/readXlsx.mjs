/**
 * Minimal .xlsx reader for the build scripts -- no dependency. An .xlsx is a
 * zip of XML; this unpacks it with the system `tar` (bsdtar reads zip on
 * Windows 10+, macOS and most Linux) and reads one sheet's cells as rows of
 * strings. Enough for the flat statistics tables election offices publish;
 * not a general spreadsheet parser (no formulas, dates or merged cells).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");

/** "C12" -> 2 (zero-based column). */
function colIndex(ref) {
  const letters = /^[A-Z]+/.exec(ref)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Sheet names in workbook order, e.g. ["Sheet1", "County"]. */
export function sheetNames(xlsxPath) {
  return withUnpacked(xlsxPath, (dir) =>
    [...readFileSync(join(dir, "xl/workbook.xml"), "utf8").matchAll(/<sheet [^>]*name="([^"]+)"/g)].map((m) =>
      decode(m[1])
    )
  );
}

/** Rows (arrays of cell text) of the sheet at `index` (0-based, workbook order). */
export function readSheet(xlsxPath, index = 0) {
  return withUnpacked(xlsxPath, (dir) => {
    const ssPath = join(dir, "xl/sharedStrings.xml");
    const shared = existsSync(ssPath)
      ? [...readFileSync(ssPath, "utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
          decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""))
        )
      : [];
    // Map workbook order -> sheet file through the relationships.
    const wb = readFileSync(join(dir, "xl/workbook.xml"), "utf8");
    const rels = readFileSync(join(dir, "xl/_rels/workbook.xml.rels"), "utf8");
    const rid = [...wb.matchAll(/<sheet [^>]*r:id="([^"]+)"/g)][index]?.[1];
    const target = new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`).exec(rels)?.[1] ??
      new RegExp(`Target="([^"]+)"[^>]*Id="${rid}"`).exec(rels)?.[1];
    if (!target) throw new Error(`no sheet ${index} in ${xlsxPath}`);
    const xml = readFileSync(join(dir, "xl", target.replace(/^\/?xl\//, "")), "utf8");
    const rows = [];
    for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = [];
      for (const c of r[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const [, ref, attrs, inner = ""] = c;
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner)?.[1];
        let text = "";
        if (/t="s"/.test(attrs) && v != null) text = shared[Number(v)] ?? "";
        else if (inline != null) text = decode(inline);
        else if (v != null) text = decode(v);
        row[colIndex(ref)] = text;
      }
      rows.push(Array.from(row, (x) => x ?? ""));
    }
    return rows;
  });
}

// On Windows, Git Bash puts GNU tar first on PATH, and GNU tar can't read
// zip; call the system bsdtar directly.
const TAR =
  process.platform === "win32"
    ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe")
    : "tar";

function withUnpacked(xlsxPath, fn) {
  const dir = mkdtempSync(join(tmpdir(), "xlsx-"));
  try {
    execFileSync(TAR, ["-xf", xlsxPath, "-C", dir], { stdio: "ignore" });
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
