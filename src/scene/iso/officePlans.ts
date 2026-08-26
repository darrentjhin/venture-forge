import type { PanelId, RoomStage } from "../../engine/types";
import type { Point } from "./geometry";

export type FurnitureKind =
  | "desk" | "chair" | "plant" | "meetingTable" | "sofa" | "counter"
  | "server" | "bed" | "rug" | "cooler" | "shelf" | "lamp";

export type ObjectKind = "monitor" | "notebook" | "phone" | "whiteboard" | "door" | "safe";

export interface Furniture { kind: FurnitureKind; tx: number; ty: number; flip?: boolean; }
export interface RoomObject { panel: PanelId; kind: ObjectKind; tx: number; ty: number; label: string; }

export interface OfficePlan {
  cols: number;
  rows: number;
  furniture: Furniture[];
  /** Work positions, in hiring order. Index 0 is the founder. */
  seats: Point[];
  /** Destinations for the coffee / lunch behaviours. */
  kitchen: Point[];
  /** Destinations for meetings. */
  meeting: Point[];
  /** Loose floor tiles an idle agent can drift to. */
  wander: Point[];
  objects: RoomObject[];
}

const OBJECT_LABELS: Record<PanelId, string> = {
  metrics: "Metrics", notebook: "Notebook", inbox: "Inbox",
  roadmap: "Roadmap", team: "Team", capital: "Capital",
};

function object(panel: PanelId, kind: ObjectKind, tx: number, ty: number): RoomObject {
  return { panel, kind, tx, ty, label: OBJECT_LABELS[panel] };
}

/** A bank of desks with the seat one tile south of each desk. */
function deskBank(startX: number, startY: number, perRow: number, rowCount: number, stepX = 2, stepY = 3) {
  const furniture: Furniture[] = [];
  const seats: Point[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < perRow; col += 1) {
      const tx = startX + col * stepX;
      const ty = startY + row * stepY;
      furniture.push({ kind: "desk", tx, ty });
      furniture.push({ kind: "chair", tx, ty: ty + 1 });
      seats.push({ x: tx, y: ty + 1 });
    }
  }
  return { furniture, seats };
}

function apartment(): OfficePlan {
  return {
    cols: 7, rows: 6,
    furniture: [
      { kind: "desk", tx: 2, ty: 1 }, { kind: "desk", tx: 3, ty: 1 }, { kind: "desk", tx: 4, ty: 1 },
      { kind: "chair", tx: 3, ty: 2 },
      { kind: "bed", tx: 1, ty: 4 }, { kind: "plant", tx: 5, ty: 4 },
      { kind: "rug", tx: 3, ty: 4 }, { kind: "shelf", tx: 6, ty: 1 },
    ],
    seats: [{ x: 3, y: 2 }, { x: 2, y: 3 }],
    kitchen: [{ x: 6, y: 3 }],
    meeting: [{ x: 3, y: 4 }],
    wander: [{ x: 1, y: 2 }, { x: 5, y: 2 }, { x: 4, y: 4 }, { x: 2, y: 5 }],
    objects: [
      object("metrics", "monitor", 3, 1),
      object("notebook", "notebook", 2, 1),
      object("inbox", "phone", 4, 1),
      object("roadmap", "whiteboard", 5, 0),
      object("team", "door", 0, 3),
      object("capital", "safe", 6, 4),
    ],
  };
}

function kitchen(): OfficePlan {
  return {
    cols: 8, rows: 7,
    furniture: [
      { kind: "desk", tx: 3, ty: 2 }, { kind: "desk", tx: 4, ty: 2 }, { kind: "desk", tx: 5, ty: 2 },
      { kind: "chair", tx: 3, ty: 3 }, { kind: "chair", tx: 5, ty: 3 },
      { kind: "counter", tx: 1, ty: 1 }, { kind: "counter", tx: 2, ty: 1 },
      { kind: "cooler", tx: 1, ty: 3 }, { kind: "plant", tx: 7, ty: 5 },
      { kind: "rug", tx: 4, ty: 5 }, { kind: "sofa", tx: 6, ty: 5 },
    ],
    seats: [{ x: 4, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 3 }],
    kitchen: [{ x: 1, y: 2 }, { x: 2, y: 2 }],
    meeting: [{ x: 6, y: 5 }, { x: 5, y: 5 }],
    wander: [{ x: 2, y: 5 }, { x: 7, y: 2 }, { x: 4, y: 6 }, { x: 1, y: 5 }],
    objects: [
      object("metrics", "monitor", 4, 2),
      object("notebook", "notebook", 3, 2),
      object("inbox", "phone", 5, 2),
      object("roadmap", "whiteboard", 6, 0),
      object("team", "door", 0, 4),
      object("capital", "safe", 7, 1),
    ],
  };
}

