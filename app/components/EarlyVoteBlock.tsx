import earlyVoting from "~/data/earlyVoting.generated.json";

interface ElectionOfficial {
  officialName?: string;
  officeTitle?: string;
  officePhoneNumber?: string;
  faxNumber?: string;
  emailAddress?: string;
}

interface AdminBody {
  name?: string;
  electionInfoUrl?: string;
  votingLocationFinderUrl?: string;
  absenteeVotingInfoUrl?: string;
  ballotInfoUrl?: string;
  electionRegistrationUrl?: string;
  physicalAddress?: { line1?: string; line2?: string };
  electionOfficials?: ElectionOfficial[];
}

interface PollingLocation {
  pollingHours?: string;
}

interface StateEntry {
  hasData: boolean;
  admin: AdminBody | null;
  pollingLocations?: PollingLocation[] | null;
}

const DATA = earlyVoting as {
  generatedAt: string;
  byState: Record<string, StateEntry>;
};

function formatPhone(raw?: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Early-voting / election-administration info for one state, shown in the
 *  map's hover tooltip for the current (2026) cycle. Source: Google's Civic
 *  Information API (Voting Information Project) — states publish this data
 *  on their own schedule, typically a few weeks before Election Day, so
 *  many states show nothing yet. Re-run `pnpm earlyvoting:pull` periodically
 *  as Nov 3 approaches and this fills in on its own, no code change needed. */
export function EarlyVoteBlock({ state }: { state: string }) {
  const entry = DATA.byState[state];
  if (!entry) return null;

  // Polling hours come from the same per-state feed but aren't part of
  // `hasData` (that's gated on the election-administration fields only) —
  // a state can have one published without the other, so check separately
  // rather than hiding real hours behind an unrelated flag.
  const pollingHours = entry.pollingLocations?.find((p) => p.pollingHours)?.pollingHours;
  const admin = entry.hasData ? entry.admin : null;

  if (!admin && !pollingHours) {
    return (
      <div className="border-t border-white/15 pt-1 text-gray-300 dark:border-black/10 dark:text-gray-600">
        Early voting info not published yet for this state.
      </div>
    );
  }

  const official = admin?.electionOfficials?.[0];
  const phone = formatPhone(official?.officePhoneNumber);

  return (
    <div className="border-t border-white/15 pt-1 dark:border-black/10">
      <div className="text-gray-300 dark:text-gray-600">Voting help</div>
      {pollingHours && <div>Polls: {pollingHours}</div>}
      {(official?.emailAddress || phone) && (
        <div className="space-y-0.5">
          {phone && <div>{phone}</div>}
          {official?.emailAddress && (
            <div className="truncate">{official.emailAddress.toLowerCase()}</div>
          )}
        </div>
      )}
      {admin?.physicalAddress?.line1 && (
        <div className="text-gray-300 dark:text-gray-600">
          {admin.physicalAddress.line1}
          {admin.physicalAddress.line2 ? `, ${admin.physicalAddress.line2}` : ""}
        </div>
      )}
      {admin && (
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-gray-300 dark:text-gray-600">
          {admin.votingLocationFinderUrl && <span>Find your polling place</span>}
          {admin.absenteeVotingInfoUrl && <span>Absentee/early voting</span>}
        </div>
      )}
    </div>
  );
}
