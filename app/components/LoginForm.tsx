import { useFetcher } from "react-router";

/**
 * The shared "unlock editing" prompt for every write-gated page (Big Board,
 * voter chase, OH-7 tally, poll submissions) — posts `intent=login` to
 * whichever route renders it; that route's action should call
 * `tryLogin(formData)` from ~/lib/auth.server FIRST and return its result
 * directly when non-null. A successful login sets the shared session cookie
 * and React Router revalidates the route's loader automatically, so the
 * page re-renders as signed in without a full reload.
 */
export function LoginForm({ title }: { title?: string }) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const submitting = fetcher.state !== "idle";
  return (
    <fetcher.Form
      method="post"
      className="mx-auto max-w-xs space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <input type="hidden" name="intent" value="login" />
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title ?? "Sign in to edit"}
      </h2>
      <input
        type="text"
        name="name"
        placeholder="Your name"
        required
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      />
      <input
        type="password"
        name="password"
        placeholder="Edit password"
        required
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
      >
        {submitting ? "Checking…" : "Sign in"}
      </button>
      {fetcher.data?.error && (
        <p className="text-xs text-red-600 dark:text-red-400">{fetcher.data.error}</p>
      )}
    </fetcher.Form>
  );
}
