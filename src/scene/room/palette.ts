/**
 * Saturated pixel palette. Clarity here comes from three things: a hard
 * near-black outline on every sprite, high value contrast between a prop and
 * the floor it stands on, and warm wood against cool teal walls.
 */

export const INK = "#14161f";
export const INK_SOFT = "#232839";

export interface Palette {
  wall: string; wallDark: string; wallTrim: string; wainscot: string; wainscotEdge: string;
  floorA: string; floorB: string; floorLine: string; floorEdge: string;
  glow: number;   // 0..1 warm lamp wash
  dim: number;    // 0..1 cool darkness over everything
}

/** Index by runway mood: 0 is a bright morning, 5 is 2am and nearly broke. */
const PALETTES: Palette[] = [
  { wall: "#3d7d96", wallDark: "#31687e", wallTrim: "#a6f0ea", wainscot: "#336b84", wainscotEdge: "#5fa2ba", floorA: "#c07c46", floorB: "#b06f3e", floorLine: "#8d5730", floorEdge: "#6b4224", glow: 0, dim: 0 },
  { wall: "#3a7891", wallDark: "#2e6379", wallTrim: "#9ce8e4", wainscot: "#30667e", wainscotEdge: "#5b9db5", floorA: "#bc7843", floorB: "#ac6b3b", floorLine: "#8a542e", floorEdge: "#684022", glow: 0.01, dim: 0.01 },
  { wall: "#37728a", wallDark: "#2b5d72", wallTrim: "#90dedb", wainscot: "#2d6076", wainscotEdge: "#5697ae", floorA: "#b67440", floorB: "#a76739", floorLine: "#85512c", floorEdge: "#653e21", glow: 0.02, dim: 0.02 },
  { wall: "#336a81", wallDark: "#28566a", wallTrim: "#82d0cf", wainscot: "#2a596d", wainscotEdge: "#4f8ea5", floorA: "#ae6e3c", floorB: "#9f6236", floorLine: "#7e4d2a", floorEdge: "#5f3a1f", glow: 0.03, dim: 0.035 },
  { wall: "#2d5f75", wallDark: "#234c5f", wallTrim: "#6fbcbd", wainscot: "#255063", wainscotEdge: "#457f96", floorA: "#a36638", floorB: "#955c33", floorLine: "#764827", floorEdge: "#59361d", glow: 0.05, dim: 0.06 },
  { wall: "#28546a", wallDark: "#1f4456", wallTrim: "#5da8ab", wainscot: "#20475a", wainscotEdge: "#3c7288", floorA: "#975f34", floorB: "#8a552f", floorLine: "#6d4324", floorEdge: "#52311b", glow: 0.07, dim: 0.09 },
];

export function paletteFor(mood: number): Palette {
  return PALETTES[Math.max(0, Math.min(5, Math.round(mood)))];
}

/** Character colours, chosen to stay distinct against wood and teal. */
export const SKINS = ["#f6cba4", "#e8b184", "#cf9165", "#ac6f46", "#8a5432", "#653c22", "#f0bd93", "#bd7f52"];
export const HAIR = ["#2b1d16", "#120f0e", "#6b3f22", "#b5762f", "#e0c07a", "#4a3a30", "#8f2f28", "#1d2530", "#5c4a9c", "#2f6b4a"];
export const SHIRTS = ["#2ec4d6", "#ff8c42", "#a45fd6", "#4fc46a", "#e05a5a", "#4a7fd6", "#e0b23c", "#d64f9c"];
export const PANTS = ["#2c3550", "#3a3346", "#243a4a", "#4a3a2c"];
