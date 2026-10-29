import { useEffect, useState } from "react";
import { Form, Link, NavLink, useLocation, useRouteLoaderData } from "react-router";
import { ThemeToggle } from "~/components/ThemeToggle";

const LINKS = [
  { to: "/", label: "Map", end: true },
  { to: "/polls", label: "Polls", end: false },
  { to: "/fundraising", label: "Fundraising", end: false },
  { to: "/ratings", label: "Ratings", end: false },
  { to: "/calendar", label: "Calendar", end: false },
  { to: "/election2026", label: "Election 26", end: false },
  { to: "/results", label: "OH-7 / Medina", end: false },
  { to: "/chase", label: "Chase", end: false },
  { to: "/about", label: "About", end: false },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
  }`;

export function SiteNav() {
  // Below `lg` the nine links don't fit on one line, so they fold into a
  // menu behind a button; from `lg` up it's the plain single row.
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  const current = LINKS.find((l) => (l.end ? pathname === l.to : pathname.startsWith(l.to)));
  const editor = useRouteLoaderData<{ editor: string | null }>("root")?.editor ?? null;
  const authClass =
    "rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm font-bold tracking-tight text-gray-900 dark:text-gray-50">
            PoliticsPlace
          </span>
          {current && (
            <span className="text-sm text-gray-500 dark:text-gray-400 lg:hidden">
              / {current.label}
            </span>
          )}
          <div className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {editor ? (
            <Form method="post" action="/login">
              <input type="hidden" name="intent" value="logout" />
              <button type="submit" className={authClass} title={`Signed in as ${editor}`}>
                Log out
              </button>
            </Form>
          ) : (
            pathname !== "/login" && (
              <Link to={`/login?next=${encodeURIComponent(pathname + search)}`} className={authClass}>
                Log in
              </Link>
            )
          )}
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white lg:hidden"
          >
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div
          id="site-menu"
          className="grid grid-cols-2 gap-1 border-t border-gray-200 px-4 py-2 dark:border-gray-800 sm:grid-cols-3 sm:px-6 lg:hidden"
        >
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={(s) => `${linkClass(s)} py-2.5`}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
