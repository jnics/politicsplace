// Live results for the 2026 Big Board (/election2026). Empty until election
// night -- fill from poll-tape / county-BOE feeds. Keyed by race id:
//   "<chamber>:<state>:<district|>"  e.g. "senate:OH:" , "house:OH:7"
//
// This stays a plain module for now; if results start coming from a file/feed
// during the count, swap in a generated JSON the same way polls.generated.json
// merges into polls.ts.

import type { BoardParty, BoardRace } from "~/data/bigBoard2026";

export interface BoardResult {
  /** 0-100. */
  reportedPct: number;
  /** candidate name -> votes counted so far. */
  votes: Record<string, number>;
  /** Set once a race is called. */
  called?: BoardParty;
}

export const BOARD_RESULTS: Record<string, BoardResult> = {};

export function raceId(r: Pick<BoardRace, "chamber" | "state" | "district">): string {
  return `${r.chamber}:${r.state ?? ""}:${r.district ?? ""}`;
}

export function boardResult(r: BoardRace): BoardResult | undefined {
  return BOARD_RESULTS[raceId(r)];
}
