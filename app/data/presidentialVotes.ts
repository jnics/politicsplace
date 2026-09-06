// State-level two-party vote counts/percentages for the presidential races,
// 2016 (Clinton v Trump) / 2020 (Biden v Trump) / 2024 (Harris v Trump).
// Sourced primarily from Wikipedia's per-state "20XX United States
// presidential election in [State]" articles; see project research notes.
// The gap between dPct+rPct and 100 is third-party/write-in share.

export interface PresidentialVoteEntry {
  dVotes: number;
  dPct: number;
  rVotes: number;
  rPct: number;
}

export const PRESIDENTIAL_VOTES: Record<string, Record<string, PresidentialVoteEntry>> = {
  "2016": {
    "AL": {
      "dVotes": 729547,
      "dPct": 34.36,
      "rVotes": 1318255,
      "rPct": 62.08
    },
    "AK": {
      "dVotes": 116454,
      "dPct": 36.55,
      "rVotes": 163387,
      "rPct": 51.28
    },
    "AZ": {
      "dVotes": 1161167,
      "dPct": 45.13,
      "rVotes": 1252401,
      "rPct": 48.67
    },
    "AR": {
      "dVotes": 380494,
      "dPct": 33.65,
      "rVotes": 684872,
      "rPct": 60.57
    },
    "CA": {
      "dVotes": 8753788,
      "dPct": 61.73,
      "rVotes": 4483810,
      "rPct": 31.62
    },
    "CO": {
      "dVotes": 1338870,
      "dPct": 48.16,
      "rVotes": 1202484,
      "rPct": 43.25
    },
    "CT": {
      "dVotes": 897572,
      "dPct": 54.57,
      "rVotes": 673215,
      "rPct": 40.93
    },
    "DE": {
      "dVotes": 235603,
      "dPct": 53.09,
      "rVotes": 185127,
      "rPct": 41.72
    },
    "FL": {
      "dVotes": 4504975,
      "dPct": 47.82,
      "rVotes": 4617886,
      "rPct": 49.02
    },
    "GA": {
      "dVotes": 1877963,
      "dPct": 45.64,
      "rVotes": 2089104,
      "rPct": 50.77
    },
    "HI": {
      "dVotes": 266891,
      "dPct": 62.22,
      "rVotes": 128847,
      "rPct": 30.04
    },
    "ID": {
      "dVotes": 189765,
      "dPct": 27.49,
      "rVotes": 409055,
      "rPct": 59.26
    },
    "IL": {
      "dVotes": 3090729,
      "dPct": 55.83,
      "rVotes": 2146015,
      "rPct": 38.76
    },
    "IN": {
      "dVotes": 1033126,
      "dPct": 37.77,
      "rVotes": 1557286,
      "rPct": 56.82
    },
    "IA": {
      "dVotes": 653669,
      "dPct": 41.74,
      "rVotes": 800983,
      "rPct": 51.15
    },
    "KS": {
      "dVotes": 427005,
      "dPct": 36.05,
      "rVotes": 671018,
      "rPct": 56.65
    },
    "KY": {
      "dVotes": 628854,
      "dPct": 32.68,
      "rVotes": 1202971,
      "rPct": 62.52
    },
    "LA": {
      "dVotes": 780154,
      "dPct": 38.45,
      "rVotes": 1178638,
      "rPct": 58.09
    },
    "ME": {
      "dVotes": 357735,
      "dPct": 47.83,
      "rVotes": 335593,
      "rPct": 44.87
    },
    "MD": {
      "dVotes": 1677928,
      "dPct": 60.33,
      "rVotes": 943169,
      "rPct": 33.91
    },
    "MA": {
      "dVotes": 1995196,
      "dPct": 60.01,
      "rVotes": 1090893,
      "rPct": 32.81
    },
    "MI": {
      "dVotes": 2268839,
      "dPct": 47.27,
      "rVotes": 2279543,
      "rPct": 47.5
    },
    "MN": {
      "dVotes": 1367716,
      "dPct": 46.44,
      "rVotes": 1322951,
      "rPct": 44.93
    },
    "MS": {
      "dVotes": 485131,
      "dPct": 40.06,
      "rVotes": 700714,
      "rPct": 57.86
    },
    "MO": {
      "dVotes": 1071068,
      "dPct": 38.14,
      "rVotes": 1594511,
      "rPct": 56.77
    },
    "MT": {
      "dVotes": 177709,
      "dPct": 35.75,
      "rVotes": 279240,
      "rPct": 56.17
    },
    "NE": {
      "dVotes": 284494,
      "dPct": 33.7,
      "rVotes": 495961,
      "rPct": 58.75
    },
    "NV": {
      "dVotes": 539260,
      "dPct": 47.92,
      "rVotes": 512058,
      "rPct": 45.5
    },
    "NH": {
      "dVotes": 348526,
      "dPct": 46.98,
      "rVotes": 345790,
      "rPct": 46.61
    },
    "NJ": {
      "dVotes": 2148278,
      "dPct": 55.45,
      "rVotes": 1601933,
      "rPct": 41.35
    },
    "NM": {
      "dVotes": 385234,
      "dPct": 48.26,
      "rVotes": 319666,
      "rPct": 40.04
    },
    "NY": {
      "dVotes": 4556124,
      "dPct": 59.01,
      "rVotes": 2819534,
      "rPct": 36.52
    },
    "NC": {
      "dVotes": 2189316,
      "dPct": 46.17,
      "rVotes": 2362631,
      "rPct": 49.83
    },
    "ND": {
      "dVotes": 93758,
      "dPct": 27.23,
      "rVotes": 216794,
      "rPct": 62.96
    },
    "OH": {
      "dVotes": 2394164,
      "dPct": 43.56,
      "rVotes": 2841005,
      "rPct": 51.69
    },
    "OK": {
      "dVotes": 420375,
      "dPct": 28.93,
      "rVotes": 949136,
      "rPct": 65.32
    },
    "OR": {
      "dVotes": 1002106,
      "dPct": 50.07,
      "rVotes": 782403,
      "rPct": 39.09
    },
    "PA": {
      "dVotes": 2926441,
      "dPct": 47.46,
      "rVotes": 2970733,
      "rPct": 48.18
    },
    "RI": {
      "dVotes": 252525,
      "dPct": 54.41,
      "rVotes": 180543,
      "rPct": 38.9
    },
    "SC": {
      "dVotes": 855373,
      "dPct": 40.67,
      "rVotes": 1155389,
      "rPct": 54.94
    },
    "SD": {
      "dVotes": 117458,
      "dPct": 31.74,
      "rVotes": 227721,
      "rPct": 61.53
    },
    "TN": {
      "dVotes": 870695,
      "dPct": 34.72,
      "rVotes": 1522925,
      "rPct": 60.72
    },
    "TX": {
      "dVotes": 3877868,
      "dPct": 43.24,
      "rVotes": 4685047,
      "rPct": 52.23
    },
    "UT": {
      "dVotes": 310676,
      "dPct": 27.46,
      "rVotes": 515231,
      "rPct": 45.54
    },
    "VT": {
      "dVotes": 178573,
      "dPct": 56.68,
      "rVotes": 95369,
      "rPct": 30.27
    },
    "VA": {
      "dVotes": 1981473,
      "dPct": 49.73,
      "rVotes": 1769443,
      "rPct": 44.41
    },
    "WA": {
      "dVotes": 1742718,
      "dPct": 52.54,
      "rVotes": 1221747,
      "rPct": 36.83
    },
    "WV": {
      "dVotes": 188794,
      "dPct": 26.43,
      "rVotes": 489371,
      "rPct": 68.5
    },
    "WI": {
      "dVotes": 1382536,
      "dPct": 46.45,
      "rVotes": 1405284,
      "rPct": 47.22
    },
    "WY": {
      "dVotes": 55973,
      "dPct": 21.63,
      "rVotes": 174419,
      "rPct": 67.4
    },
    "DC": {
      "dVotes": 282830,
      "dPct": 90.86,
      "rVotes": 12723,
      "rPct": 4.09
    }
  },
  "2020": {
    "AL": {
      "dVotes": 849624,
      "dPct": 36.57,
      "rVotes": 1441170,
      "rPct": 62.03
    },
    "AK": {
      "dVotes": 153778,
      "dPct": 42.77,
      "rVotes": 189951,
      "rPct": 52.83
    },
    "AZ": {
      "dVotes": 1672143,
      "dPct": 49.36,
      "rVotes": 1661686,
      "rPct": 49.06
    },
    "AR": {
      "dVotes": 423932,
      "dPct": 34.78,
      "rVotes": 760647,
      "rPct": 62.4
    },
    "CA": {
      "dVotes": 11110250,
      "dPct": 63.48,
      "rVotes": 6006429,
      "rPct": 34.32
    },
    "CO": {
      "dVotes": 1804352,
      "dPct": 55.4,
      "rVotes": 1364607,
      "rPct": 41.9
    },
    "CT": {
      "dVotes": 1080831,
      "dPct": 59.26,
      "rVotes": 714717,
      "rPct": 39.19
    },
    "DE": {
      "dVotes": 296268,
      "dPct": 58.74,
      "rVotes": 200603,
      "rPct": 39.77
    },
    "FL": {
      "dVotes": 5297045,
      "dPct": 47.86,
      "rVotes": 5668731,
      "rPct": 51.22
    },
    "GA": {
      "dVotes": 2473633,
      "dPct": 49.51,
      "rVotes": 2461854,
      "rPct": 49.24
    },
    "HI": {
      "dVotes": 366130,
      "dPct": 63.73,
      "rVotes": 196864,
      "rPct": 34.27
    },
    "ID": {
      "dVotes": 287021,
      "dPct": 33.07,
      "rVotes": 554119,
      "rPct": 63.84
    },
    "IL": {
      "dVotes": 3471915,
      "dPct": 57.54,
      "rVotes": 2446891,
      "rPct": 40.55
    },
    "IN": {
      "dVotes": 1242413,
      "dPct": 40.96,
      "rVotes": 1729519,
      "rPct": 57.02
    },
    "IA": {
      "dVotes": 759061,
      "dPct": 44.89,
      "rVotes": 897672,
      "rPct": 53.09
    },
    "KS": {
      "dVotes": 570323,
      "dPct": 41.56,
      "rVotes": 771406,
      "rPct": 56.14
    },
    "KY": {
      "dVotes": 772474,
      "dPct": 36.15,
      "rVotes": 1326646,
      "rPct": 62.09
    },
    "LA": {
      "dVotes": 856034,
      "dPct": 39.85,
      "rVotes": 1255776,
      "rPct": 58.46
    },
    "ME": {
      "dVotes": 435072,
      "dPct": 53.09,
      "rVotes": 360737,
      "rPct": 44.02
    },
    "MD": {
      "dVotes": 1985023,
      "dPct": 65.36,
      "rVotes": 976414,
      "rPct": 32.15
    },
    "MA": {
      "dVotes": 2382202,
      "dPct": 65.6,
      "rVotes": 1167202,
      "rPct": 32.14
    },
    "MI": {
      "dVotes": 2804040,
      "dPct": 50.62,
      "rVotes": 2649852,
      "rPct": 47.84
    },
    "MN": {
      "dVotes": 1717077,
      "dPct": 52.4,
      "rVotes": 1484065,
      "rPct": 45.28
    },
    "MS": {
      "dVotes": 539398,
      "dPct": 41.06,
      "rVotes": 756764,
      "rPct": 57.6
    },
    "MO": {
      "dVotes": 1253014,
      "dPct": 41.41,
      "rVotes": 1718736,
      "rPct": 56.8
    },
    "MT": {
      "dVotes": 244786,
      "dPct": 40.55,
      "rVotes": 343602,
      "rPct": 56.92
    },
    "NE": {
      "dVotes": 374583,
      "dPct": 39.17,
      "rVotes": 556846,
      "rPct": 58.22
    },
    "NV": {
      "dVotes": 703486,
      "dPct": 50.06,
      "rVotes": 669890,
      "rPct": 47.67
    },
    "NH": {
      "dVotes": 424937,
      "dPct": 52.71,
      "rVotes": 365654,
      "rPct": 45.36
    },
    "NJ": {
      "dVotes": 2608335,
      "dPct": 57.33,
      "rVotes": 1883274,
      "rPct": 41.4
    },
    "NM": {
      "dVotes": 501614,
      "dPct": 54.29,
      "rVotes": 401894,
      "rPct": 43.5
    },
    "NY": {
      "dVotes": 5244886,
      "dPct": 60.61,
      "rVotes": 3251997,
      "rPct": 37.66
    },
    "NC": {
      "dVotes": 2684292,
      "dPct": 48.59,
      "rVotes": 2758775,
      "rPct": 49.93
    },
    "ND": {
      "dVotes": 114902,
      "dPct": 31.76,
      "rVotes": 235595,
      "rPct": 65.11
    },
    "OH": {
      "dVotes": 2679165,
      "dPct": 45.24,
      "rVotes": 3154834,
      "rPct": 53.27
    },
    "OK": {
      "dVotes": 503890,
      "dPct": 32.29,
      "rVotes": 1020280,
      "rPct": 65.37
    },
    "OR": {
      "dVotes": 1340383,
      "dPct": 56.45,
      "rVotes": 958448,
      "rPct": 40.37
    },
    "PA": {
      "dVotes": 3458229,
      "dPct": 50.01,
      "rVotes": 3377674,
      "rPct": 48.84
    },
    "RI": {
      "dVotes": 307486,
      "dPct": 59.39,
      "rVotes": 199922,
      "rPct": 38.61
    },
    "SC": {
      "dVotes": 1091541,
      "dPct": 43.43,
      "rVotes": 1385103,
      "rPct": 55.11
    },
    "SD": {
      "dVotes": 150471,
      "dPct": 35.61,
      "rVotes": 261043,
      "rPct": 61.77
    },
    "TN": {
      "dVotes": 1143711,
      "dPct": 37.45,
      "rVotes": 1852475,
      "rPct": 60.66
    },
    "TX": {
      "dVotes": 5259126,
      "dPct": 46.48,
      "rVotes": 5890347,
      "rPct": 52.06
    },
    "UT": {
      "dVotes": 560282,
      "dPct": 37.65,
      "rVotes": 865140,
      "rPct": 58.13
    },
    "VT": {
      "dVotes": 242820,
      "dPct": 66.09,
      "rVotes": 112704,
      "rPct": 30.67
    },
    "VA": {
      "dVotes": 2413568,
      "dPct": 54.11,
      "rVotes": 1962430,
      "rPct": 44.0
    },
    "WA": {
      "dVotes": 2369612,
      "dPct": 58.41,
      "rVotes": 1584651,
      "rPct": 39.06
    },
    "WV": {
      "dVotes": 235984,
      "dPct": 29.69,
      "rVotes": 545382,
      "rPct": 68.62
    },
    "WI": {
      "dVotes": 1630866,
      "dPct": 49.45,
      "rVotes": 1610184,
      "rPct": 48.82
    },
    "WY": {
      "dVotes": 73491,
      "dPct": 26.55,
      "rVotes": 193559,
      "rPct": 69.94
    },
    "DC": {
      "dVotes": 317323,
      "dPct": 92.15,
      "rVotes": 18586,
      "rPct": 5.4
    }
  },
  "2024": {
    "AL": {
      "dVotes": 772412,
      "dPct": 34.1,
      "rVotes": 1462616,
      "rPct": 64.57
    },
    "AK": {
      "dVotes": 140026,
      "dPct": 41.41,
      "rVotes": 184458,
      "rPct": 54.54
    },
    "AZ": {
      "dVotes": 1582860,
      "dPct": 46.69,
      "rVotes": 1770242,
      "rPct": 52.22
    },
    "AR": {
      "dVotes": 396905,
      "dPct": 33.56,
      "rVotes": 759241,
      "rPct": 64.2
    },
    "CA": {
      "dVotes": 9276179,
      "dPct": 58.47,
      "rVotes": 6081697,
      "rPct": 38.33
    },
    "CO": {
      "dVotes": 1728159,
      "dPct": 54.13,
      "rVotes": 1377441,
      "rPct": 43.14
    },
    "CT": {
      "dVotes": 992053,
      "dPct": 56.4,
      "rVotes": 736918,
      "rPct": 41.89
    },
    "DE": {
      "dVotes": 289758,
      "dPct": 56.49,
      "rVotes": 214351,
      "rPct": 41.79
    },
    "FL": {
      "dVotes": 4683038,
      "dPct": 42.99,
      "rVotes": 6110125,
      "rPct": 56.09
    },
    "GA": {
      "dVotes": 2548017,
      "dPct": 48.53,
      "rVotes": 2663117,
      "rPct": 50.73
    },
    "HI": {
      "dVotes": 313044,
      "dPct": 60.59,
      "rVotes": 193661,
      "rPct": 37.48
    },
    "ID": {
      "dVotes": 274972,
      "dPct": 30.38,
      "rVotes": 605246,
      "rPct": 66.87
    },
    "IL": {
      "dVotes": 3062863,
      "dPct": 54.37,
      "rVotes": 2449079,
      "rPct": 43.47
    },
    "IN": {
      "dVotes": 1163603,
      "dPct": 39.62,
      "rVotes": 1720347,
      "rPct": 58.58
    },
    "IA": {
      "dVotes": 707278,
      "dPct": 42.52,
      "rVotes": 927019,
      "rPct": 55.73
    },
    "KS": {
      "dVotes": 544853,
      "dPct": 41.04,
      "rVotes": 758802,
      "rPct": 57.16
    },
    "KY": {
      "dVotes": 704043,
      "dPct": 33.94,
      "rVotes": 1337494,
      "rPct": 64.47
    },
    "LA": {
      "dVotes": 766870,
      "dPct": 38.21,
      "rVotes": 1208505,
      "rPct": 60.22
    },
    "ME": {
      "dVotes": 435652,
      "dPct": 52.4,
      "rVotes": 377977,
      "rPct": 45.46
    },
    "MD": {
      "dVotes": 1902577,
      "dPct": 62.62,
      "rVotes": 1035550,
      "rPct": 34.08
    },
    "MA": {
      "dVotes": 2126518,
      "dPct": 61.22,
      "rVotes": 1251303,
      "rPct": 36.02
    },
    "MI": {
      "dVotes": 2736533,
      "dPct": 48.31,
      "rVotes": 2816636,
      "rPct": 49.73
    },
    "MN": {
      "dVotes": 1656979,
      "dPct": 50.92,
      "rVotes": 1519032,
      "rPct": 46.68
    },
    "MS": {
      "dVotes": 466668,
      "dPct": 38.0,
      "rVotes": 747744,
      "rPct": 60.89
    },
    "MO": {
      "dVotes": 1200599,
      "dPct": 40.08,
      "rVotes": 1751986,
      "rPct": 58.49
    },
    "MT": {
      "dVotes": 231906,
      "dPct": 38.46,
      "rVotes": 352079,
      "rPct": 58.39
    },
    "NE": {
      "dVotes": 369995,
      "dPct": 38.86,
      "rVotes": 564816,
      "rPct": 59.32
    },
    "NV": {
      "dVotes": 705197,
      "dPct": 47.49,
      "rVotes": 751205,
      "rPct": 50.59
    },
    "NH": {
      "dVotes": 418488,
      "dPct": 50.65,
      "rVotes": 395523,
      "rPct": 47.87
    },
    "NJ": {
      "dVotes": 2220713,
      "dPct": 51.97,
      "rVotes": 1968215,
      "rPct": 46.06
    },
    "NM": {
      "dVotes": 478802,
      "dPct": 51.85,
      "rVotes": 423391,
      "rPct": 45.85
    },
    "NY": {
      "dVotes": 4619195,
      "dPct": 55.91,
      "rVotes": 3578899,
      "rPct": 43.31
    },
    "NC": {
      "dVotes": 2715375,
      "dPct": 47.65,
      "rVotes": 2898423,
      "rPct": 50.86
    },
    "ND": {
      "dVotes": 112327,
      "dPct": 30.51,
      "rVotes": 246505,
      "rPct": 66.96
    },
    "OH": {
      "dVotes": 2533699,
      "dPct": 43.93,
      "rVotes": 3180116,
      "rPct": 55.14
    },
    "OK": {
      "dVotes": 499599,
      "dPct": 31.9,
      "rVotes": 1036213,
      "rPct": 66.16
    },
    "OR": {
      "dVotes": 1240600,
      "dPct": 55.27,
      "rVotes": 919480,
      "rPct": 40.97
    },
    "PA": {
      "dVotes": 3423042,
      "dPct": 48.66,
      "rVotes": 3543308,
      "rPct": 50.37
    },
    "RI": {
      "dVotes": 285156,
      "dPct": 55.54,
      "rVotes": 214406,
      "rPct": 41.76
    },
    "SC": {
      "dVotes": 1028452,
      "dPct": 40.36,
      "rVotes": 1483747,
      "rPct": 58.23
    },
    "SD": {
      "dVotes": 146859,
      "dPct": 34.24,
      "rVotes": 272081,
      "rPct": 63.43
    },
    "TN": {
      "dVotes": 1056265,
      "dPct": 34.47,
      "rVotes": 1966865,
      "rPct": 64.19
    },
    "TX": {
      "dVotes": 4835250,
      "dPct": 42.46,
      "rVotes": 6393597,
      "rPct": 56.14
    },
    "UT": {
      "dVotes": 562566,
      "dPct": 37.79,
      "rVotes": 883818,
      "rPct": 59.38
    },
    "VT": {
      "dVotes": 235791,
      "dPct": 63.83,
      "rVotes": 119395,
      "rPct": 32.32
    },
    "VA": {
      "dVotes": 2335395,
      "dPct": 51.83,
      "rVotes": 2075085,
      "rPct": 46.05
    },
    "WA": {
      "dVotes": 2245849,
      "dPct": 57.23,
      "rVotes": 1530923,
      "rPct": 39.01
    },
    "WV": {
      "dVotes": 214309,
      "dPct": 28.11,
      "rVotes": 533556,
      "rPct": 69.98
    },
    "WI": {
      "dVotes": 1668229,
      "dPct": 48.74,
      "rVotes": 1697626,
      "rPct": 49.6
    },
    "WY": {
      "dVotes": 69527,
      "dPct": 25.84,
      "rVotes": 192633,
      "rPct": 71.6
    },
    "DC": {
      "dVotes": 294185,
      "dPct": 90.28,
      "rVotes": 21076,
      "rPct": 6.47
    }
  }
};
