import { TILE_H, TILE_W, WALL_H, toScreen, type Point } from "./geometry";
import type { Furniture, RoomObject } from "./officePlans";

/* ── Palette ─────────────────────────────────────────────────
   Mood 0 is a bright morning; mood 5 is the room at 2am with the
   overhead lights off and one desk lamp still going.              */

export interface Palette {
  floorA: string; floorB: string;
  wallTop: string; wallLeft: string; wallRight: string; wallTrim: string;
  shade: string; shadeAlpha: number;
}

const PALETTES: Palette[] = [
  { floorA: "#cbae88", floorB: "#c3a680", wallTop: "#f2ead9", wallLeft: "#d6c9b2", wallRight: "#e8dfcc", wallTrim: "#b3a184", shade: "#2f3f46", shadeAlpha: 0 },
  { floorA: "#c6a983", floorB: "#bea17b", wallTop: "#ece4d3", wallLeft: "#d0c3ac", wallRight: "#e2d9c6", wallTrim: "#ad9b7e", shade: "#2f3f46", shadeAlpha: .04 },
  { floorA: "#bfa27d", floorB: "#b79a75", wallTop: "#e4dccb", wallLeft: "#c7baa4", wallRight: "#dad1be", wallTrim: "#a49277", shade: "#33414a", shadeAlpha: .08 },
  { floorA: "#b29572", floorB: "#aa8d6a", wallTop: "#d6cebd", wallLeft: "#b9ad97", wallRight: "#ccc3b0", wallTrim: "#978570", shade: "#33414a", shadeAlpha: .13 },
  { floorA: "#9a7f5f", floorB: "#927757", wallTop: "#bdb4a3", wallLeft: "#a1957f", wallRight: "#b0a795", wallTrim: "#7f6e5a", shade: "#2a170e", shadeAlpha: .2 },
  { floorA: "#83694c", floorB: "#7b6144", wallTop: "#a29a8a", wallLeft: "#877c68", wallRight: "#948b7b", wallTrim: "#6b5b48", shade: "#2a170e", shadeAlpha: .27 },
];

export function paletteFor(mood: number): Palette { return PALETTES[Math.max(0, Math.min(5, mood))]; }

/* ── Primitives ──────────────────────────────────────────────
   Everything is filled with integer-aligned rectangles so edges stay
   hard when the canvas is scaled up with image-rendering: pixelated. */

const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;

/** Filled 2:1 diamond centred on (cx, cy), drawn as hard scanlines. */
function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, scale = 1) {
  ctx.fillStyle = color;
  const h = Math.round(TILE_H * scale);
  const step = (TILE_W * scale) / h;
  for (let i = 0; i < h; i += 1) {
    const width = Math.round((Math.min(i, h - 1 - i) + 1) * step * 2);
    ctx.fillRect(Math.round(cx - width / 2), Math.round(cy - h / 2 + i), width, 1);
  }
}

/** Cuboid standing on a tile: top diamond plus two extruded faces. */
function cube(
  ctx: CanvasRenderingContext2D, cx: number, cyBase: number, height: number,
  top: string, left: string, right: string, halfW = HALF_W, halfH = HALF_H,
) {
  const cyTop = cyBase - height;
  // Side faces first, as 1px columns following the diamond's lower edges.
  ctx.fillStyle = right;
  for (let j = 0; j < halfW; j += 1) {
    const y = Math.round(cyTop + halfH - (j * halfH) / halfW);
    ctx.fillRect(Math.round(cx + j), y, 1, height);
  }
  ctx.fillStyle = left;
  for (let j = 0; j < halfW; j += 1) {
    const y = Math.round(cyTop + halfH - (j * halfH) / halfW);
    ctx.fillRect(Math.round(cx - 1 - j), y, 1, height);
  }
  // Top face.
  ctx.fillStyle = top;
  const h = halfH * 2;
  const step = (halfW * 2) / h;
  for (let i = 0; i < h; i += 1) {
    const width = Math.round((Math.min(i, h - 1 - i) + 1) * step * 2);
    ctx.fillRect(Math.round(cx - width / 2), Math.round(cyTop - halfH + i), width, 1);
  }
}

