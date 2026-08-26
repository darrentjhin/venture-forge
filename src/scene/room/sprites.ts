import { INK, INK_SOFT, HAIR, PANTS, SHIRTS, SKINS, type Palette } from "./palette";
import { TILE, WALL_H, type Point } from "./geometry";

/* ── pixel helpers ──────────────────────────────────────────── */

export function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Filled block with a hard 1px outline — the thing that makes sprites read. */
function block(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, outline = INK) {
  px(ctx, x - 1, y - 1, w + 2, h + 2, outline);
  px(ctx, x, y, w, h, fill);
}

function shade(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, alpha: number) {
  ctx.globalAlpha = alpha;
  px(ctx, x, y, w, h, color);
  ctx.globalAlpha = 1;
}

/* ── room shell ─────────────────────────────────────────────── */

export function drawRoomShell(ctx: CanvasRenderingContext2D, cols: number, rows: number, origin: Point, p: Palette) {
  const w = cols * TILE;
  const floorTop = origin.y;

  // Upper wall, panel band, then a lit trim line where wall meets floor.
  px(ctx, origin.x, floorTop - WALL_H, w, WALL_H - 22, p.wall);
  for (let x = 0; x < w; x += 48) px(ctx, origin.x + x, floorTop - WALL_H, 2, WALL_H - 22, p.wallDark);
  px(ctx, origin.x, floorTop - 24, w, 18, p.wainscot);
  px(ctx, origin.x, floorTop - 24, w, 2, p.wainscotEdge);
  for (let x = 0; x < w; x += 24) px(ctx, origin.x + x, floorTop - 22, 1, 14, p.wainscotEdge);
  px(ctx, origin.x, floorTop - 6, w, 4, p.wallTrim);
  px(ctx, origin.x, floorTop - 2, w, 2, INK);

  // Floor: staggered planks two tiles long, with a seam and a highlight edge.
  for (let ty = 0; ty < rows; ty += 1) {
    const y = floorTop + ty * TILE;
    px(ctx, origin.x, y, w, TILE, ty % 2 === 0 ? p.floorA : p.floorB);
    px(ctx, origin.x, y, w, 1, p.floorEdge);
    px(ctx, origin.x, y + 1, w, 1, ty % 2 === 0 ? p.floorB : p.floorA);
    const offset = ty % 2 === 0 ? 0 : TILE;
    for (let x = offset; x < w + TILE * 2; x += TILE * 2) {
      px(ctx, origin.x + x, y + 2, 1, TILE - 2, p.floorLine);
    }
    // Faint grain so large floors are not flat.
    for (let x = (ty * 13) % 40; x < w; x += 40) {
      shade(ctx, origin.x + x, y + 10 + (x % 3), 14, 1, p.floorLine, .35);
    }
  }

  // Side edges so the room reads as a box.
  px(ctx, origin.x - 4, floorTop - WALL_H, 4, WALL_H + rows * TILE, p.floorEdge);
  px(ctx, origin.x + w, floorTop - WALL_H, 4, WALL_H + rows * TILE, p.floorEdge);
}

/**
 * Back-wall dressing. Items are laid out left to right with even gaps rather
 * than at fixed offsets, so windows and frames can never overlap each other or
 * the door in the first tile.
 */