function openPlan(stage: Exclude<RoomStage, "apartment" | "kitchen">): OfficePlan {
  const spec = {
    coworking: { cols: 11, rows: 8, perRow: 3, rowCount: 2 },
    office: { cols: 14, rows: 10, perRow: 5, rowCount: 3 },
    downsized: { cols: 14, rows: 10, perRow: 5, rowCount: 3 },
    floor: { cols: 16, rows: 12, perRow: 7, rowCount: 4 },
    hq: { cols: 20, rows: 13, perRow: 9, rowCount: 4 },
  }[stage];

  const bank = deskBank(2, 1, spec.perRow, spec.rowCount);
  const furniture: Furniture[] = [...bank.furniture];
  const right = spec.cols - 1;
  const bottom = spec.rows - 1;

  // Break room along the east edge.
  furniture.push({ kind: "counter", tx: right, ty: 1 }, { kind: "counter", tx: right, ty: 2 });
  furniture.push({ kind: "cooler", tx: right, ty: 4 });
  furniture.push({ kind: "sofa", tx: right - 1, ty: bottom - 1 });
  furniture.push({ kind: "plant", tx: right, ty: bottom }, { kind: "plant", tx: 0, ty: bottom });
  furniture.push({ kind: "rug", tx: right - 2, ty: bottom - 1 });

  // Meeting table in the south-west.
  const meetX = 2;
  const meetY = bottom - 1;
  furniture.push({ kind: "meetingTable", tx: meetX, ty: meetY }, { kind: "meetingTable", tx: meetX + 1, ty: meetY });
  furniture.push({ kind: "chair", tx: meetX, ty: meetY + 1 }, { kind: "chair", tx: meetX + 1, ty: meetY + 1 });

  if (stage === "floor" || stage === "hq") {
    furniture.push({ kind: "server", tx: right - 1, ty: 1 });
    furniture.push({ kind: "lamp", tx: 0, ty: 2 });
  }
  if (stage === "downsized") {
    // Empty desks: the chairs are gone and the plants have died back.
    furniture.push({ kind: "shelf", tx: 0, ty: 1 });
  }

  const wander: Point[] = [];
  for (let ty = 1; ty < bottom; ty += 2) wander.push({ x: 1, y: ty }, { x: right - 3, y: ty });
  wander.push({ x: Math.floor(spec.cols / 2), y: bottom });

  return {
    cols: spec.cols, rows: spec.rows, furniture,
    seats: bank.seats,
    kitchen: [{ x: right - 1, y: 2 }, { x: right - 1, y: 3 }],
    meeting: [{ x: meetX, y: meetY + 1 }, { x: meetX + 1, y: meetY + 1 }, { x: meetX + 2, y: meetY }],
    wander,
    objects: [
      object("metrics", "monitor", 2, 1),
      object("notebook", "notebook", 4, 1),
      object("inbox", "phone", 6, 1),
      object("roadmap", "whiteboard", Math.min(spec.cols - 3, 8), 0),
      object("team", "door", 0, Math.floor(spec.rows / 2)),
      object("capital", "safe", right, bottom - 3),
    ],
  };
}

const CACHE = new Map<RoomStage, OfficePlan>();

export function planFor(stage: RoomStage): OfficePlan {
  const cached = CACHE.get(stage);
  if (cached) return cached;
  const plan = stage === "apartment" ? apartment() : stage === "kitchen" ? kitchen() : openPlan(stage);
  CACHE.set(stage, plan);
  return plan;
}

/** Tiles an agent may not stand on. */
export function blockedTiles(plan: OfficePlan): Set<string> {
  const blocked = new Set<string>();
  for (const item of plan.furniture) {
    if (item.kind === "rug" || item.kind === "chair") continue;
    blocked.add(`${item.tx},${item.ty}`);
  }
  return blocked;
}