/** Flat upright panel used for wall-mounted things (whiteboards, doors). */
function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, border?: string) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
  if (border) {
    ctx.fillStyle = border;
    ctx.fillRect(Math.round(x), Math.round(y), w, 1);
    ctx.fillRect(Math.round(x), Math.round(y + h - 1), w, 1);
    ctx.fillRect(Math.round(x), Math.round(y), 1, h);
    ctx.fillRect(Math.round(x + w - 1), Math.round(y), 1, h);
  }
}

/* ── Room shell ──────────────────────────────────────────────── */

export function drawFloor(ctx: CanvasRenderingContext2D, cols: number, rows: number, origin: Point, palette: Palette) {
  for (let ty = 0; ty < rows; ty += 1) {
    for (let tx = 0; tx < cols; tx += 1) {
      const { x, y } = toScreen(tx, ty, origin);
      diamond(ctx, x, y, (tx + ty) % 2 === 0 ? palette.floorA : palette.floorB);
    }
  }
}

/**
 * North and west walls as continuous slabs. Drawing them tile-by-tile leaves a
 * row of diamond "teeth" along the top; a single sloped run reads as one wall.
 */
export function drawWalls(ctx: CanvasRenderingContext2D, cols: number, rows: number, origin: Point, palette: Palette) {
  const height = WALL_H;
  const cap = 3;

  // North wall: runs along +x, so screen x rises and y falls by half as much.
  const northStart = toScreen(-0.5, -0.5, origin);
  const northLength = Math.round((cols + 0.5) * (TILE_W / 2));
  for (let i = 0; i < northLength; i += 1) {
    const x = Math.round(northStart.x + i);
    const y = Math.round(northStart.y + i / 2);
    ctx.fillStyle = palette.wallRight;
    ctx.fillRect(x, y - height, 1, height);
    ctx.fillStyle = palette.wallTop;
    ctx.fillRect(x, y - height - cap, 1, cap);
  }

  // West wall: runs along +y, so screen x falls and y rises.
  const westStart = toScreen(-0.5, -0.5, origin);
  const westLength = Math.round((rows + 0.5) * (TILE_W / 2));
  for (let i = 0; i < westLength; i += 1) {
    const x = Math.round(westStart.x - i - 1);
    const y = Math.round(westStart.y + i / 2);
    ctx.fillStyle = palette.wallLeft;
    ctx.fillRect(x, y - height, 1, height);
    ctx.fillStyle = palette.wallTop;
    ctx.fillRect(x, y - height - cap, 1, cap);
  }

  // Skirting where each wall meets the floor.
  ctx.fillStyle = palette.wallTrim;
  for (let i = 0; i < northLength; i += 1) {
    ctx.fillRect(Math.round(northStart.x + i), Math.round(northStart.y + i / 2) - 2, 1, 2);
  }
  for (let i = 0; i < westLength; i += 1) {
    ctx.fillRect(Math.round(westStart.x - i - 1), Math.round(westStart.y + i / 2) - 2, 1, 2);
  }
}

/* ── Furniture ───────────────────────────────────────────────── */

