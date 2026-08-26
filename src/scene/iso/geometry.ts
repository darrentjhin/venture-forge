/** Isometric projection for a 2:1 diamond tile grid, in internal pixel units. */

export const TILE_W = 24;
export const TILE_H = 12;
export const WALL_H = 26;

const MARGIN_X = 12;
const MARGIN_TOP = 34; // room for the wall calendar above the back wall
const MARGIN_BOTTOM = 14;

export interface Point { x: number; y: number; }
export interface View { width: number; height: number; origin: Point; }

/**
 * The canvas is sized to the room rather than fixed, so a one-desk apartment
 * zooms in close and a headquarters pulls back — object-fit does the scaling.
 */
export function viewFor(cols: number, rows: number): View {
  const span = cols + rows;
  const width = Math.ceil(span * (TILE_W / 2) + MARGIN_X * 2);
  const height = Math.ceil(span * (TILE_H / 2) + WALL_H + MARGIN_TOP + MARGIN_BOTTOM);
  return {
    width,
    height,
    origin: {
      x: MARGIN_X + rows * (TILE_W / 2),
      y: MARGIN_TOP + WALL_H + TILE_H / 2,
    },
  };
}

/** Tile coordinate (may be fractional while an agent walks between tiles). */
export function toScreen(tx: number, ty: number, origin: Point): Point {
  return {
    x: origin.x + (tx - ty) * (TILE_W / 2),
    y: origin.y + (tx + ty) * (TILE_H / 2),
  };
}