export function drawWallDecor(ctx: CanvasRenderingContext2D, cols: number, origin: Point, p: Palette, mood: number, week: number) {
  const top = origin.y - WALL_H;
  const night = mood >= 4;

  const vent = (x: number) => {
    px(ctx, x, top + 10, 18, 12, p.wallDark);
    for (let i = 0; i < 4; i += 1) px(ctx, x + 2, top + 12 + i * 3, 14, 1, p.wainscotEdge);
  };

  const windowPane = (x: number) => {
    block(ctx, x, top + 12, 40, 30, night ? "#14203a" : "#8fd4e8");
    if (night) {
      px(ctx, x + 6, top + 18, 2, 2, "#e8f0ff"); px(ctx, x + 26, top + 22, 2, 2, "#e8f0ff");
      px(ctx, x + 15, top + 30, 2, 2, "#cfe0ff"); px(ctx, x + 32, top + 16, 1, 1, "#e8f0ff");
    } else {
      px(ctx, x, top + 30, 40, 12, "#b8e6c0");
      px(ctx, x + 26, top + 16, 8, 8, "#fff3b0");
    }
    px(ctx, x + 19, top + 12, 2, 30, INK);
    px(ctx, x, top + 26, 40, 2, INK);
    px(ctx, x - 2, top + 42, 44, 3, p.wainscotEdge);
  };

  const framed = (art: string, accent: string, w: number, h: number) => (x: number) => {
    block(ctx, x, top + 16, w, h, "#e8dcc0");
    px(ctx, x + 2, top + 18, w - 4, h - 4, art);
    px(ctx, x + 3, top + 16 + h - 9, w - 6, 5, accent);
    px(ctx, x + 2, top + 18, w - 4, 1, "#f6efdc");
  };

  const wallPlant = (x: number) => {
    block(ctx, x, top + 12, 14, 9, "#b5643c");
    px(ctx, x + 1, top + 20, 4, 12, "#3f8f50");
    px(ctx, x + 7, top + 20, 4, 16, "#4fa25c");
    px(ctx, x + 4, top + 21, 3, 9, "#58b268");
  };

  const clock = (x: number) => {
    const cx = x + 8;
    const cy = top + 26;
    block(ctx, cx - 8, cy - 8, 16, 16, "#f2ead5");
    px(ctx, cx - 1, cy - 1, 2, 2, INK);
    const angle = (week % 12) / 12 * Math.PI * 2;
    px(ctx, cx + Math.round(Math.sin(angle) * 5), cy - Math.round(Math.cos(angle) * 5), 2, 2, "#d6483c");
  };

  const catalogue: { w: number; draw: (x: number) => void }[] = [
    { w: 18, draw: vent },
    { w: 40, draw: windowPane },
    { w: 34, draw: framed("#2f5f7a", "#4e8f5e", 34, 26) },
    { w: 16, draw: clock },
    { w: 22, draw: framed("#6b3f5e", "#d68a4e", 22, 18) },
    { w: 40, draw: windowPane },
    { w: 14, draw: wallPlant },
    { w: 24, draw: framed("#3a5f4a", "#c4a24e", 24, 20) },
  ];

  // The door occupies the first tile, so decor starts after it.
  const left = origin.x + TILE + 8;
  const right = origin.x + cols * TILE - 8;
  const available = right - left;

  const chosen: typeof catalogue = [];
  let used = 0;
  for (const item of catalogue) {
    const gap = chosen.length ? 14 : 0;
    if (used + gap + item.w > available) continue;
    chosen.push(item);
    used += gap + item.w;
  }
  if (!chosen.length) return;

  const spare = available - used;
  const step = chosen.length > 1 ? spare / (chosen.length - 1) : 0;
  let x = left;
  chosen.forEach((item, index) => {
    item.draw(Math.round(x));
    x += item.w + 14 + (index < chosen.length - 1 ? step : 0);
  });
}

/* ── furniture ──────────────────────────────────────────────── */

export type FurnitureKind =
  | "desk" | "chair" | "plant" | "meetingTable" | "sofa" | "counter"
  | "server" | "bed" | "rug" | "cooler" | "shelf" | "lamp" | "bin";

