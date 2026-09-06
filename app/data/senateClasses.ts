// Which Senate "class" each state's seat(s) belong to.
// Class 1 seats are up in years like 2018 / 2024 / 2030.
// Class 2 seats are up in years like 2020 / 2026 / 2032.
// Class 3 seats are up in years like 2016 / 2022 / 2028.
// Every state has exactly one seat in two of the three classes (never all three).
// Verified against The Green Papers + Wikipedia's current-senators list (no exceptions found).

export interface SenateClassInfo {
  class1seat: 1 | null;
  class2seat: 2 | null;
  class3seat: 3 | null;
}

export const SENATE_CLASSES: Record<string, SenateClassInfo> = {
  "AL": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "AK": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "AZ": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "AR": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "CA": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "CO": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "CT": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "DE": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "FL": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "GA": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "HI": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "ID": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "IL": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "IN": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "IA": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "KS": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "KY": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "LA": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "ME": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "MD": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "MA": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "MI": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "MN": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "MS": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "MO": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "MT": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "NE": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "NV": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "NH": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "NJ": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "NM": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "NY": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "NC": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "ND": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "OH": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "OK": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "OR": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "PA": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "RI": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "SC": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "SD": {
    "class1seat": null,
    "class2seat": 2,
    "class3seat": 3
  },
  "TN": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "TX": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "UT": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "VT": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "VA": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "WA": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "WV": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  },
  "WI": {
    "class1seat": 1,
    "class2seat": null,
    "class3seat": 3
  },
  "WY": {
    "class1seat": 1,
    "class2seat": 2,
    "class3seat": null
  }
};
