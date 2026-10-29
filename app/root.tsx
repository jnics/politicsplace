import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { useEffect } from "react";

import type { Route } from "./+types/root";
import "./app.css";
import { SiteNav } from "~/components/SiteNav";
import { editorFromRequest } from "~/lib/auth.server";

/** Who's signed in, for the nav's Log in / Log out button. */
export function loader({ request }: Route.LoaderArgs) {
  return { editor: editorFromRequest(request) };
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* Dark mode is the default (the `dark` class is on <html> from SSR).
            This tiny inline script runs before first paint to drop it only
            when the visitor has explicitly saved a "light" choice, so there's
            no flash. Kept inline rather than as a React effect so it beats
            the first paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pp-theme');if(t==='light')document.documentElement.classList.remove('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <>
      <SiteNav />
      <Outlet />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (error instanceof Error) {
    // Shown in production too, so a crash report says what actually broke.
    details = `${details} (${error.message})`;
    if (import.meta.env.DEV) stack = error.stack;
  }

  // A tab opened before a deploy can ask for script files the deploy removed.
  // Reload once to pick up the new build instead of stranding the page here.
  const staleBuild =
    error instanceof Error &&
    /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(
      error.message
    );
  useEffect(() => {
    if (!staleBuild) return;
    // At most once a minute, so a page that is broken for another reason
    // doesn't reload forever.
    try {
      const last = Number(sessionStorage.getItem("pp-stale-reload") || 0);
      if (Date.now() - last < 60_000) return;
      sessionStorage.setItem("pp-stale-reload", String(Date.now()));
    } catch {}
    window.location.reload();
  }, [staleBuild]);

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-3 rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
      >
        Reload page
      </button>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