export function drawFurniture(ctx: CanvasRenderingContext2D, kind: FurnitureKind, sx: number, sy: number, variant: number, p: Palette) {
  switch (kind) {
    case "rug":
      px(ctx, sx + 1, sy + 3, TILE - 2, TILE - 6, "#7a4a6e");
      px(ctx, sx + 4, sy + 6, TILE - 8, TILE - 12, "#9c6188");
      px(ctx, sx + 8, sy + 10, TILE - 16, TILE - 20, "#c07fa8");
      break;

    case "desk": {
      shade(ctx, sx + 2, sy + 26, TILE - 4, 4, INK, .22);
      // Desk surface first, then the monitor standing on it.
      block(ctx, sx + 1, sy + 10, TILE - 2, 16, "#8a5733");
      px(ctx, sx + 1, sy + 10, TILE - 2, 3, "#a86c40");
      px(ctx, sx + 3, sy + 26, 3, 4, "#5c3a22"); px(ctx, sx + TILE - 6, sy + 26, 3, 4, "#5c3a22");
      block(ctx, sx + 8, sy + 1, 16, 12, "#1b2030");
      px(ctx, sx + 9, sy + 2, 14, 9, variant % 3 === 0 ? "#3fd0c0" : variant % 3 === 1 ? "#5aa8f0" : "#f0b45a");
      px(ctx, sx + 10, sy + 4, 8, 1, "#0e3a44"); px(ctx, sx + 10, sy + 6, 11, 1, "#0e3a44");
      px(ctx, sx + 10, sy + 8, 6, 1, "#0e3a44");
      px(ctx, sx + 9, sy + 19, 14, 4, "#dfe4ea"); px(ctx, sx + 9, sy + 19, 14, 1, "#f4f7fa");
      if (variant % 3 === 0) { block(ctx, sx + 25, sy + 16, 5, 6, "#e05a5a"); px(ctx, sx + 30, sy + 18, 2, 2, "#e05a5a"); }
      if (variant % 3 === 1) { block(ctx, sx + 2, sy + 17, 6, 5, "#f2ead5"); px(ctx, sx + 3, sy + 19, 4, 1, "#b9ae94"); }
      if (variant % 3 === 2) { block(ctx, sx + 26, sy + 15, 4, 7, "#4fc46a"); }
      break;
    }

    case "chair":
      // Top-down office chair: castors, seat, then a backrest that sits behind
      // whoever is drawn on this tile.
      shade(ctx, sx + 8, sy + 24, 16, 4, INK, .22);
      px(ctx, sx + 15, sy + 20, 2, 6, "#1d2231");
      px(ctx, sx + 9, sy + 25, 14, 2, "#2a3145");
      px(ctx, sx + 11, sy + 24, 3, 3, "#3a4258"); px(ctx, sx + 18, sy + 24, 3, 3, "#3a4258");
      block(ctx, sx + 9, sy + 2, 14, 11, "#3a4258");
      px(ctx, sx + 10, sy + 3, 12, 4, "#4e5878");
      block(ctx, sx + 7, sy + 13, 18, 8, "#2c3350");
      px(ctx, sx + 8, sy + 14, 16, 2, "#3d4568");
      break;

    case "meetingTable":
      shade(ctx, sx, sy + 22, TILE, 5, INK, .2);
      block(ctx, sx, sy + 6, TILE, 18, "#7d5a86");
      px(ctx, sx, sy + 6, TILE, 3, "#9a72a4");
      px(ctx, sx + 6, sy + 12, 8, 5, "#f2ead5");
      px(ctx, sx + 19, sy + 13, 6, 4, "#d6483c");
      break;

    case "counter":
      block(ctx, sx, sy + 2, TILE, 22, "#d8cfb8");
      px(ctx, sx, sy + 2, TILE, 4, "#efe7d2");
      px(ctx, sx + 2, sy + 10, TILE - 4, 2, "#a89c80");
      block(ctx, sx + 6, sy - 6, 10, 10, "#3b4256");  // coffee machine
      px(ctx, sx + 8, sy - 4, 6, 4, "#f0b45a");
      block(ctx, sx + 20, sy + 6, 6, 7, "#e8e2d0");   // mug
      break;

    case "cooler":
      block(ctx, sx + 8, sy + 4, 16, 20, "#dfe7ea");
      block(ctx, sx + 9, sy - 10, 14, 14, "#63c8e0");
      px(ctx, sx + 11, sy - 8, 10, 10, "#8fdcee");
      px(ctx, sx + 12, sy + 10, 8, 3, "#7c8794");
      break;

    case "server":
      block(ctx, sx + 6, sy - 12, 20, 36, "#262c3a");
      for (let i = 0; i < 6; i += 1) {
        px(ctx, sx + 8, sy - 9 + i * 6, 16, 4, "#333c50");
        px(ctx, sx + 9, sy - 8 + i * 6, 2, 2, i % 2 ? "#4fc46a" : "#f0b45a");
      }
      break;

    case "sofa":
      shade(ctx, sx, sy + 24, TILE, 4, INK, .2);
      block(ctx, sx, sy + 2, TILE, 12, "#5f5a86");
      block(ctx, sx, sy + 12, TILE, 12, "#7a74a4");
      px(ctx, sx + 2, sy + 14, 12, 8, "#8f88b8");
      px(ctx, sx + 18, sy + 14, 12, 8, "#8f88b8");
      break;

    case "bed":
      shade(ctx, sx, sy + 26, TILE, 4, INK, .2);
      block(ctx, sx + 1, sy + 2, TILE - 2, 26, "#6b4a35");
      px(ctx, sx + 3, sy + 4, TILE - 6, 9, "#e8e2d0");   // pillow
      px(ctx, sx + 3, sy + 14, TILE - 6, 12, "#4f7fa8"); // duvet
      px(ctx, sx + 3, sy + 14, TILE - 6, 2, "#6b9cc4");
      break;

    case "shelf":
      block(ctx, sx + 3, sy - 14, TILE - 6, 38, "#7a5433");
      for (let r = 0; r < 3; r += 1) {
        px(ctx, sx + 5, sy - 11 + r * 12, TILE - 10, 10, "#5c3a22");
        const colors = ["#d6483c", "#4fc46a", "#5aa8f0", "#f0b45a"];
        for (let b = 0; b < 4; b += 1) px(ctx, sx + 6 + b * 5, sy - 10 + r * 12, 3, 8, colors[(b + r + variant) % 4]);
      }
      break;

    case "bin":
      block(ctx, sx + 11, sy + 10, 11, 14, "#48506a");
      px(ctx, sx + 10, sy + 8, 13, 3, "#5b6486");
      break;

    case "lamp":
      px(ctx, sx + 15, sy - 4, 3, 28, "#4a5268");
      block(ctx, sx + 8, sy - 16, 17, 10, "#f0b45a");
      px(ctx, sx + 10, sy - 6, 13, 2, "#ffd88a");
      break;

    case "plant":
      block(ctx, sx + 10, sy + 14, 13, 11, "#c4623c");
      px(ctx, sx + 10, sy + 14, 13, 3, "#d97a4e");
      block(ctx, sx + 7, sy - 2, 19, 17, "#3f8f50");
      px(ctx, sx + 9, sy, 6, 6, "#58b268");
      px(ctx, sx + 18, sy + 4, 6, 6, "#58b268");
      px(ctx, sx + 13, sy - 6, 7, 7, "#4fa25c");
      break;
  }
}

