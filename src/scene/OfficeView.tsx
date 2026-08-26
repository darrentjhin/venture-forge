import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { appearanceFromId } from "../engine/people";
import { selectRoomStage, selectRunwayMood } from "../engine/selectors";
import type { GameState, PanelId, Person, PersonMotion } from "../engine/types";
import { findPath, hasArrived, isWalking, sendAgentTo, stepAgent, type Agent } from "./room/agents";
import { TILE, tileFloor, toScreen, viewFor } from "./room/geometry";
import { paletteFor } from "./room/palette";
import { blockedTiles, planFor } from "./room/plans";
import { drawCharacter, drawFurniture, drawObject, drawRoomShell, drawTag, drawWallDecor, px, type ObjectHit } from "./room/sprites";

const MOTIONS: PersonMotion[] = ["typing", "typing", "typing", "typing", "thinking", "walking", "coffee", "meeting", "talking"];

function rollMotion(person: Person, roll: number): PersonMotion {
  if (person.morale < 35 && roll % 5 < 2) return "struggling";
  if (person.morale < 55 && roll % 7 < 2) return "coffee";
  return MOTIONS[roll % MOTIONS.length];
}

const ROLE_TAGS: Record<string, string> = {
  Cofounder: "COFOUNDER", Engineer: "ENGINEER", Designer: "DESIGNER",
  Sales: "SALES", "Customer success": "SUCCESS", Operations: "OPS",
};

function makeAgent(person: Person, seat: { x: number; y: number }, index: number): Agent {
  const look = appearanceFromId(person.id);
  return {
    id: person.id,
    label: person.name === "You" ? "YOU" : ROLE_TAGS[person.role] ?? person.role.toUpperCase(),
    x: seat.x, y: seat.y, seat, path: [], target: null,
    facing: "down", motion: "typing", dwell: index * 11, phase: (index * 41) % 140,
    slumped: person.morale < 35,
    skin: look.skin, hair: look.hair, shirt: look.shirt, pants: (look.head + index) % 4,
    glasses: look.glasses, hairStyle: look.hair,
    controlled: index === 0,
  };
}

type PendingInteraction = { kind: "panel"; panel: PanelId } | { kind: "coffee" };

