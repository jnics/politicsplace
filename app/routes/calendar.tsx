import type { Route } from "./+types/calendar";
import earlyVoting from "~/data/earlyVoting.generated.json";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PoliticsPlace — Election Calendar" },
    {
      name: "description",
      content:
        "The 2026 general election date, plus each state's own official voter registration and absentee/early-voting links.",
    },
  ];
}

interface AdminBody {
  electionInfoUrl?: string;
  electionRegistrationUrl?: string;
  absenteeVotingInfoUrl?: string;
  votingLocationFinderUrl?: string;
}
interface StateEntry {
  hasData: boolean;
  admin: AdminBody | null;
}
const DATA = earlyVoting as {
  generatedAt: string;
  byState: Record<string, StateEntry>;
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const LINK_LABELS: [keyof AdminBody, string][] = [
  ["electionRegistrationUrl", "Register to vote"],
  ["absenteeVotingInfoUrl", "Absentee / early voting"],
  ["votingLocationFinderUrl", "Find your polling place"],
  ["electionInfoUrl", "State election info"],
];

export default function Calendar() {
  const states = Object.keys(STATE_NAMES).sort((a, b) =>
    STATE_NAMES[a].localeCompare(STATE_NAMES[b])
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          Election Calendar
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Exact registration and absentee deadlines vary by state, so rather
          than list dates that could be wrong or go stale, this links each
          state&rsquo;s own official page — the source that&rsquo;s always
          current.
        </p>
      </header>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-xs font-medium text-gray-400 dark:text-gray-500">
          2026 General Election
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Tuesday, November 3, 2026
        </div>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Fixed by federal law — the first Tuesday after the first Monday in
          November, every even year.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {states.map((usps) => {
          const entry = DATA.byState[usps];
          const admin = entry?.admin;
          const links = admin
            ? LINK_LABELS.filter(([key]) => admin[key])
            : [];
          return (
            <div
              key={usps}
              className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {STATE_NAMES[usps]}
              </div>
              {links.length > 0 ? (
                <ul className="space-y-0.5 text-xs">
                  {links.map(([key, label]) => (
                    <li key={key}>
                      <a
                        href={admin![key]}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Not published yet — check back closer to the election.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
        Sourced from Google&rsquo;s Civic Information API (Voting Information
        Project) — each state publishes on its own schedule, usually a few
        weeks before Election Day, so many states show nothing here yet.
        Updated {new Date(DATA.generatedAt).toLocaleDateString()}.
      </p>
    </div>
  );
}
