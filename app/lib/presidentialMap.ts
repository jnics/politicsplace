import {
  PRESIDENTIAL_RESULTS,
  type PresidentialYear,
} from "~/data/presidentialResults";
import { PRESIDENTIAL_VOTES } from "~/data/presidentialVotes";
import { HISTORICAL_COLORS, SHADE_COLORS } from "~/lib/shades";
import { marginToShade } from "~/lib/margin";

export interface SplitStateInfo {
  state: string;
  majorityColor: string;
  minorityColor: string;
  detail?: string;
}

export function computePresidentialView(year: PresidentialYear) {
  const results = PRESIDENTIAL_RESULTS[year];
  const votes = PRESIDENTIAL_VOTES[year];
  const fills: Record<string, string> = {};
  const splitStates: SplitStateInfo[] = [];
  let dEv = 0;
  let rEv = 0;

  for (const [state, result] of Object.entries(results)) {
    if (result.party === "D" || result.party === "R") {
      // Shade by actual margin (a 3-point squeaker looks different from a
      // 40-point blowout), the same convention most election-night maps use.
      const vote = votes?.[state];
      const shade = vote
        ? marginToShade(result.party, Math.abs(vote.dPct - vote.rPct))
        : result.party === "D"
        ? "safeD"
        : "safeR";
      fills[state] = SHADE_COLORS[shade];
      if (result.party === "D") dEv += result.ev;
      else rEv += result.ev;
    } else {
      // split
      const patternId = `split-${year}-${state}`;
      fills[state] = `url(#${patternId})`;
      const majorityColor =
        result.majorityParty === "D" ? HISTORICAL_COLORS.D : HISTORICAL_COLORS.R;
      const minorityColor =
        result.minorityParty === "D" ? HISTORICAL_COLORS.D : HISTORICAL_COLORS.R;
      splitStates.push({ state, majorityColor, minorityColor, detail: result.details });
      if (result.majorityParty === "D") dEv += result.majorityEv ?? 0;
      else rEv += result.majorityEv ?? 0;
      if (result.minorityParty === "D") dEv += result.minorityEv ?? 0;
      else rEv += result.minorityEv ?? 0;
    }
  }

  return { fills, splitStates, dEv, rEv, total: dEv + rEv };
}

export function patternIdFor(year: PresidentialYear, state: string) {
  return `split-${year}-${state}`;
}