/* ── interactive objects ────────────────────────────────────── */

export type ObjectKind = "monitor" | "notebook" | "phone" | "whiteboard" | "door" | "safe";
export interface ObjectHit { panel: string; x: number; y: number; w: number; h: number; }

export function drawObject(
  ctx: CanvasRenderingContext2D, kind: ObjectKind, panel: string, sx: number, sy: number,
  opts: { hovered: boolean; badge?: number; pulse?: boolean; frame: number },
): ObjectHit {
  const lift = opts.hovered ? -2 : 0;
  const flash = opts.pulse && Math.floor(opts.frame / 26) % 2 === 0;
  let box = { x: sx, y: sy, w: TILE, h: TILE };

  if (kind === "monitor") {
    block(ctx, sx + 1, sy + 10, TILE - 2, 16, "#8a5733");
    px(ctx, sx + 1, sy + 10, TILE - 2, 3, "#a86c40");
    const y = sy - 2 + lift;
    block(ctx, sx + 4, y, 24, 18, "#161b28");
    px(ctx, sx + 6, y + 2, 20, 14, flash ? "#ffd88a" : "#3fd0c0");
    px(ctx, sx + 8, y + 5, 12, 1, "#0e3a44"); px(ctx, sx + 8, y + 8, 16, 1, "#0e3a44");
    px(ctx, sx + 8, y + 11, 9, 1, "#0e3a44");
    px(ctx, sx + 9, sy + 20, 14, 3, INK_SOFT);
    box = { x: sx + 2, y: y - 2, w: 28, h: 26 };
  }

  if (kind === "notebook") {
    block(ctx, sx + 1, sy + 10, TILE - 2, 16, "#8a5733");
    px(ctx, sx + 1, sy + 10, TILE - 2, 3, "#a86c40");
    const y = sy + 11 + lift;
    block(ctx, sx + 7, y, 18, 13, "#f2ead5");
    px(ctx, sx + 7, y, 18, 3, "#d6483c");
    px(ctx, sx + 10, y + 6, 12, 1, "#a89c80"); px(ctx, sx + 10, y + 9, 9, 1, "#a89c80");
    box = { x: sx + 5, y: y - 2, w: 22, h: 18 };
  }

  if (kind === "phone") {
    block(ctx, sx + 1, sy + 10, TILE - 2, 16, "#8a5733");
    px(ctx, sx + 1, sy + 10, TILE - 2, 3, "#a86c40");
    const y = sy + 2 + lift;
    block(ctx, sx + 11, y, 11, 18, "#1c2130");
    px(ctx, sx + 12, y + 2, 9, 13, flash ? "#ffd88a" : "#7fd4d6");
    box = { x: sx + 9, y: y - 2, w: 15, h: 23 };
  }

  if (kind === "whiteboard") {
    const y = sy + lift;
    block(ctx, sx - 4, y, 44, 30, "#f4f1e6");
    px(ctx, sx - 2, y + 2, 40, 3, "#cfc9b4");
    px(ctx, sx + 1, y + 9, 22, 2, "#3fa0b0"); px(ctx, sx + 1, y + 14, 30, 2, "#3fa0b0");
    px(ctx, sx + 1, y + 19, 16, 2, "#d6483c");
    px(ctx, sx - 4, y + 28, 44, 3, "#a8a293");
    box = { x: sx - 6, y: y - 2, w: 48, h: 34 };
  }

  if (kind === "door") {
    const y = sy + lift;
    block(ctx, sx + 1, y, 30, 46, "#8a5a33");
    px(ctx, sx + 4, y + 4, 24, 18, "#a06c40");
    px(ctx, sx + 4, y + 25, 24, 17, "#a06c40");
    px(ctx, sx + 25, y + 24, 3, 3, "#f0c04e");
    box = { x: sx, y: y - 2, w: 32, h: 50 };
  }

  if (kind === "safe") {
    const y = sy - 6 + lift;
    block(ctx, sx + 5, y, 22, 30, flash ? "#7f8a6a" : "#59617a");
    px(ctx, sx + 7, y + 3, 18, 10, "#6d7590");
    px(ctx, sx + 7, y + 16, 18, 10, "#6d7590");
    px(ctx, sx + 13, y + 6, 6, 2, "#cdd4de"); px(ctx, sx + 13, y + 19, 6, 2, "#cdd4de");
    box = { x: sx + 3, y: y - 2, w: 26, h: 34 };
  }

  if (opts.badge) {
    const bx = box.x + box.w - 4;
    const by = box.y - 4;
    block(ctx, bx - 5, by - 5, 12, 12, "#d6483c");
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(opts.badge), bx + 1, by + 4);
  }

  return { panel, ...box };
}

