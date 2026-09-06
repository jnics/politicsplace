// The resulting party balance of the full 100-seat Senate immediately after each
// November election cycle (independents folded into the party they caucus with:
// Angus King and Bernie Sanders with the Democrats, plus Kyrsten Sinema for
// 2022). These are well-established historical totals; they let the historical
// Senate donut show the whole chamber, not just the ~34 seats decided that year.

export interface SenateChamber {
  /** Democrats + independents who caucus with them. */
  dCaucus: number;
  /** Republicans + independents who caucus with them. */
  rCaucus: number;
  note: string;
}

export const SENATE_CHAMBER: Record<number, SenateChamber> = {
  2016: {
    dCaucus: 48,
    rCaucus: 52,
    note: "Republicans held their majority; Democrats netted two seats (IL, NH).",
  },
  2018: {
    dCaucus: 47,
    rCaucus: 53,
    note: "Republicans gained two on a favorable map, flipping ND, IN, MO and FL while losing NV and AZ.",
  },
  2020: {
    dCaucus: 50,
    rCaucus: 50,
    note: "A 50-50 chamber; Democrats took control via VP Harris's tie-breaking vote after winning both January 2021 Georgia runoffs.",
  },
  2022: {
    dCaucus: 51,
    rCaucus: 49,
    note: "Democrats netted one seat (PA), reaching an outright 51-seat majority despite the president's party usually losing ground.",
  },
  2024: {
    dCaucus: 47,
    rCaucus: 53,
    note: "Republicans netted four (WV, OH, MT, PA) to retake the majority.",
  },
};
