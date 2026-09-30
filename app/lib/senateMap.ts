import { SENATE_RESULTS, type SenateCycleYear } from "~/data/senateResults";
import { SENATE_VOTES } from "~/data/senateVotes";
import { SENATE_CHAMBER } from "~/data/senateChamber";
import {
  HISTORICAL_COLORS,
  INDEPENDENT_COLOR,
  SHADE_COLORS,
  shadeSide,
  emptyShadeTally,
  emptyShadeStates,
  type Shade,
} from "~/lib/shades";
import { marginToShade } from "~/lib/margin";
import { buildSenateSeatContext, type SenateSeatContext } from "~/lib/senateComposition";

export const NOT_UP_COLOR = "#ffffff"; // white: no race this cycle — stays neutral, isn't blue or red

export function computeSenateHistoricalView(year: SenateCycleYear) {
  const races = SENATE_RESULTS[year];
  const votes = SENATE_VOTES[year];
  const fills: Record<string, string> = {};
  const upStates = new Set<string>();
  // Seats decided this cycle, split across the margin spectrum. A decided race
  // never lands on "toss-up" (there's a winner) -- the closest bucket is "lean".
  // Seats an independent won get their own colour, outside the spectrum.
  const shadeTally = emptyShadeTally();
  const shadeStates = emptyShadeStates();
  const indStates: string[] = [];
  let dSeats = 0;
  let rSeats = 0;
  const seen = new Set<string>();

  for (const race of races) {
    if (seen.has(race.state)) continue; // de-dupe same-seat regular+special pairs
    seen.add(race.state);
    upStates.add(race.state);

    const vote = votes?.find((v) => v.state === race.state);

    if (vote?.winner.party === "I") {
      fills[race.state] = INDEPENDENT_COLOR;
      indStates.push(race.state);
    } else if (vote && (race.party === "D" || race.party === "R")) {
      const shade = marginToShade(
        race.party,
        Math.abs(vote.winner.pct - vote.runnerUp.pct),
        { allowTossup: false }
      );
      fills[race.state] = SHADE_COLORS[shade];
      shadeTally[shade] += 1;
      shadeStates[shade].push(race.state);
    } else {
      const shade: Shade = race.party === "D" ? "safeD" : "safeR";
      fills[race.state] = race.party === "D" ? HISTORICAL_COLORS.D : HISTORICAL_COLORS.R;
      shadeTally[shade] += 1;
      shadeStates[shade].push(race.state);
    }

    // Independents (King, Sanders) caucus with the Democrats for chamber math.
    if (race.party === "D") dSeats += 1;
    else rSeats += 1;
  }

  // Fill out the rest of the 100-seat chamber: the seats that weren't on the
  // ballot this cycle, held by whichever party held them going into the next
  // Congress. (dSeats/rSeats here count states, not seats, so a cycle with a
  // concurrent special election is off by one -- the "held" bucket absorbs it
  // and the D/R totals stay exact.)
  const chamber = SENATE_CHAMBER[year];
  const heldD = chamber ? Math.max(chamber.dCaucus - dSeats, 0) : 0;
  const heldR = chamber ? Math.max(chamber.rCaucus - rSeats, 0) : 0;

  return {
    fills,
    upStates,
    shadeTally,
    shadeStates,
    indStates,
    indSeats: indStates.length,
    dSeats,
    rSeats,
    totalRaces: dSeats + rSeats,
    chamber,
    heldD,
    heldR,
  };
}

export interface Senate2026StateInfo {
  state: string;
  active: boolean;
  activeSeat?: SenateSeatContext;
  seats: SenateSeatContext[];
}

export function computeSenate2026View(picks: Record<string, Shade>) {
  const byState = buildSenateSeatContext();
  const fills: Record<string, string> = {};
  const activeStates = new Set<string>();
  const stateInfo: Record<string, Senate2026StateInfo> = {};

  // All 100 seats spread across the 7-point spectrum: the 35 up-in-2026 seats
  // take the user's pick (default toss-up); the other 65 sit at "safe" for
  // whichever party holds them now.
  const shadeTally = emptyShadeTally();
  const shadeStates = emptyShadeStates();
  let d = 0;
  let r = 0;
  let tossup = 0;

  for (const [state, seats] of Object.entries(byState)) {
    const activeSeat = seats.find((s) => s.upIn2026);
    stateInfo[state] = { state, active: !!activeSeat, activeSeat, seats };

    if (activeSeat) {
      activeStates.add(state);
      const shade = picks[state] ?? "tossup";
      fills[state] = SHADE_COLORS[shade];
      shadeTally[shade] += 1;
      shadeStates[shade].push(state);
      const side = shadeSide(shade);
      if (side === "D") d += 1;
      else if (side === "R") r += 1;
      else tossup += 1;
    } else {
      fills[state] = NOT_UP_COLOR;
    }

    for (const seat of seats) {
      if (!seat.upIn2026) {
        if (seat.currentParty === "D") {
          d += 1;
          shadeTally.safeD += 1;
          shadeStates.safeD.push(state);
        } else if (seat.currentParty === "R") {
          r += 1;
          shadeTally.safeR += 1;
          shadeStates.safeR.push(state);
        }
      }
    }
  }

  return {
    fills,
    activeStates,
    stateInfo,
    shadeTally,
    shadeStates,
    d,
    r,
    tossup,
    total: d + r + tossup,
  };
}
