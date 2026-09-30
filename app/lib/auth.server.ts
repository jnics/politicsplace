import { createHmac } from "node:crypto";
import { data } from "react-router";

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

/**
 * Every write-gated route's action should call this FIRST, before its own
 * write logic: if the submission was a login attempt (the shared
 * `<LoginForm>` posts `intent=login`, `password`, `name`), this handles it
 * completely and returns the Response to send back. Otherwise it returns
 * null and the caller's own action logic continues as normal.
 */
export function tryLogin(form: FormData) {
  if (form.get("intent") !== "login") return null;
  const password = String(form.get("password") ?? "");
  if (!checkPassword(password)) {
    return data({ error: "Wrong password." }, { status: 401 });
  }
  const name = String(form.get("name") ?? "").trim() || "anon";
  return data(
    { ok: true, editor: name },
    { headers: { "Set-Cookie": sessionCookie(name) } }
  );
}