export function drawFurniture(ctx: CanvasRenderingContext2D, item: Furniture, origin: Point, palette: Palette) {
  const { x, y } = toScreen(item.tx, item.ty, origin);
  const base = y + HALF_H;
  switch (item.kind) {
    case "desk": {
      cube(ctx, x, base - 1, 7, "#c19a4e", "#8a6c2e", "#a5833c");
      ctx.fillStyle = "#6b5512";
      ctx.fillRect(Math.round(x - 8), Math.round(base - 1), 1, 4);
      ctx.fillRect(Math.round(x + 7), Math.round(base - 1), 1, 4);
      // A monitor and keyboard so a desk reads as a workstation, with
      // deterministic clutter so the rows do not look stamped.
      const variant = (item.tx * 7 + item.ty * 3) % 3;
      const deskTop = base - 8;
      ctx.fillStyle = "#3d444a";
      ctx.fillRect(Math.round(x - 5), Math.round(deskTop - 8), 10, 8);
      ctx.fillStyle = "#8fb9b3";
      ctx.fillRect(Math.round(x - 4), Math.round(deskTop - 7), 8, 6);
      ctx.fillStyle = "#2b3136";
      ctx.fillRect(Math.round(x - 3), Math.round(deskTop + 1), 7, 2);
      if (variant === 1) {
        ctx.fillStyle = "#d9705a";
        ctx.fillRect(Math.round(x + 4), Math.round(deskTop - 1), 3, 3);
      }
      if (variant === 2) {
        ctx.fillStyle = "#e7dfd2";
        ctx.fillRect(Math.round(x - 9), Math.round(deskTop), 5, 3);
      }
      break;
    }
    case "chair":
      cube(ctx, x, base - 2, 4, "#5b6570", "#39424b", "#4a545e", 5, 3);
      ctx.fillStyle = "#39424b";
      ctx.fillRect(Math.round(x - 4), Math.round(base - 12), 8, 6);
      break;
    case "meetingTable":
      cube(ctx, x, base - 1, 6, "#b8b0a2", "#847d70", "#9c9587");
      break;
    case "counter":
      cube(ctx, x, base, 12, "#e0d8c8", "#a89f8d", "#c6bdac");
      ctx.fillStyle = "#7f8d92";
      ctx.fillRect(Math.round(x - 4), Math.round(base - 15), 8, 3);
      break;
    case "cooler":
      cube(ctx, x, base, 16, "#cfd8d6", "#8fa09d", "#b0bcb9", 6, 4);
      ctx.fillStyle = "#7fb3c4";
      ctx.fillRect(Math.round(x - 3), Math.round(base - 22), 6, 7);
      break;
    case "server":
      cube(ctx, x, base, 22, "#4d545a", "#2f3438", "#3d4348", 7, 4);
      ctx.fillStyle = "#7fd4a0";
      for (let i = 0; i < 4; i += 1) ctx.fillRect(Math.round(x - 3), Math.round(base - 26 + i * 5), 2, 1);
      break;
    case "sofa":
      cube(ctx, x, base - 1, 5, "#7a6a86", "#4f4459", "#655670");
      ctx.fillStyle = "#4f4459";
      ctx.fillRect(Math.round(x - 9), Math.round(base - 12), 18, 6);
      break;
    case "bed":
      cube(ctx, x, base - 1, 5, "#9a8a76", "#6c6053", "#847765");
      ctx.fillStyle = "#e5ddcd";
      ctx.fillRect(Math.round(x - 8), Math.round(base - 9), 7, 4);
      break;
    case "shelf":
      cube(ctx, x, base, 20, "#a3865c", "#6f5b3d", "#8a734d", 6, 4);
      ctx.fillStyle = "#c9553f";
      ctx.fillRect(Math.round(x - 4), Math.round(base - 24), 2, 5);
      ctx.fillStyle = "#4f7fa8";
      ctx.fillRect(Math.round(x - 1), Math.round(base - 24), 2, 5);
      break;
    case "lamp":
      ctx.fillStyle = "#5b6570";
      ctx.fillRect(Math.round(x), Math.round(base - 22), 1, 22);
      ctx.fillStyle = "#f2b857";
      ctx.fillRect(Math.round(x - 4), Math.round(base - 27), 9, 5);
      break;
    case "plant":
      ctx.fillStyle = "#9a6b4a";
      ctx.fillRect(Math.round(x - 4), Math.round(base - 7), 8, 7);
      ctx.fillStyle = "#5f7d54";
      ctx.fillRect(Math.round(x - 5), Math.round(base - 16), 10, 9);
      ctx.fillStyle = "#71916a";
      ctx.fillRect(Math.round(x - 3), Math.round(base - 19), 6, 4);
      break;
    case "rug":
      diamond(ctx, x, y, palette.shadeAlpha > .2 ? "#6a5a4a" : "#b9917d", 1.6);
      diamond(ctx, x, y, palette.shadeAlpha > .2 ? "#7a6857" : "#caa38d", 1.1);
      break;
  }
}

/* ── Interactive objects ─────────────────────────────────────── */

export interface ObjectHit { panel: string; x: number; y: number; w: number; h: number; label: string; }

