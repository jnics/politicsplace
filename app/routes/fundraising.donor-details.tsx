import type { Route } from "./+types/fundraising.donor-details";
import donorDetails from "~/data/donorDetails.generated.json";

interface DonorDetail {
  name: string;
  entity: string | null;
  employer: string | null;
  occupation: string | null;
  amount: number;
  date: string;
}

const DONOR_DETAILS = donorDetails as {
  byCandidate: Record<string, Record<string, DonorDetail[]>>;
};

/**
 * Resource route (no UI). donorDetails.generated.json is ~3MB of itemized
 * named donors across all 125 candidates -- only ever a few KB of that is
 * relevant to one candidate at a time, so it's kept server-side here instead
 * of imported into fundraising.tsx, which would bundle the whole file into
 * every visitor's client JS (see the deploy-size fix a few commits back).
 * The client fetches this per candidate, on demand, when a row is expanded.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const byState = DONOR_DETAILS.byCandidate[params.candidateId] ?? {};
  return Response.json(byState);
}
