// The 7-point prediction spectrum used by the interactive (2026) map, in the
// same spirit as 270toWin: a state can be called anywhere from "Safe D" to
// "Safe R", with "Toss-up" in the middle.

export type Shade =
  | "safeD"
  | "likelyD"
  | "leanD"
  | "tossup"
  | "leanR"
  | "likelyR"
  | "safeR";

export const SHADE_ORDER: Shade[] = [
  "safeD",
  "likelyD",
  "leanD",
  "tossup",
  "leanR",
  "likelyR",
  "safeR",
];

export const SHADE_LABELS: Record<Shade, string> = {
  safeD: "Safe Democratic",
  likelyD: "Likely Democratic",
  leanD: "Lean Democratic",
  tossup: "Toss-up",
  leanR: "Lean Republican",
  likelyR: "Likely Republican",
  safeR: "Safe Republican",
};

// Compact labels for tight spots like the donut-chart legend.
export const SHADE_SHORT_LABELS: Record<Shade, string> = {
  safeD: "Safe D",
  likelyD: "Likely D",
  leanD: "Lean D",
  tossup: "Toss-up",
  leanR: "Lean R",
  likelyR: "Likely R",
  safeR: "Safe R",
};

/** An all-zero tally over the 7 shades, ready to accumulate into. */
export function emptyShadeTally(): Record<Shade, number> {
  return { safeD: 0, likelyD: 0, leanD: 0, tossup: 0, leanR: 0, likelyR: 0, safeR: 0 };
}

/** An empty per-shade list of state codes, ready to push into. */
export function emptyShadeStates(): Record<Shade, string[]> {
  return { safeD: [], likelyD: [], leanD: [], tossup: [], leanR: [], likelyR: [], safeR: [] };
}

// Fill colors for the interactive spectrum.
export const SHADE_COLORS: Record<Shade, string> = {
  safeD: "#1d4ed8", // blue-700
  likelyD: "#3b82f6", // blue-500
  leanD: "#93c5fd", // blue-300
  tossup: "#d4d4d8", // zinc-300
  leanR: "#fca5a5", // red-300
  likelyR: "#ef4444", // red-500
  safeR: "#b91c1c", // red-700
};

export function shadeSide(shade: Shade): "D" | "R" | "tossup" {
  if (shade === "tossup") return "tossup";
  return shade.endsWith("D") ? "D" : "R";
}

export function cycleShade(shade: Shade, direction: 1 | -1): Shade {
  const idx = SHADE_ORDER.indexOf(shade);
  const next = (idx + direction + SHADE_ORDER.length) % SHADE_ORDER.length;
  return SHADE_ORDER[next];
}

// Solid colors used for READ-ONLY historical results (actual D/R outcomes,
// not predictions) -- deliberately a different pair of tones from the
// prediction spectrum so it's visually obvious "this happened" vs.
// "this is a guess."
export const HISTORICAL_COLORS = {
  D: "#2563eb", // blue-600
  R: "#dc2626", // red-600
  vacant: "#a1a1aa", // zinc-400 (no data / not applicable, e.g. DC on a Senate map)
};

// Muted colors for Senate seats that are NOT up in a given cycle (shown for
// context, not interactive).
export const LOCKED_COLORS = {
  D: "#93a5c4",
  R: "#c99a95",
  vacant: "#d4d4d8",
};
