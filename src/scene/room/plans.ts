import type { PanelId, RoomStage } from "../../engine/types";
import type { Point } from "./geometry";
import type { FurnitureKind, ObjectKind } from "./sprites";

export interface Furniture { kind: FurnitureKind; tx: number; ty: number; }
export interface RoomObject { panel: PanelId; kind: ObjectKind; tx: number; ty: number; }

export interface RoomPlan {
  cols: number;
  rows: number;
  furniture: Furniture[];
  /** Work positions in hiring order; index 0 is the founder. */
  seats: Point[];
  kitchen: Point[];
  /** Machine tile and the floor tile where the founder uses it. */
  coffeeMachine: Point;
  meeting: Point[];
  wander: Point[];
  objects: RoomObject[];
}

/**
 * A desk sits one tile in FRONT of its seat, so the occupant is drawn first and
 * the desk overlaps their legs — the "working at a desk, facing you" read.
 */
function deskBank(startX: number, startY: number, perRow: number, rowCount: number, stepX = 2, stepY = 3) {
  const furniture: Furniture[] = [];
  const seats: Point[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < perRow; col += 1) {
      const tx = startX + col * stepX;
      const ty = startY + row * stepY;
      furniture.push({ kind: "desk", tx, ty });
      furniture.push({ kind: "chair", tx, ty: ty - 1 });
      seats.push({ x: tx, y: ty - 1 });
    }
  }
  return { furniture, seats };
}

function ownRoom(): RoomPlan {
  return {
    cols: 11, rows: 5,
    furniture: [
      { kind: "desk", tx: 4, ty: 2 }, { kind: "chair", tx: 4, ty: 1 },
      { kind: "desk", tx: 6, ty: 2 }, { kind: "chair", tx: 6, ty: 1 },
      { kind: "bed", tx: 1, ty: 3 }, { kind: "bed", tx: 2, ty: 3 },
      { kind: "rug", tx: 5, ty: 4 }, { kind: "rug", tx: 6, ty: 4 },
      { kind: "shelf", tx: 9, ty: 1 }, { kind: "shelf", tx: 10, ty: 1 },
      { kind: "plant", tx: 10, ty: 4 }, { kind: "plant", tx: 0, ty: 1 },
      { kind: "bin", tx: 8, ty: 2 }, { kind: "lamp", tx: 3, ty: 1 },
      { kind: "sofa", tx: 1, ty: 1 }, { kind: "counter", tx: 8, ty: 4 },
    ],
    seats: [{ x: 4, y: 1 }, { x: 6, y: 1 }],
    kitchen: [{ x: 8, y: 3 }],
    coffeeMachine: { x: 8, y: 4 },
    meeting: [{ x: 5, y: 3 }],
    wander: [{ x: 3, y: 3 }, { x: 7, y: 3 }, { x: 4, y: 4 }, { x: 9, y: 3 }, { x: 2, y: 2 }],
    objects: [
      { panel: "metrics", kind: "monitor", tx: 4, ty: 2 },
      { panel: "notebook", kind: "notebook", tx: 6, ty: 2 },
      { panel: "inbox", kind: "phone", tx: 2, ty: 2 },
      { panel: "roadmap", kind: "whiteboard", tx: 7, ty: -1.25 },
      { panel: "team", kind: "door", tx: 0, ty: -1.5 },
      { panel: "capital", kind: "safe", tx: 9, ty: 4 },
    ],
  };
}

function sharedKitchen(): RoomPlan {
  const bank = deskBank(4, 2, 3, 1);
  return {
    cols: 13, rows: 5,
    furniture: [
      ...bank.furniture,
      { kind: "counter", tx: 0, ty: 1 }, { kind: "counter", tx: 1, ty: 1 },
      { kind: "counter", tx: 2, ty: 1 }, { kind: "cooler", tx: 12, ty: 1 },
      { kind: "sofa", tx: 10, ty: 4 }, { kind: "sofa", tx: 11, ty: 4 },
      { kind: "rug", tx: 5, ty: 4 }, { kind: "rug", tx: 6, ty: 4 },
      { kind: "plant", tx: 0, ty: 4 }, { kind: "plant", tx: 12, ty: 3 },
      { kind: "bin", tx: 9, ty: 1 }, { kind: "shelf", tx: 11, ty: 1 },
      { kind: "meetingTable", tx: 1, ty: 3 }, { kind: "chair", tx: 1, ty: 2 },
      { kind: "lamp", tx: 3, ty: 4 },
    ],
    seats: bank.seats,
    kitchen: [{ x: 0, y: 2 }, { x: 2, y: 2 }],
    coffeeMachine: { x: 1, y: 1 },
    meeting: [{ x: 1, y: 2 }, { x: 2, y: 3 }],
    wander: [{ x: 3, y: 3 }, { x: 8, y: 3 }, { x: 7, y: 4 }, { x: 10, y: 2 }, { x: 4, y: 4 }],
    objects: [
      { panel: "metrics", kind: "monitor", tx: 4, ty: 2 },
      { panel: "notebook", kind: "notebook", tx: 6, ty: 2 },
      { panel: "inbox", kind: "phone", tx: 8, ty: 2 },
      { panel: "roadmap", kind: "whiteboard", tx: 8, ty: -1.25 },
      { panel: "team", kind: "door", tx: 0, ty: -1.5 },
      { panel: "capital", kind: "safe", tx: 10, ty: 1 },
    ],
  };
}

