import { SENATE_RESULTS, type SenateCycleYear } from "~/data/senateResults";
import { HISTORICAL_COLORS, SHADE_COLORS, shadeSide, type Shade } from "~/lib/shades";
import { buildSenateSeatContext, type SenateSeatContext } from "~/lib/senateComposition";

export const NOT_UP_COLOR = "#e4e4e7"; // zinc-200: no race this cycle

export function computeSenateHistoricalView(year: SenateCycleYear) {
  const races = SENATE_RESULTS[year];
  const fills: Record<string, string> = {};
  const upStates = new Set<string>();
  let dSeats = 0;
  let rSeats = 0;
  const seen = new Set<string>();

  for (const race of races) {
    if (seen.has(race.state)) continue; // de-dupe same-seat regular+special pairs
    seen.add(race.state);
    upStates.add(race.state);
    fills[race.state] = race.party === "D" ? HISTORICAL_COLORS.D : HISTORICAL_COLORS.R;
    if (race.party === "D") dSeats += 1;
    else rSeats += 1;
  }

  return { fills, upStates, dSeats, rSeats, totalRaces: dSeats + rSeats };
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
      const side = shadeSide(shade);
      if (side === "D") d += 1;
      else if (side === "R") r += 1;
      else tossup += 1;
    } else {
      fills[state] = NOT_UP_COLOR;
    }

    for (const seat of seats) {
      if (!seat.upIn2026) {
        if (seat.currentParty === "D") d += 1;
        else if (seat.currentParty === "R") r += 1;
      }
    }
  }

  return { fills, activeStates, stateInfo, d, r, tossup, total: d + r + tossup };
}