/* ── characters ─────────────────────────────────────────────── */

export type Facing = "down" | "up" | "left" | "right";
export interface CharacterSpec {
  skin: number; hair: number; shirt: number; pants: number;
  glasses: boolean; hairStyle: number;
  facing: Facing; walking: boolean; slumped: boolean; phase: number;
  motion?: string;
}

/**
 * 20x31 character with a hard outline. Feet sit on (x, y); the sprite extends
 * upward so it overlaps the row behind it.
 */
export function drawCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, c: CharacterSpec, frame: number) {
  // Four-frame cycle at ~6fps, paced to the walk speed above.
  const step = c.walking ? Math.floor((frame + c.phase) / 10) % 4 : 0;
  const breathe = !c.walking && !c.slumped && Math.floor((frame + c.phase) / 52) % 2 === 1 ? -1 : 0;
  const bob = c.walking && (step === 1 || step === 3) ? -1 : breathe;
  const droop = c.slumped ? 2 : 0;
  const skin = SKINS[c.skin % SKINS.length];
  const hair = HAIR[c.hair % HAIR.length];
  const shirt = SHIRTS[c.shirt % SHIRTS.length];
  const pants = PANTS[c.pants % PANTS.length];
  const back = c.facing === "up";

  const cx = Math.round(x);
  const feet = Math.round(y) + droop;

  // Ground shadow.
  shade(ctx, cx - 8, feet - 3, 16, 5, INK, .3);

  // Legs, swinging on the walk cycle.
  const swing = c.walking ? (step === 1 ? 1 : step === 3 ? -1 : 0) : 0;
  block(ctx, cx - 5 + swing, feet - 10 + bob, 4, 9, pants);
  block(ctx, cx + 1 - swing, feet - 10 + bob, 4, 9, pants);
  px(ctx, cx - 5 + swing, feet - 3 + bob, 4, 3, "#1d2231");
  px(ctx, cx + 1 - swing, feet - 3 + bob, 4, 3, "#1d2231");

  // Torso, with a lit shoulder and a shaded flank.
  const bodyTop = feet - 23 + bob;
  block(ctx, cx - 7, bodyTop, 14, 14, shirt);
  shade(ctx, cx - 7, bodyTop, 14, 2, "#ffffff", .22);
  shade(ctx, cx + 3, bodyTop, 4, 14, INK, .16);
  if (!back) {
    px(ctx, cx - 2, bodyTop - 2, 4, 3, skin);          // neck
    shade(ctx, cx - 2, bodyTop - 1, 4, 1, INK, .25);
    px(ctx, cx - 1, bodyTop + 2, 2, 8, "#ffffff");     // placket
    shade(ctx, cx - 1, bodyTop + 2, 2, 8, INK, .2);
  }

  // Arms.
  const armLift = c.walking ? (step === 1 ? -1 : step === 3 ? 1 : 0) : 0;
  block(ctx, cx - 10, bodyTop + 2 + armLift, 3, 10, shirt);
  block(ctx, cx + 7, bodyTop + 2 - armLift, 3, 10, shirt);
  px(ctx, cx - 10, bodyTop + 12 + armLift, 3, 3, skin);
  px(ctx, cx + 7, bodyTop + 12 - armLift, 3, 3, skin);
  if (c.motion === "coffee") {
    block(ctx, cx + 8, bodyTop + 2, 6, 7, "#f2ead5");
    px(ctx, cx + 10, bodyTop - 2 - Math.floor(frame / 18) % 2, 1, 3, "#d8edf0");
  }
  if (c.motion === "talking" && Math.floor(frame / 18) % 2 === 0) px(ctx, cx - 12, bodyTop - 1, 3, 8, shirt);

  // Head.
  const headTop = bodyTop - 14;
  block(ctx, cx - 6, headTop, 12, 13, skin);
  shade(ctx, cx + 3, headTop, 3, 13, INK, .12);
  shade(ctx, cx - 6, headTop, 12, 1, "#ffffff", .15);

  // Hair: cap, sideburns, then a style-specific silhouette.
  px(ctx, cx - 6, headTop - 4, 12, 6, hair);
  px(ctx, cx - 7, headTop - 3, 1, 8, hair);
  px(ctx, cx + 6, headTop - 3, 1, 8, hair);
  px(ctx, cx - 7, headTop - 5, 14, 1, INK);
  if (c.hairStyle % 5 === 0) px(ctx, cx - 6, headTop + 2, 4, 3, hair);
  if (c.hairStyle % 5 === 1) px(ctx, cx - 6, headTop + 2, 12, 2, hair);
  if (c.hairStyle % 5 === 2) { px(ctx, cx + 6, headTop + 2, 3, 11, hair); px(ctx, cx - 9, headTop + 2, 3, 11, hair); }
  if (c.hairStyle % 5 === 3) px(ctx, cx + 1, headTop - 8, 6, 5, hair);
  if (c.hairStyle % 5 === 4) { px(ctx, cx - 8, headTop - 3, 2, 5, hair); px(ctx, cx + 6, headTop - 3, 2, 5, hair); }

  if (back) {
    px(ctx, cx - 5, headTop + 2, 10, 9, hair);
  } else {
    const eyeY = headTop + 6;
    if (c.facing === "down") {
      px(ctx, cx - 4, eyeY, 2, 2, INK);
      px(ctx, cx + 2, eyeY, 2, 2, INK);
      px(ctx, cx - 1, headTop + 10, 3, 1, c.slumped ? "#8a5a5a" : INK_SOFT);
      shade(ctx, cx - 5, headTop + 8, 3, 2, "#e08a7a", .35);
      shade(ctx, cx + 2, headTop + 8, 3, 2, "#e08a7a", .35);
    } else if (c.facing === "left") {
      px(ctx, cx - 4, eyeY, 2, 2, INK);
      px(ctx, cx - 5, headTop + 10, 3, 1, INK_SOFT);
    } else {
      px(ctx, cx + 2, eyeY, 2, 2, INK);
      px(ctx, cx + 2, headTop + 10, 3, 1, INK_SOFT);
    }
    if (c.glasses) {
      px(ctx, cx - 5, eyeY - 1, 4, 4, "#cfe4ee");
      px(ctx, cx + 1, eyeY - 1, 4, 4, "#cfe4ee");
      px(ctx, cx - 5, eyeY - 2, 10, 1, INK);
      px(ctx, cx - 4, eyeY, 2, 2, INK); px(ctx, cx + 2, eyeY, 2, 2, INK);
    }
  }

  if (c.slumped) shade(ctx, cx - 8, headTop - 6, 16, 4, "#5a3a6a", .5);
}

/** Small name tag, as in the reference art. */
export function drawTag(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  const w = ctx.measureText(text).width + 8;
  block(ctx, x - w / 2, y - 11, w, 11, "#1b2233");
  px(ctx, x - w / 2, y - 11, w, 1, "#3fd0c0");
  ctx.fillStyle = "#9fe8e0";
  ctx.fillText(text, x, y - 3);
}
