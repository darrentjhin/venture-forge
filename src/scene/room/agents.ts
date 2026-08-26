import type { PersonMotion } from "../../engine/types";
import type { Point } from "./geometry";
import type { RoomPlan } from "./plans";
import type { Facing } from "./sprites";

export interface Agent {
  id: string;
  label: string;
  /** Fractional tile position. */
  x: number; y: number;
  seat: Point;
  path: Point[];
  /** Chosen once per motion; recomputing it each frame makes agents oscillate. */
  target: Point | null;
  facing: Facing;
  motion: PersonMotion;
  /** Frames to stay put once the destination is reached. */
  dwell: number;
  phase: number;
  slumped: boolean;
  skin: number; hair: number; shirt: number; pants: number;
  glasses: boolean; hairStyle: number;
}

const SPEED = 0.05; // tiles per frame

const key = (x: number, y: number) => `${x},${y}`;

/** Breadth-first path over the tile grid. Rooms are small, so this is cheap. */
export function findPath(plan: RoomPlan, blocked: Set<string>, from: Point, to: Point): Point[] {
  const start = { x: Math.round(from.x), y: Math.round(from.y) };
  const goal = { x: Math.round(to.x), y: Math.round(to.y) };
  if (start.x === goal.x && start.y === goal.y) return [];

  const queue: Point[] = [start];
  const cameFrom = new Map<string, Point | null>([[key(start.x, start.y), null]]);
  const inBounds = (p: Point) => p.x >= 0 && p.y >= 0 && p.x < plan.cols && p.y < plan.rows;

  while (queue.length) {
    const current = queue.shift()!;
    if (current.x === goal.x && current.y === goal.y) break;
    for (const next of [
      { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 },
    ]) {
      const id = key(next.x, next.y);
      if (!inBounds(next) || cameFrom.has(id)) continue;
      // The goal may be a seat wedged against furniture, so always allow it.
      if (blocked.has(id) && !(next.x === goal.x && next.y === goal.y)) continue;
      cameFrom.set(id, current);
      queue.push(next);
    }
  }

  if (!cameFrom.has(key(goal.x, goal.y))) return [];
  const path: Point[] = [];
  let cursor: Point | null = goal;
  while (cursor) {
    path.unshift(cursor);
    cursor = cameFrom.get(key(cursor.x, cursor.y)) ?? null;
  }
  path.shift(); // drop the tile already occupied
  return path;
}

/** Where a simulation motion sends an agent. */
export function destinationFor(agent: Agent, plan: RoomPlan, roll: number): Point {
  const pick = (list: Point[]) => (list.length ? list[roll % list.length] : agent.seat);
  switch (agent.motion) {
    case "coffee": return pick(plan.kitchen);
    case "meeting": return pick(plan.meeting);
    case "walking":
    case "talking": return pick(plan.wander);
    case "leaving": return { x: 0, y: 0 };
    default: return agent.seat;
  }
}

export function isWalking(agent: Agent): boolean {
  return agent.path.length > 0 && agent.dwell === 0;
}

/** Advances one agent by a frame. */
export function stepAgent(agent: Agent, plan: RoomPlan, blocked: Set<string>, frame: number) {
  if (agent.dwell > 0) { agent.dwell -= 1; return; }

  // Pick a destination once and hold it. Re-deriving it every frame would flip
  // between equivalent tiles (the two kitchen spots) and never arrive.
  if (!agent.target) agent.target = destinationFor(agent, plan, agent.phase + frame);
  const want = agent.target;

  if (!agent.path.length) {
    if (Math.abs(agent.x - want.x) < .1 && Math.abs(agent.y - want.y) < .1) {
      agent.x = want.x; agent.y = want.y;
      agent.dwell = 50 + (agent.phase % 90);
      // Settled agents face the camera so the office reads as populated.
      agent.facing = "down";
      return;
    }
    agent.path = findPath(plan, blocked, agent, want);
    if (!agent.path.length) { agent.x = want.x; agent.y = want.y; return; }
  }

  const next = agent.path[0];
  const dx = next.x - agent.x;
  const dy = next.y - agent.y;
  const distance = Math.hypot(dx, dy);
  if (distance < SPEED) {
    agent.x = next.x; agent.y = next.y;
    agent.path.shift();
    return;
  }
  if (Math.abs(dx) >= Math.abs(dy)) agent.facing = dx > 0 ? "right" : "left";
  else agent.facing = dy > 0 ? "down" : "up";
  agent.x += (dx / distance) * SPEED;
  agent.y += (dy / distance) * SPEED;
}
