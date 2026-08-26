/**
 * Top-down orthogonal room, the "Agent Office" camera: you look into the room
 * from slightly above and in front. Tiles are square, the back wall occupies a
 * band above row 0, and sprites are drawn taller than one tile so they overlap
 * the row behind them.
 */

export const TILE = 32;
export const WALL_H = 76;

const MARGIN_X = 16;
const MARGIN_BOTTOM = 20;

export interface Point { x: number; y: number; }
export interface View { width: number; height: number; origin: Point; }

/** Whole-number canvas zoom keeps one source pixel on an exact screen grid. */
export function integerScaleFor(paneWidth: number, paneHeight: number, viewWidth: number, viewHeight: number): number {
  return Math.max(1, Math.floor(Math.min(paneWidth / viewWidth, paneHeight / viewHeight)));
}

/** Canvas is sized to the room; object-fit scales it up to the pane. */
export function viewFor(cols: number, rows: number): View {
  return {
    width: cols * TILE + MARGIN_X * 2,
    height: WALL_H + rows * TILE + MARGIN_BOTTOM,
    origin: { x: MARGIN_X, y: WALL_H },
  };
}

/** Top-left corner of a tile. Fractional coords are mid-step positions. */
export function toScreen(tx: number, ty: number, origin: Point): Point {
  return { x: origin.x + tx * TILE, y: origin.y + ty * TILE };
}

/** Centre of a tile's floor, where a sprite's feet sit. */
export function tileFloor(tx: number, ty: number, origin: Point): Point {
  return { x: origin.x + tx * TILE + TILE / 2, y: origin.y + ty * TILE + TILE - 4 };
}
