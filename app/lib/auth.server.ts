import { createHmac } from "node:crypto";
import { data } from "react-router";
import { readBlob, writeBlob } from "~/lib/db.server";

/**
 * One shared pseudo-auth for every write surface on the site (Big Board,
 * voter chase, OH-7 tally, manual poll submissions): a single password
 * (env var, change it in the Worker's dashboard/secrets) unlocks a
 * signed-cookie session, same idea board.server.ts had on its own before —
 * generalized here so every feature gates on the same login instead of each
 * inventing its own. The site stays fully public to READ; only writes are
 * gated.
 *
 * `EDIT_PASSWORD` / `SESSION_SECRET` are read from `process.env`, which
 * `nodejs_compat` (set in wrangler.jsonc) mirrors from the Worker's actual
 * environment variables/secrets — so this needs no D1/context plumbing,
 * unlike the data stores.
 */
const PASSWORD = process.env.EDIT_PASSWORD ?? "politicsplace-edit";
const SECRET = process.env.SESSION_SECRET ?? "dev-only-not-secret";

const COOKIE = "pp_session";

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

/** The signed-in editor's name from the request cookie, or null if not
 *  signed in. Every write action should check this and refuse (401/redirect
 *  to login) when it's null. */
export function editorFromRequest(request: Request): string | null {
  const header = request.headers.get("Cookie") ?? "";
  const match = header.match(new RegExp(`${COOKIE}=([^;]+)`));
  if (!match) return null;
  return unsign(decodeURIComponent(match[1]));
}

// --- login-attempt rate limiting -------------------------------------------
//
// The edit password is a single shared secret and this site is now on the
// open internet, so an unlimited-attempts login is brute-forceable. Failed
// attempts are counted per IP in the same kv_store blob store the other
// features use (see db.server.ts) — no new table needed. 5 wrong passwords
// from one IP locks that IP out of logging in for 15 minutes; a correct
// password clears its own counter.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const ATTEMPTS_STORE = "loginAttempts";

interface AttemptEntry {
  count: number;
  windowStart: number;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For") ??
    "unknown"
  );
}

/** Returns remaining lockout seconds if `ip` is currently locked out, else 0. */
async function lockoutSecondsRemaining(
  db: D1Database,
  ip: string
): Promise<number> {
  const attempts = await readBlob<Record<string, AttemptEntry>>(
    db,
    ATTEMPTS_STORE,
    {}
  );
  const entry = attempts[ip];
  if (!entry) return 0;
  const elapsed = Date.now() - entry.windowStart;
  if (elapsed >= WINDOW_MS) return 0;
  if (entry.count < MAX_ATTEMPTS) return 0;
  return Math.ceil((WINDOW_MS - elapsed) / 1000);
}

async function recordFailedAttempt(db: D1Database, ip: string): Promise<void> {
  const attempts = await readBlob<Record<string, AttemptEntry>>(
    db,
    ATTEMPTS_STORE,
    {}
  );
  const entry = attempts[ip];
  const now = Date.now();
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    attempts[ip] = { count: 1, windowStart: now };
  } else {
    attempts[ip] = { count: entry.count + 1, windowStart: entry.windowStart };
  }
  await writeBlob(db, ATTEMPTS_STORE, attempts);
}

async function clearAttempts(db: D1Database, ip: string): Promise<void> {
  const attempts = await readBlob<Record<string, AttemptEntry>>(
    db,
    ATTEMPTS_STORE,
    {}
  );
  if (!(ip in attempts)) return;
  delete attempts[ip];
  await writeBlob(db, ATTEMPTS_STORE, attempts);
}

/**
 * Every write-gated route's action should call this FIRST, before its own
 * write logic: if the submission was a login attempt (the shared
 * `<LoginForm>` posts `intent=login`, `password`, `name`), this handles it
 * completely and returns the Response to send back. Otherwise it returns
 * null and the caller's own action logic continues as normal.
 */
export async function tryLogin(
  request: Request,
  db: D1Database,
  form: FormData
) {
  if (form.get("intent") !== "login") return null;
  const ip = clientIp(request);

  const lockedFor = await lockoutSecondsRemaining(db, ip);
  if (lockedFor > 0) {
    const minutes = Math.ceil(lockedFor / 60);
    return data(
      { error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
      { status: 429 }
    );
  }

  const password = String(form.get("password") ?? "");
  if (!checkPassword(password)) {
    await recordFailedAttempt(db, ip);
    return data({ error: "Wrong password." }, { status: 401 });
  }

  await clearAttempts(db, ip);
  const name = String(form.get("name") ?? "").trim() || "anon";
  return data(
    { ok: true, editor: name },
    { headers: { "Set-Cookie": sessionCookie(name) } }
  );
}
