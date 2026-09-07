import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHmac } from "node:crypto";
import type { BoardResult } from "~/data/boardResults";

/**
 * Server-only store for the /election2026 Big Board. Live results are kept in a
 * single JSON file so no database is needed. This is fine for local use and a
 * single-instance deploy; if the count needs to survive restarts on an
 * ephemeral host, point STORE at a persistent volume or swap in a DB.
 */
const STORE = resolve(
  process.cwd(),
  process.env.BOARD_STORE ?? "board-data.json"
);

/** Shared passphrase to submit results. Change it in the environment. */
const PASSWORD = process.env.BOARD_PASSWORD ?? "board2026";
const SECRET = process.env.SESSION_SECRET ?? "dev-only-not-secret";

export interface BoardStore {
  results: Record<string, BoardResult>;
  /** raceId -> { at, by } of the last edit, for a light audit trail. */
  log: Record<string, { at: string; by: string }>;
}

const EMPTY: BoardStore = { results: {}, log: {} };

export async function readStore(): Promise<BoardStore> {
  try {
    const raw = JSON.parse(await readFile(STORE, "utf8"));
    return { results: raw.results ?? {}, log: raw.log ?? {} };
  } catch {
    return EMPTY;
  }
}

async function writeStore(store: BoardStore): Promise<void> {
  await mkdir(dirname(STORE), { recursive: true });
  await writeFile(STORE, JSON.stringify(store, null, 2) + "\n");
}

export async function saveResult(
  raceId: string,
  result: BoardResult,
  by: string
): Promise<void> {
  const store = await readStore();
  store.results[raceId] = result;
  store.log[raceId] = { at: new Date().toISOString(), by };
  await writeStore(store);
}

// ── pseudo-auth: a signed cookie holding just the editor's name ──────────────

const COOKIE = "board_session";

function sign(value: string): string {
  const mac = createHmac("sha256", SECRET).update(value).digest("base64url");
  return `${value}.${mac}`;
}
function unsign(signed: string): string | null {
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const value = signed.slice(0, i);
  return sign(value) === signed ? value : null;
}

export function checkPassword(pw: string): boolean {
  return pw === PASSWORD;
}

export function sessionCookie(name: string): string {
  const v = encodeURIComponent(sign(name || "anon"));
  return `${COOKIE}=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`;
}

export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`;
}

/** The editor's name from the request cookie, or null if not signed in. */
export function editorFromRequest(request: Request): string | null {
  const header = request.headers.get("Cookie") ?? "";
  const match = header.match(new RegExp(`${COOKIE}=([^;]+)`));
  if (!match) return null;
  return unsign(decodeURIComponent(match[1]));
}