export function drawObject(
  ctx: CanvasRenderingContext2D, item: RoomObject, origin: Point,
  opts: { hovered: boolean; badge?: number | string; pulse?: boolean; frame: number },
): ObjectHit {
  const { x, y } = toScreen(item.tx, item.ty, origin);
  const base = y + HALF_H;
  const lift = opts.hovered ? 2 : 0;
  const glow = opts.pulse && Math.floor(opts.frame / 24) % 2 === 0;
  let box = { x: x - 10, y: base - 22, w: 20, h: 24 };

  switch (item.kind) {
    case "monitor": {
      const top = base - 9 - lift;
      ctx.fillStyle = "#3d444a";
      ctx.fillRect(Math.round(x - 6), Math.round(top - 10), 12, 10);
      ctx.fillStyle = glow ? "#ffe08a" : "#9fd0c9";
      ctx.fillRect(Math.round(x - 5), Math.round(top - 9), 10, 8);
      ctx.fillStyle = "#2b3136";
      ctx.fillRect(Math.round(x - 1), Math.round(top), 2, 3);
      ctx.fillRect(Math.round(x - 4), Math.round(top + 3), 8, 1);
      box = { x: x - 7, y: top - 11, w: 14, h: 16 };
      break;
    }
    case "notebook": {
      const top = base - 9 - lift;
      ctx.fillStyle = "#e7dfd2";
      ctx.fillRect(Math.round(x - 6), Math.round(top - 3), 12, 6);
      ctx.fillStyle = "#a49a8b";
      ctx.fillRect(Math.round(x - 4), Math.round(top - 1), 8, 1);
      ctx.fillRect(Math.round(x - 4), Math.round(top + 1), 6, 1);
      box = { x: x - 7, y: top - 4, w: 14, h: 9 };
      break;
    }
    case "phone": {
      const top = base - 9 - lift;
      ctx.fillStyle = "#22201d";
      ctx.fillRect(Math.round(x - 2), Math.round(top - 7), 5, 9);
      ctx.fillStyle = glow ? "#ffd27a" : "#8db5b2";
      ctx.fillRect(Math.round(x - 1), Math.round(top - 6), 3, 6);
      box = { x: x - 4, y: top - 8, w: 9, h: 11 };
      break;
    }
    case "whiteboard": {
      const top = base - 30 - lift;
      panel(ctx, x - 13, top, 26, 17, "#f4f0e9", "#2f3438");
      ctx.fillStyle = "#8ba5a2";
      ctx.fillRect(Math.round(x - 10), Math.round(top + 4), 15, 1);
      ctx.fillRect(Math.round(x - 10), Math.round(top + 7), 19, 1);
      ctx.fillRect(Math.round(x - 10), Math.round(top + 10), 11, 1);
      box = { x: x - 14, y: top - 1, w: 28, h: 19 };
      break;
    }
    case "door": {
      const top = base - 30 - lift;
      panel(ctx, x - 7, top, 14, 30, "#9b7a50", "#4a3a25");
      ctx.fillStyle = "#f2b857";
      ctx.fillRect(Math.round(x + 3), Math.round(top + 16), 2, 2);
      box = { x: x - 8, y: top - 1, w: 16, h: 32 };
      break;
    }
    case "safe": {
      const top = base - lift;
      cube(ctx, x, top, 18, glow ? "#8b8f7a" : "#687178", "#454c51", "#59616a", 7, 4);
      ctx.fillStyle = "#d2d6d5";
      ctx.fillRect(Math.round(x - 3), Math.round(top - 14), 6, 1);
      ctx.fillRect(Math.round(x - 3), Math.round(top - 9), 6, 1);
      box = { x: x - 9, y: top - 24, w: 18, h: 26 };
      break;
    }
  }

  if (opts.hovered) {
    ctx.fillStyle = "#22201d";
    const width = item.label.length * 4 + 6;
    ctx.fillRect(Math.round(x - width / 2), Math.round(box.y - 10), width, 9);
    ctx.fillStyle = "#f5f1e9";
    ctx.font = "6px monospace";
    ctx.textAlign = "center";
    ctx.fillText(item.label.toUpperCase(), Math.round(x), Math.round(box.y - 3.5));
  }

  if (opts.badge !== undefined && opts.badge !== 0) {
    const bx = Math.round(box.x + box.w - 1);
    const by = Math.round(box.y - 2);
    ctx.fillStyle = "#e1523d";
    ctx.fillRect(bx - 3, by - 3, 8, 8);
    ctx.fillStyle = "#fff";
    ctx.font = "6px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(opts.badge), bx + 1, by + 3);
  }

  return { panel: item.panel, ...box, label: item.label };
}