export function OfficeView({ state, onOpen, onHoverPerson, onCoffee }: {
  state: GameState;
  onOpen: (panel: PanelId) => void;
  onHoverPerson: (person: Person | null) => void;
  onCoffee: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const agentsRef = useRef<Agent[]>([]);
  const hitsRef = useRef<ObjectHit[]>([]);
  const pendingRef = useRef<PendingInteraction | null>(null);
  const [hoveredPanel, setHoveredPanel] = useState<PanelId | "coffee" | null>(null);

  const stage = selectRoomStage(state);
  const mood = selectRunwayMood(state);
  const plan = useMemo(() => planFor(stage), [stage]);
  const view = useMemo(() => viewFor(plan.cols, plan.rows), [plan]);
  const blocked = useMemo(() => blockedTiles(plan), [plan]);

  const founder = useMemo<Person>(() => ({
    id: `founder-${state.seed}`, name: "You", role: "Operations", archetype: "operator", salaryWeekly: 0,
    skill: 74, morale: 76, beliefs: {}, drift: 0, quirk: "Still checks the bank balance before opening the roadmap.",
    hiredWeek: 1, seat: 0, appearance: appearanceFromId(`founder-${state.seed}`), motion: "typing", isCofounder: false,
  }), [state.seed]);

  const people = useMemo(() => [founder, ...state.people], [founder, state.people]);
  const unread = state.evidence.filter((card) => !card.read).length;
  const metricPulse = state.history.length > 2 && Math.abs(state.mrr - state.previousMrr) / Math.max(1, state.previousMrr) > .15;

  // Keep agents in step with the roster, preserving positions of people who
  // are still here so nobody teleports when a hire arrives.
  useEffect(() => {
    const existing = new Map(agentsRef.current.map((agent) => [agent.id, agent]));
    agentsRef.current = people.slice(0, plan.seats.length).map((person, index) => {
      const seat = plan.seats[index] ?? plan.seats[plan.seats.length - 1];
      const found = existing.get(person.id);
      if (!found) return makeAgent(person, seat, index);
      if (found.seat.x !== seat.x || found.seat.y !== seat.y) { found.seat = seat; found.target = null; found.path = []; }
      found.slumped = person.morale < 35;
      return found;
    });
  }, [people, plan]);

  const render = useCallback((frame: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = paletteFor(mood);
    const { origin } = view;
    const showTags = agentsRef.current.length <= 10;

    ctx.imageSmoothingEnabled = false;
    px(ctx, 0, 0, view.width, view.height, "#0d1119");
    drawRoomShell(ctx, plan.cols, plan.rows, origin, p);
    drawWallDecor(ctx, plan.cols, origin, p, mood, state.week);

    const hits: ObjectHit[] = [];
    type Item = { depth: number; order: number; paint: () => void };
    const items: Item[] = [];

    plan.furniture.forEach((item, index) => items.push({
      depth: item.ty, order: item.kind === "rug" ? -100 : index,
      paint: () => {
        const { x, y } = toScreen(item.tx, item.ty, origin);
        drawFurniture(ctx, item.kind, x, y, item.tx * 3 + item.ty, p);
      },
    }));

    plan.objects.forEach((object) => items.push({
      depth: object.ty, order: 500,
      paint: () => {
        const { x, y } = toScreen(object.tx, object.ty, origin);
        hits.push(drawObject(ctx, object.kind, object.panel, x, y, {
          hovered: hoveredPanel === object.panel,
          badge: object.panel === "notebook" ? unread + state.findings.filter((item) => !item.actedOn).length : object.panel === "inbox" ? state.pendingEvents.length + state.tasks.length : 0,
          pulse: object.panel === "metrics" ? metricPulse : object.panel === "capital" ? state.conviction >= 55 : false,
          frame,
        }));
      },
    }));

    items.push({
      depth: plan.coffeeMachine.y, order: 510,
      paint: () => {
        const { x, y } = toScreen(plan.coffeeMachine.x, plan.coffeeMachine.y, origin);
        const lift = hoveredPanel === "coffee" ? -2 : 0;
        px(ctx, x + 7, y - 10 + lift, 20, 27, "#31394b");
        px(ctx, x + 10, y - 7 + lift, 14, 8, "#71809a");
        px(ctx, x + 12, y - 5 + lift, 10, 3, "#202638");
        px(ctx, x + 11, y + 5 + lift, 12, 8, "#171c29");
        px(ctx, x + 13, y + 8 + lift, 8, 4, "#d89b55");
        hits.push({ panel: "coffee", x: x + 4, y: y - 13, w: 26, h: 34 });
      },
    });

    const beatKinds = ["plant", "lamp", "bin"] as const;
    for (let index = 0; index < Math.min(4, state.officeBeat); index += 1) {
      const tx = Math.max(0, plan.cols - 2 - index * 2);
      const ty = plan.rows - 1;
      items.push({ depth: ty, order: 250 + index, paint: () => {
        const { x, y } = toScreen(tx, ty, origin);
        drawFurniture(ctx, beatKinds[index % beatKinds.length], x, y, state.officeBeat + index, p);
      } });
    }

    agentsRef.current.forEach((agent, index) => items.push({
      depth: agent.y, order: 400 + index,
      paint: () => {
        const jitter = index === 0 && state.founder.jittery && Math.floor(frame / 2) % 2 === 0 ? 1 : 0;
        const foot = tileFloor(agent.x, agent.y, origin);
        foot.x += jitter;
        drawCharacter(ctx, foot.x, foot.y, { ...agent, walking: isWalking(agent) }, frame);
        if (showTags) drawTag(ctx, foot.x, foot.y - 34, agent.label);
      },
    }));

    items.sort((a, b) => a.depth - b.depth || a.order - b.order);
    for (const item of items) item.paint();

    hitsRef.current = hits;

    // Warm lamp wash, then a cool dim as the runway shortens.
    if (p.glow > 0) {
      ctx.globalAlpha = p.glow;
      px(ctx, 0, 0, view.width, view.height, "#ffb454");
      ctx.globalAlpha = 1;
    }
    if (p.dim > 0) {
      ctx.globalAlpha = p.dim;
      px(ctx, 0, 0, view.width, view.height, "#0a1420");
      ctx.globalAlpha = 1;
    }
  }, [plan, view, mood, hoveredPanel, state.week, state.pendingEvents.length, state.conviction, state.officeBeat, state.founder.jittery, metricPulse, unread]);

  // One synchronous frame, so a tab loaded in the background is never blank.
  useEffect(() => { render(0); }, [render]);

  useEffect(() => {
    let frame = 0;
    let raf = 0;
    let sinceRoll = 0;
    const loop = () => {
      frame += 1;
      sinceRoll += 1;
      if (sinceRoll > 70 && agentsRef.current.length) {
        sinceRoll = 0;
        const idleAgents = agentsRef.current.slice(1);
        const agent = idleAgents[Math.floor(Math.random() * idleAgents.length)];
        const person = agent ? people.find((item) => item.id === agent.id) : null;
        if (agent && person) {
          agent.motion = rollMotion(person, Math.floor(Math.random() * 100));
          agent.path = [];
          agent.target = null;
          agent.dwell = 0;
        }
      }
      for (const agent of agentsRef.current) stepAgent(agent, plan, blocked, frame);
      const player = agentsRef.current[0];
      if (player && pendingRef.current && hasArrived(player)) {
        const interaction = pendingRef.current;
        pendingRef.current = null;
        player.motion = "typing";
        if (interaction.kind === "coffee") onCoffee();
        else onOpen(interaction.panel);
      }
      render(frame);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [render, plan, blocked, people, onCoffee, onOpen]);

  const toInternal = useCallback((event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: -999, y: -999 };
    const rect = canvas.getBoundingClientRect();
    // object-fit: contain letterboxes the canvas, so back out the real box.
    const scale = Math.min(rect.width / view.width, rect.height / view.height);
    const drawnW = view.width * scale;
    const drawnH = view.height * scale;
    return {
      x: (event.clientX - rect.left - (rect.width - drawnW) / 2) / scale,
      y: (event.clientY - rect.top - (rect.height - drawnH) / 2) / scale,
    };
  }, [view]);

  const hitAt = (point: { x: number; y: number }) =>
    hitsRef.current.find((item) => point.x >= item.x && point.x <= item.x + item.w && point.y >= item.y && point.y <= item.y + item.h);

  const handleMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = toInternal(event);
    const hit = hitAt(point);
    setHoveredPanel((hit?.panel as PanelId | "coffee") ?? null);
    if (hit) { onHoverPerson(null); return; }

    const { origin } = view;
    const near = agentsRef.current.find((agent) => {
      const foot = tileFloor(agent.x, agent.y, origin);
      return Math.abs(foot.x - point.x) < 11 && point.y > foot.y - 32 && point.y < foot.y + 3;
    });
    onHoverPerson(near ? people.find((item) => item.id === near.id) ?? null : null);
  }, [toInternal, view, people, onHoverPerson]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = toInternal(event);
    const hit = hitAt(point);
    const player = agentsRef.current[0];
    if (!player) return;

    if (hit?.panel === "coffee") {
      pendingRef.current = { kind: "coffee" };
      sendAgentTo(player, plan, blocked, plan.kitchen[0]);
      return;
    }

    if (hit) {
      const panel = hit.panel as PanelId;
      const object = plan.objects.find((item) => item.panel === panel);
      if (!object) return;
      const base = { x: Math.max(0, Math.min(plan.cols - 1, Math.round(object.tx))), y: Math.max(0, Math.min(plan.rows - 1, Math.round(object.ty))) };
      const candidates = [base, { x: base.x, y: base.y - 1 }, { x: base.x, y: base.y + 1 }, { x: base.x - 1, y: base.y }, { x: base.x + 1, y: base.y }]
        .filter((tile) => tile.x >= 0 && tile.y >= 0 && tile.x < plan.cols && tile.y < plan.rows && !blocked.has(`${tile.x},${tile.y}`))
        .map((tile) => ({ tile, path: findPath(plan, blocked, player, tile) }))
        .filter((choice) => choice.path.length > 0 || (Math.abs(player.x - choice.tile.x) < .1 && Math.abs(player.y - choice.tile.y) < .1))
        .sort((a, b) => a.path.length - b.path.length);
      const destination = candidates[0]?.tile;
      if (destination && sendAgentTo(player, plan, blocked, destination)) pendingRef.current = { kind: "panel", panel };
      return;
    }

    const { origin } = view;
    const tile = {
      x: Math.floor((point.x - origin.x) / TILE),
      y: Math.floor((point.y - origin.y) / TILE),
    };
    if (tile.x < 0 || tile.y < 0 || tile.x >= plan.cols || tile.y >= plan.rows || blocked.has(`${tile.x},${tile.y}`)) return;
    pendingRef.current = null;
    sendAgentTo(player, plan, blocked, tile);
  }, [toInternal, plan, blocked, view]);

  return <canvas
    ref={canvasRef}
    className="office-canvas"
    width={view.width}
    height={view.height}
    style={{ cursor: hoveredPanel ? "pointer" : "default" }}
    onMouseMove={handleMove}
    onMouseLeave={() => { setHoveredPanel(null); onHoverPerson(null); }}
    onClick={handleClick}
    aria-label="Pixel-art view of the company office"
  />;
}
