/**
 * Deterministic company names. A company the player can name in conversation
 * ("Northstar is at twelve thousand a month") is worth far more than
 * "Company 1", and it is the same seed every time so runs stay reproducible.
 */

const ROOTS = [
  "Northstar", "Ridgeline", "Paper Kite", "Common Thread", "Vela", "Morrow", "Fieldstone",
  "Signal House", "Lantern", "Copperline", "Harbourview", "Bright Fen", "Iron Willow",
  "Quarry", "Tidewater", "Waypoint", "Kestrel", "Almanac", "Foxglove", "Meridian",
  "Saltbox", "Overstory", "Cedarlark", "Halcyon", "Riverbend", "Thistle", "Blackpine",
  "Glasswing", "Fernway", "Longshore", "Ember", "Cloudbank", "Marlow", "Gravelroad",
  "Pale Horse", "Wintergreen", "Sunderland", "Beacon", "Trellis", "Windrose",
];

const SUFFIXES = [
  "Software", "Systems", "Labs", "Works", "Technologies", "Data", "Tools",
  "Collective", "Studio", "Industries", "Automation", "Analytics", "Cloud", "Digital",
];

export function companyNameFor(seed: number, companyNumber: number): string {
  const salt = (seed >>> 0) + companyNumber * 7919;
  const root = ROOTS[salt % ROOTS.length];
  const suffix = SUFFIXES[Math.floor(salt / ROOTS.length) % SUFFIXES.length];
  return `${root} ${suffix}`;
}

/** Short form for the wall sign and anywhere space is tight. */
export function companyShortName(name: string): string {
  return name.split(" ").slice(0, -1).join(" ") || name;
}
