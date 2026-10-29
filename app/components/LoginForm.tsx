import { Link, useLocation } from "react-router";

/**
 * The "sign in to edit" prompt for every write-gated page (Big Board, voter
 * chase, OH-7 tally, poll submissions). Signing in happens on the /login
 * page, which sets the shared session cookie and comes back here; the
 * cookie then unlocks editing on every page.
 */
export function LoginForm({ title }: { title?: string }) {
  const { pathname, search } = useLocation();
  return (
    <div className="mx-auto max-w-xs space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title ?? "Sign in to edit"}</h2>
      <Link
        to={`/login?next=${encodeURIComponent(pathname + search)}`}
        className="block w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
      >
        Log in
      </Link>
    </div>
  );
}