/* ── Characters ──────────────────────────────────────────────── */

const SKINS = ["#f2c8a0", "#dca77f", "#bf805e", "#996246", "#764631", "#5c3428", "#e7b98d", "#c98e68"];
const SHIRTS = ["#4a7f9e", "#9c5f83", "#3f9a76", "#c08a45", "#5b6570", "#7d78c4"];
const HAIR = ["#33251f", "#151311", "#6b452e", "#a06a37", "#d2b07b", "#4e4038", "#852f28", "#20262c"];

export interface AgentSprite {
  x: number; y: number;
  skin: number; shirt: number; hair: number; glasses: boolean;
  facing: "se" | "sw" | "ne" | "nw";
  walking: boolean;
  slumped: boolean;
  phase: number;
}

export function drawAgent(ctx: CanvasRenderingContext2D, agent: AgentSprite, origin: Point, frame: number, highlight: boolean) {
  const { x, y } = toScreen(agent.x, agent.y, origin);
  const base = Math.round(y + 2);
  const step = agent.walking ? Math.floor((frame + agent.phase) / 6) % 2 : 0;
  const bob = agent.walking && step === 1 ? -1 : 0;
  const slump = agent.slumped ? 1 : 0;
  const back = agent.facing === "ne" || agent.facing === "nw";
  const skin = SKINS[agent.skin];
  const shirt = SHIRTS[agent.shirt];

  // Contact shadow.
  ctx.fillStyle = "rgba(34,32,29,.22)";
  ctx.fillRect(Math.round(x - 4), base - 1, 8, 2);
  ctx.fillRect(Math.round(x - 5), base, 10, 1);

  const bodyTop = base - 13 + bob + slump;

  // Legs.
  ctx.fillStyle = "#3f4750";
  if (agent.walking) {
    ctx.fillRect(Math.round(x - 3 + step), base - 5, 2, 5);
    ctx.fillRect(Math.round(x + 1 - step), base - 5, 2, 5);
  } else {
    ctx.fillRect(Math.round(x - 3), base - 5, 2, 5);
    ctx.fillRect(Math.round(x + 1), base - 5, 2, 5);
  }

  // Torso.
  ctx.fillStyle = shirt;
  ctx.fillRect(Math.round(x - 4), bodyTop + 5, 8, 6);
  // Arms.
  ctx.fillStyle = skin;
  ctx.fillRect(Math.round(x - 5), bodyTop + 6, 1, 4);
  ctx.fillRect(Math.round(x + 4), bodyTop + 6, 1, 4);

  // Head.
  ctx.fillStyle = skin;
  ctx.fillRect(Math.round(x - 3), bodyTop, 7, 6);
  // Hair.
  ctx.fillStyle = HAIR[agent.hair];
  ctx.fillRect(Math.round(x - 3), bodyTop - 1, 7, 2);
  if (back) {
    ctx.fillRect(Math.round(x - 3), bodyTop + 1, 7, 4);
  } else {
    if (agent.hair % 3 === 0) ctx.fillRect(Math.round(x - 3), bodyTop + 1, 1, 2);
    if (agent.hair % 3 === 1) ctx.fillRect(Math.round(x + 3), bodyTop + 1, 1, 3);
    // Face.
    ctx.fillStyle = "#22201d";
    const eyeY = bodyTop + 3;
    const flip = agent.facing === "sw" ? -1 : 1;
    ctx.fillRect(Math.round(x - 2 + (flip < 0 ? 1 : 0)), eyeY, 1, 1);
    ctx.fillRect(Math.round(x + 1 + (flip < 0 ? 1 : 0)), eyeY, 1, 1);
    if (agent.glasses) {
      ctx.fillStyle = "rgba(34,32,29,.55)";
      ctx.fillRect(Math.round(x - 3), eyeY - 1, 7, 1);
    }
    if (agent.slumped) {
      ctx.fillStyle = "#22201d";
      ctx.fillRect(Math.round(x - 1), bodyTop + 5, 3, 1);
    }
  }

  if (highlight) {
    ctx.fillStyle = "#f2b857";
    ctx.fillRect(Math.round(x - 5), bodyTop - 4, 10, 1);
  }
}

