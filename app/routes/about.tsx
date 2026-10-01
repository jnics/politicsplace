import type { Route } from "./+types/about";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PoliticsPlace — About" },
    {
      name: "description",
      content:
        "Where PoliticsPlace's data comes from, how it's kept current, and its known limitations.",
    },
  ];
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
      {children}
    </h2>
  );
}
function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-4 mb-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
      {children}
    </h3>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
      {children}
    </p>
  );
}

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          About PoliticsPlace
        </h1>
        <P>
          What this site is, where its numbers come from, and what it
          honestly doesn&rsquo;t cover yet.
        </P>
      </header>

      <H2>What this is</H2>
      <P>
        PoliticsPlace is a single-page reference for U.S. federal elections:
        an interactive map (national, state, county, and precinct level),
        polling averages, campaign fundraising, and — for one race
        (Ohio&rsquo;s 7th District) — a live election-night tally. It&rsquo;s
        built and maintained by one person as a side project, not a news
        organization or a campaign.
      </P>

      <H2>Data sources</H2>

      <H3>Map geometry (county, district, precinct boundaries)</H3>
      <P>
        County and congressional-district shapes come from the U.S. Census
        Bureau&rsquo;s TIGERweb service. Precinct-level shapes (where
        available — see Limitations below) come from the Census
        Bureau&rsquo;s 2020 Voting Tabulation Districts (VTDs).
      </P>

      <H3>Election results</H3>
      <P>
        Precinct-level historical results are joined from VEST (the Voting
        and Election Science Team, via Harvard Dataverse) for 2016/2018/2020,
        and MEDSL (MIT Election Data and Science Lab) for 2022/2024. Where
        neither publishes usable precinct data for a state, results come
        from that state&rsquo;s own official source — a Secretary of State
        or county Board of Elections results file — at the county level
        instead. Every state&rsquo;s numbers are checked against the
        certified statewide result before being used.
      </P>

      <H3>Polls</H3>
      <P>
        The current (2026) cycle&rsquo;s polls are pulled from Wikipedia&rsquo;s
        election articles, which compile polling tables from the
        pollsters&rsquo; own releases. Historical polls (mostly 2016–2022)
        came from FiveThirtyEight&rsquo;s public polling archive —
        FiveThirtyEight shut down in 2025 and no longer publishes anything,
        so that data is a frozen historical snapshot, not a live feed; it
        won&rsquo;t gain 2024 or 2026 entries. RealClearPolling was tried as
        a third source but isn&rsquo;t used — its site blocks automated
        access in a way that isn&rsquo;t currently solvable, so it contributes
        nothing here.
      </P>

      <H3>Fundraising</H3>
      <P>
        Campaign-finance totals come from the Federal Election
        Commission&rsquo;s public API — official filings, not an estimate.
        Currently limited to Senate and House candidates; Governor and other
        state-level races aren&rsquo;t covered because the FEC only regulates
        federal campaigns.
      </P>

      <H3>Early voting &amp; election-office contacts</H3>
      <P>
        Per-state voting information comes from Google&rsquo;s Civic
        Information API, which is powered by the Voting Information Project
        — a Democracy Works effort that partners directly with state and
        local election officials. Each state publishes this data on its own
        schedule, typically a few weeks before Election Day, so this section
        fills in gradually as states release it rather than all at once.
      </P>

      <H3>Manual entries (Big Board, voter chase, OH-7 tally, submitted polls)</H3>
      <P>
        A few pages accept hand-entered data — election-night results,
        canvassing/chase marks, and individual poll submissions. These are
        entered by people with the site&rsquo;s shared edit password, not
        pulled automatically. They&rsquo;re clearly separate from the
        automated sources above.
      </P>

      <H2>Known limitations</H2>
      <P>
        <strong>No precinct-level map for California, Hawaii, or Oregon</strong> —
        the Census Bureau never published 2020 VTD boundaries for these
        three states, so there&rsquo;s no source to build a precinct layer
        from. They fall back to county-level shading. Maine has VTDs for
        only 6 of its 16 counties, so its precinct layer is partial.
      </P>
      <P>
        <strong>Older district-level results are often estimated, not exact.</strong>{" "}
        Where a state&rsquo;s congressional map changed between the year an
        election happened and today, older results are typically allocated
        to the new district lines by population rather than recomputed from
        precinct-level votes, since that precision isn&rsquo;t always
        available. Where a real precinct-level aggregate exists instead
        (Ohio and Texas, for both of which the underlying data supports it),
        it&rsquo;s used.
      </P>
      <P>
        <strong>Early voting/contact info is incomplete right now</strong> —
        see above; it&rsquo;s a rollout timing issue, not a bug, and
        improves automatically as states publish.
      </P>
      <P>
        <strong>No Governor or state-legislature fundraising data</strong> —
        outside FEC&rsquo;s jurisdiction; would need each state&rsquo;s own
        campaign-finance disclosure system, which isn&rsquo;t built yet.
      </P>

      <H2>How current is this?</H2>
      <P>
        Automated sources (polls, fundraising, early-voting info, election
        results) are refreshed by re-running a pull periodically — not on
        every page load, and not continuously. Manual entries (election
        night, chase, submitted polls) show up live as soon as someone with
        edit access saves them.
      </P>
    </div>
  );
}
