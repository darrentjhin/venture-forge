import { describe, expect, it } from "vitest";
import { findPath, hasArrived, isWalking, sendAgentTo, stepAgent, type Agent } from "../scene/room/agents";
import { blockedTiles, planFor } from "../scene/room/plans";
import { pickSignGap } from "../scene/room/sprites";
import { TILE, viewFor } from "../scene/room/geometry";
import { SEATS_REQUIRED } from "../scene/room/plans";
import { integerScaleFor } from "../scene/room/geometry";

function agentAt(x: number, y: number, seat: { x: number; y: number }): Agent {
  return {
    id: "a", label: "TEST", x, y, seat, path: [], target: null, facing: "down", motion: "typing",
    dwell: 0, phase: 0, slumped: false, skin: 0, hair: 0, shirt: 0, pants: 0, glasses: false, hairStyle: 0,
  };
}

describe("office rooms", () => {
  it("uses whole-number canvas scaling and never shrinks a source pixel", () => {
    expect(integerScaleFor(1280, 720, 448, 256)).toBe(2);
    expect(integerScaleFor(390, 600, 832, 400)).toBe(1);
    expect(Number.isInteger(integerScaleFor(1537, 811, 448, 256))).toBe(true);
  });
  it("gives every stage enough seats for the headcount that reaches it", () => {
    for (const [stage, needed] of Object.entries(SEATS_REQUIRED)) {
      const plan = planFor(stage as keyof typeof SEATS_REQUIRED);
      expect(plan.seats.length, `${stage} seats`).toBeGreaterThanOrEqual(needed);
    }
  });

  it("keeps every seat, destination and object inside the room", () => {
    for (const stage of Object.keys(SEATS_REQUIRED) as (keyof typeof SEATS_REQUIRED)[]) {
      const plan = planFor(stage);
      const inside = (p: { x: number; y: number }) => p.x >= 0 && p.y >= 0 && p.x < plan.cols && p.y < plan.rows;
      plan.seats.forEach((seat) => expect(inside(seat), `${stage} seat`).toBe(true));
      plan.kitchen.forEach((p) => expect(inside(p), `${stage} kitchen`).toBe(true));
      plan.meeting.forEach((p) => expect(inside(p), `${stage} meeting`).toBe(true));
      plan.wander.forEach((p) => expect(inside(p), `${stage} wander`).toBe(true));
      // Wall-mounted objects sit above row 0 on purpose.
      plan.objects.forEach((o) => expect(o.tx >= 0 && o.tx < plan.cols, `${stage} object ${o.panel}`).toBe(true));
    }
  });

  it("never seats two people on the same tile", () => {
    for (const stage of Object.keys(SEATS_REQUIRED) as (keyof typeof SEATS_REQUIRED)[]) {
      const plan = planFor(stage);
      const keys = plan.seats.map((seat) => `${seat.x},${seat.y}`);
      expect(new Set(keys).size, `${stage} duplicate seats`).toBe(keys.length);
    }
  });

  it("paths around furniture rather than through it", () => {
    const plan = planFor("office");
    const blocked = blockedTiles(plan);
    const path = findPath(plan, blocked, { x: 0, y: 0 }, plan.kitchen[0]);
    expect(path.length).toBeGreaterThan(0);
    // Only the destination may be a blocked tile (a seat tucked against a desk).
    path.slice(0, -1).forEach((step) => expect(blocked.has(`${step.x},${step.y}`)).toBe(false));
    // Each step is one orthogonal tile.
    let previous = { x: 0, y: 0 };
    for (const step of path) {
      expect(Math.abs(step.x - previous.x) + Math.abs(step.y - previous.y)).toBe(1);
      previous = step;
    }
  });

  it("walks an agent to its seat and settles it there", () => {
    const plan = planFor("office");
    const blocked = blockedTiles(plan);
    const seat = plan.seats[4];
    const agent = agentAt(0, 0, seat);

    // Run until it settles: arriving snaps the agent exactly onto the tile and
    // starts a dwell, so that is the real "got there" signal.
    let frame = 0;
    while (frame < 8000 && agent.dwell === 0) {
      stepAgent(agent, plan, blocked, frame);
      frame += 1;
    }
    expect(agent.x).toBeCloseTo(seat.x, 5);
    expect(agent.y).toBeCloseTo(seat.y, 5);
    expect(agent.dwell).toBeGreaterThan(0);
    expect(agent.facing).toBe("down");
    expect(isWalking(agent)).toBe(false);
  });

  it("sends an agent to the kitchen when the simulation says coffee", () => {
    const plan = planFor("office");
    const blocked = blockedTiles(plan);
    const agent = agentAt(plan.seats[0].x, plan.seats[0].y, plan.seats[0]);
    agent.motion = "coffee";

    for (let frame = 0; frame < 8000; frame += 1) stepAgent(agent, plan, blocked, frame);
    const target = plan.kitchen.some((k) => Math.abs(agent.x - k.x) < .01 && Math.abs(agent.y - k.y) < .01);
    expect(target).toBe(true);
  });

  it("lets the player send the founder to a clicked floor tile", () => {
    const plan = planFor("office");
    const blocked = blockedTiles(plan);
    const founder = agentAt(plan.seats[0].x, plan.seats[0].y, plan.seats[0]);
    founder.controlled = true;
    const target = plan.wander.find((tile) => !blocked.has(`${tile.x},${tile.y}`));
    expect(target).toBeDefined();
    if (!target) return;
    expect(sendAgentTo(founder, plan, blocked, target)).toBe(true);
    for (let frame = 0; frame < 8000 && !hasArrived(founder); frame += 1) stepAgent(founder, plan, blocked, frame);
    expect(founder.x).toBeCloseTo(target.x, 5);
    expect(founder.y).toBeCloseTo(target.y, 5);
    expect(hasArrived(founder)).toBe(true);
  });

  it("keeps a controlled founder still until the player clicks", () => {
    const plan = planFor("office");
    const founder = agentAt(3, 3, plan.seats[0]);
    founder.controlled = true;
    for (let frame = 0; frame < 300; frame += 1) stepAgent(founder, plan, blockedTiles(plan), frame);
    expect({ x: founder.x, y: founder.y }).toEqual({ x: 3, y: 3 });
  });

  it("hangs the company sign clear of every wall fixture", () => {
    for (const stage of Object.keys(SEATS_REQUIRED) as (keyof typeof SEATS_REQUIRED)[]) {
      const plan = planFor(stage);
      const view = viewFor(plan.cols, plan.rows);
      const fixtures = plan.objects
        .filter((object) => object.ty < 0)
        .map((object) => ({ x: view.origin.x + object.tx * TILE - 10, w: TILE + 20 }));

      const gap = pickSignGap(view.origin.x + 10, view.origin.x + plan.cols * TILE - 10, fixtures);
      expect(gap.w, `${stage} has no bare wall for a sign`).toBeGreaterThan(60);

      // A sign centred in the gap must not touch any fixture.
      const sign = { x: gap.x + gap.w / 2 - 60, w: 120 };
      for (const fixture of fixtures) {
        const overlaps = sign.x < fixture.x + fixture.w && fixture.x < sign.x + sign.w;
        expect(overlaps, `${stage} sign overlaps a fixture`).toBe(false);
      }
    }
  });
});
