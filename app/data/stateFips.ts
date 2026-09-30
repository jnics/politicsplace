/** USPS code -> 2-digit state FIPS prefix, for every state that has county
 *  geometry (and so can be drilled + county-painted). Shared so any component
 *  can get a state's FIPS prefix synchronously, without waiting on the async
 *  county-geometry load that `StateZoom` itself needs one for. */
export const STATE_FIPS: Record<string, string> = {
  OH: "39", NC: "37", MI: "26", GA: "13", PA: "42", AZ: "04", WI: "55",
  NV: "32", TX: "48", VA: "51", NH: "33", MN: "27", CO: "08", NM: "35",
  KS: "20", IA: "19", ME: "23", MT: "30", NE: "31", OR: "41", AK: "02",
  SC: "45", IN: "18", WA: "53", CT: "09", TN: "47", MD: "24", MO: "29",
  UT: "49", KY: "21", AR: "05", WV: "54", ID: "16", SD: "46", ND: "38",
  DE: "10", VT: "50", WY: "56", HI: "15", RI: "44", MS: "28", OK: "40",
  NJ: "34", MA: "25", AL: "01", LA: "22", CA: "06", FL: "12", IL: "17",
  NY: "36",
};
