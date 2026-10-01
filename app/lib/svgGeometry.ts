// Tiny SVG path helpers shared by StateZoom (county/district maps) and UsMap
// (the national map) for placing overlay markers — shift arrows, turnout
// circles — at a shape's rough center.

/**
 * Absolute on-path points from an SVG path `d` string.
 *
 * Walks the path commands with a cursor instead of just regex-pulling every
 * number: county/district paths (from the TopoJSON pipeline) are all
 * absolute (M/L/Z), but the national STATE_PATHS data uses relative
 * commands (l/c/h/v) heavily, where most numbers are small deltas. Treating
 * those deltas as absolute coordinates (the old approach) dragged every
 * centroid toward the origin. Curve control points are skipped — only
 * segment endpoints are kept — since control points can lie well outside
 * the shape and would skew a mean-of-points centroid.
 */
export function pathPoints(d: string): [number, number][] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];
  const pts: [number, number][] = [];
  let i = 0;
  let cx = 0, cy = 0; // current point
  let sx = 0, sy = 0; // current subpath's start point
  let cmd = "";

  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      cmd = tokens[i];
      i++;
    }
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case "M": {
        const x = num(), y = num();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        sx = cx; sy = cy;
        pts.push([cx, cy]);
        // Subsequent coordinate pairs after an (M/m) are implicit linetos.
        cmd = rel ? "l" : "L";
        break;
      }
      case "L": {
        const x = num(), y = num();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        pts.push([cx, cy]);
        break;
      }
      case "H": {
        const x = num();
        cx = rel ? cx + x : x;
        pts.push([cx, cy]);
        break;
      }
      case "V": {
        const y = num();
        cy = rel ? cy + y : y;
        pts.push([cx, cy]);
        break;
      }
      case "C": {
        num(); num(); num(); num(); // control points, ignored
        const x = num(), y = num();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        pts.push([cx, cy]);
        break;
      }
      case "S":
      case "Q": {
        num(); num(); // one control point, ignored
        const x = num(), y = num();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        pts.push([cx, cy]);
        break;
      }
      case "T": {
        const x = num(), y = num();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        pts.push([cx, cy]);
        break;
      }
      case "A": {
        num(); num(); num(); num(); num(); // rx ry x-axis-rotation large-arc sweep
        const x = num(), y = num();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        pts.push([cx, cy]);
        break;
      }
      case "Z":
        cx = sx; cy = sy;
        break;
      default:
        i++; // unrecognized token, skip to avoid an infinite loop
    }
  }
  return pts;
}

/** Centroid of a set of points — the mean of every coordinate in the path,
 *  not a true polygon centroid, but good enough to park a label or marker. */
export function centroidOf(pts: [number, number][]): [number, number] {
  let x = 0, y = 0;
  for (const [px, py] of pts) {
    x += px;
    y += py;
  }
  return [x / pts.length, y / pts.length];
}

/** Polygon area via the shoelace formula (always positive, winding-order
 *  independent). Used to size one shape's own shift-arrow/turnout-circle to
 *  ITS OWN area rather than a shared average across every shape in the
 *  view — a single state- or district-wide average unit looks right only
 *  when every shape in the group is close to the same size, and badly
 *  oversizes arrows on small counties sitting next to one much bigger one
 *  (an anchor county like Fulton next to several small suburban counties,
 *  the exact case that surfaced this). Multiple subpaths (an interior hole,
 *  or an island county) are summed, not just the first. */
export function polygonArea(pts: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}
