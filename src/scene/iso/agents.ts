import type { PersonMotion } from "../../engine/types";
import type { Point } from "./geometry";
import type { OfficePlan } from "./officePlans";

export interface Agent {
  id: string;
  name: string;
  /** Fractional tile position. */
  x: number; y: number;
  seat: Point;
  path: Point[];
  target: Point | null;
  facing: "se" | "sw" | "ne" | "nw";
  motion: PersonMotion;
  /** Frames to wait once the destination is reached. */
  dwell: number;
  phase: number;
  slumped: boolean;
  skin: number; shirt: number; hair: number; glasses: boolean;
}

const SPEED = 0.028; // tiles per frame

function key(x: number, y: number) { return `${x},${y}`; }

/** Breadth-first path on the tile grid. Grids here are small, so this is cheap. */
export function findPath(plan: OfficePlan, blocked: Set<string>, from: Point, to: Point): Point[] {
  const start = { x: Math.round(from.x), y: Math.round(from.y) };
  const goal = { x: Math.round(to.x), y: Math.round(to.y) };
  if (start.x === goal.x && start.y === goal.y) return [];

  const queue: Point[] = [start];
  const cameFrom = new Map<string, Point | null>([[key(start.x, start.y), null]]);
  const inBounds = (p: Point) => p.x >= 0 && p.y >= 0 && p.x < plan.cols && p.y < plan.rows;

  while (queue.length) {
    const current = queue.shift()!;
    if (current.x === goal.x && current.y === goal.y) break;
    const neighbours = [
      { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 },
    ];
    for (const next of neighbours) {
      const id = key(next.x, next.y);
      if (!inBounds(next) || cameFrom.has(id)) continue;
      // The goal itself may be a seat tucked against furniture, so allow it.
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
  path.shift(); // drop the tile we are already standing on
  return path;
}

/** Where a given simulation motion should send an agent. */
export function destinationFor(agent: Agent, motion: PersonMotion, plan: OfficePlan, roll: number): Point {
  const pick = (list: Point[]) => list.length ? list[roll % list.length] : agent.seat;
  switch (motion) {
    case "coffee": return pick(plan.kitchen);
    case "meeting": return pick(plan.meeting);
    case "walking": return pick(plan.wander);
    case "talking": return pick(plan.wander);
    case "leaving": return { x: 0, y: Math.floor(plan.rows / 2) };
    default: return agent.seat;
  }
}

function faceToward(agent: Agent, dx: number, dy: number) {
  if (Math.abs(dx) >= Math.abs(dy)) agent.facing = dx > 0 ? "se" : "nw";
  else agent.facing = dy > 0 ? "sw" : "ne";
}

/** Advances one agent by a frame. */
export function stepAgent(agent: Agent, plan: OfficePlan, blocked: Set<string>, frame: number) {
  if (agent.dwell > 0) { agent.dwell -= 1; return; }

  if (!agent.path.length) {
    const wanted = destinationFor(agent, agent.motion, plan, agent.phase + frame);
    const atTarget = Math.abs(agent.x - wanted.x) < .12 && Math.abs(agent.y - wanted.y) < .12;
    if (atTarget) {
      // Settle exactly on the tile and idle for a while.
      agent.x = wanted.x; agent.y = wanted.y;
      agent.dwell = 40 + (agent.phase % 60);
      if (agent.motion === "typing" || agent.motion === "thinking") agent.facing = "se";
      return;
    }
    agent.path = findPath(plan, blocked, agent, wanted);
    agent.target = wanted;
    if (!agent.path.length) { agent.x = wanted.x; agent.y = wanted.y; return; }
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
  faceToward(agent, dx, dy);
  agent.x += (dx / distance) * SPEED;
  agent.y += (dy / distance) * SPEED;
}

export function isWalking(agent: Agent): boolean {
  return agent.path.length > 0 && agent.dwell === 0;
}
