import {
  PRESIDENTIAL_RESULTS,
  type PresidentialYear,
} from "~/data/presidentialResults";
import { PRESIDENTIAL_VOTES } from "~/data/presidentialVotes";
import {
  HISTORICAL_COLORS,
  SHADE_COLORS,
  emptyShadeTally,
  emptyShadeStates,
} from "~/lib/shades";
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
  // Electoral votes split across the 7-point margin spectrum, for the donut,
  // plus the list of states in each bucket (for map highlighting on hover).
  const shadeTally = emptyShadeTally();
  const shadeStates = emptyShadeStates();
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
      shadeTally[shade] += result.ev;
      shadeStates[shade].push(state);
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
      const vote = votes?.[state];
      const majShade =
        vote && result.majorityParty
          ? marginToShade(result.majorityParty, Math.abs(vote.dPct - vote.rPct))
          : result.majorityParty === "D"
          ? "safeD"
          : "safeR";
      shadeTally[majShade] += result.majorityEv ?? 0;
      shadeStates[majShade].push(state);
      // A single congressional district that broke the other way is close by
      // definition -- bucket it as a "lean".
      if (result.minorityEv) {
        shadeTally[result.minorityParty === "D" ? "leanD" : "leanR"] +=
          result.minorityEv;
      }
      if (result.majorityParty === "D") dEv += result.majorityEv ?? 0;
      else rEv += result.majorityEv ?? 0;
      if (result.minorityParty === "D") dEv += result.minorityEv ?? 0;
      else rEv += result.minorityEv ?? 0;
    }
  }

  return { fills, splitStates, shadeTally, shadeStates, dEv, rEv, total: dEv + rEv };
}

export function patternIdFor(year: PresidentialYear, state: string) {
  return `split-${year}-${state}`;
}