function openPlan(stage: "coworking" | "office" | "floor" | "hq" | "downsized"): RoomPlan {
  const spec = {
    coworking: { cols: 15, rows: 6, perRow: 3, rowCount: 2 },
    office: { cols: 17, rows: 7, perRow: 7, rowCount: 2 },
    downsized: { cols: 17, rows: 7, perRow: 7, rowCount: 2 },
    floor: { cols: 21, rows: 9, perRow: 9, rowCount: 3 },
    hq: { cols: 25, rows: 12, perRow: 11, rowCount: 4 },
  }[stage];

  const bank = deskBank(2, 2, spec.perRow, spec.rowCount);
  const furniture: Furniture[] = [...bank.furniture];
  const right = spec.cols - 1;
  const bottom = spec.rows - 1;

  // Break area along the east edge.
  furniture.push({ kind: "counter", tx: right, ty: 1 }, { kind: "counter", tx: right - 1, ty: 1 });
  furniture.push({ kind: "cooler", tx: right, ty: 3 });
  furniture.push({ kind: "sofa", tx: right - 1, ty: bottom }, { kind: "sofa", tx: right, ty: bottom });
  furniture.push({ kind: "rug", tx: right - 3, ty: bottom }, { kind: "rug", tx: right - 2, ty: bottom });
  furniture.push({ kind: "plant", tx: 0, ty: bottom }, { kind: "plant", tx: right, ty: bottom - 2 });
  furniture.push({ kind: "plant", tx: Math.floor(spec.cols / 2), ty: bottom });
  furniture.push({ kind: "bin", tx: 0, ty: 3 }, { kind: "bin", tx: right - 2, ty: 1 });
  furniture.push({ kind: "shelf", tx: right, ty: 5 });
  // Meeting corner in the south-west.
  furniture.push({ kind: "meetingTable", tx: 1, ty: bottom - 1 }, { kind: "meetingTable", tx: 2, ty: bottom - 1 });
  furniture.push({ kind: "chair", tx: 1, ty: bottom - 2 }, { kind: "chair", tx: 2, ty: bottom - 2 });
  furniture.push({ kind: "rug", tx: 1, ty: bottom }, { kind: "rug", tx: 2, ty: bottom });
  furniture.push({ kind: "lamp", tx: 0, ty: bottom - 2 });

  if (stage === "floor" || stage === "hq") {
    furniture.push({ kind: "server", tx: right - 1, ty: 1 }, { kind: "lamp", tx: 0, ty: 1 });
  }
  if (stage === "downsized") furniture.push({ kind: "shelf", tx: right - 1, ty: 1 });

  const wander: Point[] = [];
  for (let ty = 1; ty <= bottom; ty += 2) wander.push({ x: 0, y: ty }, { x: right - 2, y: ty });
  wander.push({ x: Math.floor(spec.cols / 2), y: bottom });

  return {
    cols: spec.cols, rows: spec.rows, furniture,
    seats: bank.seats,
    kitchen: [{ x: right - 1, y: 2 }, { x: right - 1, y: 3 }],
    coffeeMachine: { x: right - 1, y: 1 },
    meeting: [{ x: 1, y: bottom - 2 }, { x: 2, y: bottom - 1 }, { x: 0, y: bottom - 1 }],
    wander,
    objects: [
      { panel: "metrics", kind: "monitor", tx: 2, ty: 2 },
      { panel: "notebook", kind: "notebook", tx: 4, ty: 2 },
      { panel: "inbox", kind: "phone", tx: 6, ty: 2 },
      { panel: "roadmap", kind: "whiteboard", tx: Math.min(spec.cols - 4, 9), ty: -1.25 },
      { panel: "team", kind: "door", tx: 0, ty: -1.5 },
      { panel: "capital", kind: "safe", tx: right - 1, ty: bottom - 3 },
    ],
  };
}

/**
 * Headcount that can reach each stage, from selectRoomStage: a room must have
 * at least this many seats or people arrive with nowhere to sit.
 */
export const SEATS_REQUIRED = {
  apartment: 2, kitchen: 2, coworking: 5, office: 12, floor: 25, hq: 34, downsized: 12,
} as const;

const CACHE = new Map<RoomStage, RoomPlan>();

export function planFor(stage: RoomStage): RoomPlan {
  const cached = CACHE.get(stage);
  if (cached) return cached;
  const plan = stage === "apartment" ? ownRoom() : stage === "kitchen" ? sharedKitchen() : openPlan(stage);
  CACHE.set(stage, plan);
  return plan;
}

const SOLID: FurnitureKind[] = ["desk", "meetingTable", "counter", "cooler", "server", "sofa", "bed", "shelf", "plant", "bin"];

/** Tiles an agent may not walk onto. */
export function blockedTiles(plan: RoomPlan): Set<string> {
  const blocked = new Set<string>();
  for (const item of plan.furniture) {
    if (SOLID.includes(item.kind)) blocked.add(`${item.tx},${item.ty}`);
  }
  return blocked;
}
