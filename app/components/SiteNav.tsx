import { NavLink } from "react-router";
import { ThemeToggle } from "~/components/ThemeToggle";

const LINKS = [
  { to: "/", label: "Map", end: true },
  { to: "/polls", label: "Polls", end: false },
  { to: "/election2026", label: "Big Board", end: false },
];

export function SiteNav() {
  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm font-bold tracking-tight text-gray-900 dark:text-gray-50">
            PoliticsPlace
          </span>
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
        <ThemeToggle />
      </div>
    </nav>
  );
}
