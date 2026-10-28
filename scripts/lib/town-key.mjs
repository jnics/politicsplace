/** "Bethel town" / "BETHEL" / "Saint George" / "Unity Twp" -> a comparable
 *  key for New England towns, shared by build-town-county.mjs and the
 *  early-vote pull. Drops the Census class suffix ("town", "city",
 *  "unorganized territory", ...) and anything not a letter. Plantations keep
 *  a marker: Maine has both a Lincoln town and a Lincoln Plantation. */
export const townKey = (name) =>
  String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\bplantation\b/g, "plt")
    .replace(
      /\b(town|city|township|twp|unorganized territory|unorg|ut|gore|grant|location|purchase|reservation|island|cdp)\b\.?/g,
      ""
    )
    .replace(/\bsaint\b/g, "st")
    .replace(/\bmount\b/g, "mt")
    .replace(/[^a-z]/g, "");
