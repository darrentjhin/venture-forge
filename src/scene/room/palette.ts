/**
 * The 32-colour source palette for the office. Props reuse these colours
 * instead of inventing slightly different greys, woods and teals. Lighting is
 * a separate overlay, so a late-night office stays saturated and readable.
 */
export const PIXEL_COLORS = [
  "#14161f", "#232839", "#3d7d96", "#31687e", "#a6f0ea", "#336b84", "#5fa2ba", "#c07c46",
  "#b06f3e", "#8d5730", "#6b4224", "#f6cba4", "#e8b184", "#cf9165", "#ac6f46", "#8a5432",
  "#653c22", "#f0bd93", "#bd7f52", "#2b1d16", "#120f0e", "#6b3f22", "#b5762f", "#e0c07a",
  "#4a3a30", "#2ec4d6", "#ff8c42", "#a45fd6", "#4fc46a", "#e05a5a", "#4a7fd6", "#2c3550",
] as const;

export const INK = PIXEL_COLORS[0];
export const INK_SOFT = PIXEL_COLORS[1];

export interface Palette {
  wall: string; wallDark: string; wallTrim: string; wainscot: string; wainscotEdge: string;
  floorA: string; floorB: string; floorLine: string; floorEdge: string;
  glow: number; dim: number;
}

const BASE = {
  wall: PIXEL_COLORS[2], wallDark: PIXEL_COLORS[3], wallTrim: PIXEL_COLORS[4], wainscot: PIXEL_COLORS[5], wainscotEdge: PIXEL_COLORS[6],
  floorA: PIXEL_COLORS[7], floorB: PIXEL_COLORS[8], floorLine: PIXEL_COLORS[9], floorEdge: PIXEL_COLORS[10],
};

const LIGHTING = [
  { glow: 0, dim: 0 }, { glow: .01, dim: .01 }, { glow: .02, dim: .02 },
  { glow: .03, dim: .035 }, { glow: .05, dim: .06 }, { glow: .07, dim: .09 },
] as const;

export function paletteFor(mood: number): Palette {
  return { ...BASE, ...LIGHTING[Math.max(0, Math.min(5, Math.round(mood)))] };
}

export const SKINS = PIXEL_COLORS.slice(11, 19);
export const HAIR = [PIXEL_COLORS[19], PIXEL_COLORS[20], PIXEL_COLORS[21], PIXEL_COLORS[22], PIXEL_COLORS[23], PIXEL_COLORS[24], PIXEL_COLORS[29], PIXEL_COLORS[1], PIXEL_COLORS[27], PIXEL_COLORS[5]];
export const SHIRTS = [PIXEL_COLORS[25], PIXEL_COLORS[26], PIXEL_COLORS[27], PIXEL_COLORS[28], PIXEL_COLORS[29], PIXEL_COLORS[30], PIXEL_COLORS[23], PIXEL_COLORS[18]];
export const PANTS = [PIXEL_COLORS[31], PIXEL_COLORS[1], PIXEL_COLORS[3], PIXEL_COLORS[24]];
