import type { Route } from "./+types/login";
import { Form, Link, data, redirect, useNavigation } from "react-router";
import { cloudflareContext } from "~/lib/context.server";
import { checkLogin, clearCookie, editorFromRequest, safeNext, sessionCookie } from "~/lib/auth.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "PoliticsPlace — Sign in" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  return { editor: editorFromRequest(request), next };
}

/** Sign in (the shared edit password) or sign out. A login lasts 30 days on
 *  that browser and unlocks editing on every page (see auth.server.ts). */
export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const next = safeNext(String(form.get("next") ?? ""));
  if (form.get("intent") === "logout") {
    return redirect("/login", { headers: { "Set-Cookie": clearCookie() } });
  }
  const r = await checkLogin(request, context.get(cloudflareContext).env.DB, form);
  if ("error" in r) return data({ error: r.error }, { status: r.status });
  return redirect(next, { headers: { "Set-Cookie": sessionCookie(r.name) } });
}

const INPUT =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800";
const BUTTON =
  "w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900";

export default function Login({ loaderData, actionData }: Route.ComponentProps) {
  const { editor, next } = loaderData;
  const busy = useNavigation().state !== "idle";

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-2 text-center">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {editor ? "Signed in" : "Sign in"}
          </h1>
          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            PoliticsPlace is a closed website. Access is given out to only a few people. Signing in
            unlocks editing (results, the voter chase, poll entry) on every page, and stays signed in
            on this browser for 30 days or until you log out.
          </p>
        </div>

        {editor ? (
          <Form method="post" className="space-y-3 text-center">
            <input type="hidden" name="intent" value="logout" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              You&rsquo;re signed in as <span className="font-semibold">{editor}</span>.
            </p>
            <button type="submit" disabled={busy} className={BUTTON}>
              {busy ? "Logging out…" : "Log out"}
            </button>
            <Link to="/" className="block text-xs text-gray-500 underline dark:text-gray-400">
              Back to the site
            </Link>
          </Form>
        ) : (
          <Form method="post" className="space-y-3">
            <input type="hidden" name="intent" value="login" />
            <input type="hidden" name="next" value={next} />
            <input type="text" name="name" placeholder="Your name" required autoComplete="name" className={INPUT} />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              autoComplete="current-password"
              className={INPUT}
            />
            <button type="submit" disabled={busy} className={BUTTON}>
              {busy ? "Checking…" : "Log in"}
            </button>
            {actionData && "error" in actionData && (
              <p className="text-center text-xs text-red-600 dark:text-red-400">{actionData.error}</p>
            )}
          </Form>
        )}
      </div>
    </main>
  );
}
