import { SENATE_CLASSES } from "~/data/senateClasses";
import { SENATE_RESULTS, type SenateCycleYear } from "~/data/senateResults";
import { SENATE_2026_RACES } from "~/data/senate2026";

/** The most recent regular election year for each Senate class, as of the 2026 cycle. */
const LAST_ELECTION_FOR_CLASS: Record<1 | 2 | 3, SenateCycleYear> = {
  1: 2024,
  2: 2020,
  3: 2022,
};

/**
 * Party that won a given state's race in a given historical cycle, de-duplicated.
 * A few states had two ballot lines for the same seat in the same year (an
 * appointee winning both a special and the concurrent regular election -- e.g.
 * CA in 2022 and 2024). Those never disagree on party in our data, so we just
 * take the first match.
 */
export function partyForStateInCycle(
  state: string,
  year: SenateCycleYear
): "D" | "R" | null {
  const race = SENATE_RESULTS[year].find((r) => r.state === state);
  return race ? race.party : null;
}

function winnerForStateInCycle(state: string, year: SenateCycleYear): string | undefined {
  return SENATE_RESULTS[year].find((r) => r.state === state)?.winner;
}

export interface SenateSeatContext {
  state: string;
  /** Which class this seat belongs to. */
  seatClass: 1 | 2 | 3;
  /** Is this seat one of the races on the November 2026 ballot? */
  upIn2026: boolean;
  /** Party currently holding the seat (only meaningful when NOT up in 2026 --
   * for 2026 seats, use the interactive prediction instead). */
  currentParty: "D" | "R" | null;
  /** Human-readable note, e.g. why an incumbent isn't seeking re-election. */
  note?: string;
  /** Name of the senator currently holding this seat, where known. */
  incumbent?: string;
  /** True if this seat's 2026 race is a special election (only ever set when upIn2026). */
  special?: boolean;
}

/**
 * For every state, describe both of its Senate seats: which is up for
 * election in 2026 (if either), and -- for the seat(s) that are NOT up --
 * who currently holds it, derived from the most recent election for that
 * seat's class. This lets the 2026 tab show the full 100-seat chamber for
 * context, not just the 35 active races.
 */
export function buildSenateSeatContext(): Record<string, SenateSeatContext[]> {
  const byState: Record<string, SenateSeatContext[]> = {};

  for (const [state, classInfo] of Object.entries(SENATE_CLASSES)) {
    const seats: SenateSeatContext[] = [];
    const classes: (1 | 2 | 3)[] = [];
    if (classInfo.class1seat) classes.push(1);
    if (classInfo.class2seat) classes.push(2);
    if (classInfo.class3seat) classes.push(3);

    const race2026 = SENATE_2026_RACES.find((r) => r.state === state);

    // Which class is actually up in 2026 for this state? For the 33 states
    // with a class-2 seat, it's always that seat (the regular Class 2
    // election). Florida and Ohio have NO class-2 seat at all -- their 2026
    // race is a special election for their class-3 seat (vacated by Rubio
    // and Vance respectively in Jan 2025); their class-1 seat is confirmed
    // separately as not up (Rick Scott / Bernie Moreno, elected 2024).
    let upClass: 1 | 2 | 3 | null = null;
    if (race2026) {
      upClass = classInfo.class2seat ? 2 : 3;
    }

    for (const seatClass of classes) {
      const isThe2026Seat = seatClass === upClass;

      if (isThe2026Seat) {
        seats.push({
          state,
          seatClass,
          upIn2026: true,
          currentParty: race2026!.party,
          note: race2026!.note,
          incumbent: race2026!.incumbent,
          special: race2026!.special,
        });
      } else {
        const year = LAST_ELECTION_FOR_CLASS[seatClass];
        seats.push({
          state,
          seatClass,
          upIn2026: false,
          currentParty: partyForStateInCycle(state, year),
          incumbent: winnerForStateInCycle(state, year),
        });
      }
    }

    byState[state] = seats;
  }

  return byState;
}

export interface SenateTally {
  D: number;
  R: number;
  tossup: number;
}
