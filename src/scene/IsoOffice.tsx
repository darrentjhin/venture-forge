import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { appearanceFromId } from "../engine/people";
import { selectRoomStage, selectRunwayMood } from "../engine/selectors";
import type { GameState, PanelId, Person, PersonMotion } from "../engine/types";
import { isWalking, stepAgent, type Agent } from "./iso/agents";
import { drawAgent, drawFloor, drawFurniture, drawObject, drawWalls, paletteFor, type ObjectHit } from "./iso/draw";
import { toScreen, viewFor } from "./iso/geometry";
import { blockedTiles, planFor } from "./iso/officePlans";

const MOTIONS: PersonMotion[] = ["typing", "typing", "typing", "thinking", "walking", "coffee", "meeting", "talking"];

function rollMotion(person: Person, roll: number): PersonMotion {
  if (person.morale < 35 && roll % 5 < 2) return "struggling";
  if (person.morale < 55 && roll % 7 < 2) return "coffee";
  return MOTIONS[roll % MOTIONS.length];
}

function makeAgent(person: Person, seat: { x: number; y: number }, index: number): Agent {
  const look = appearanceFromId(person.id);
  return {
    id: person.id, name: person.name,
    x: seat.x, y: seat.y, seat, path: [], target: null,
    facing: "se", motion: "typing", dwell: index * 7, phase: (index * 37) % 120,
    slumped: person.morale < 35,
    skin: look.skin, shirt: look.shirt, hair: look.hair, glasses: look.glasses,
  };
}

export function IsoOffice({ state, onOpen, onHoverPerson }: {
  state: GameState;
  onOpen: (panel: PanelId) => void;
  onHoverPerson: (person: Person | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const agentsRef = useRef<Agent[]>([]);
  const hitsRef = useRef<ObjectHit[]>([]);
  const [hoveredPanel, setHoveredPanel] = useState<PanelId | null>(null);

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

  // Keep the agent list in step with the roster, preserving positions of people
  // who are still here so nobody teleports when a hire arrives.
  useEffect(() => {
    const existing = new Map(agentsRef.current.map((agent) => [agent.id, agent]));
    agentsRef.current = people.slice(0, plan.seats.length).map((person, index) => {
      const seat = plan.seats[index] ?? plan.seats[plan.seats.length - 1];
      const found = existing.get(person.id);
      if (!found) return makeAgent(person, seat, index);
      found.seat = seat;
      found.slumped = person.morale < 35;
      found.name = person.name;
      return found;
    });
  }, [people, plan]);

  const badges: Partial<Record<PanelId, number>> = {
    notebook: unread,
    inbox: state.pendingEvents.length,
    roadmap: 0,
  };

  const render = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const palette = paletteFor(mood);
    const { origin } = view;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = mood >= 4 ? "#1d1a17" : "#c3b7a2";
    ctx.fillRect(0, 0, view.width, view.height);

    drawWalls(ctx, plan.cols, plan.rows, origin, palette);
    drawFloor(ctx, plan.cols, plan.rows, origin, palette);

    // Wall calendar, so the week is readable inside the fiction too.
    const cal = toScreen(2, -1, origin);
    ctx.fillStyle = "#f5f1e9";
    ctx.fillRect(Math.round(cal.x - 9), Math.round(cal.y - 26), 18, 14);
    ctx.fillStyle = "#e1523d";
    ctx.fillRect(Math.round(cal.x - 9), Math.round(cal.y - 26), 18, 4);
    ctx.fillStyle = "#22201d";
    ctx.font = "7px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`W${state.week}`, Math.round(cal.x), Math.round(cal.y - 15));

    // Everything on the floor is depth-sorted so people pass behind desks.
    const hits: ObjectHit[] = [];
    type Item = { depth: number; order: number; paint: () => void };
    const items: Item[] = [];

    plan.furniture.forEach((furniture, index) => items.push({
      depth: furniture.tx + furniture.ty, order: furniture.kind === "rug" ? -1 : index,
      paint: () => drawFurniture(ctx, furniture, origin, palette),
    }));

    plan.objects.forEach((object) => items.push({
      depth: object.tx + object.ty, order: 500,
      paint: () => hits.push(drawObject(ctx, object, origin, {
        hovered: hoveredPanel === object.panel,
        badge: badges[object.panel],
        pulse: object.panel === "metrics" ? metricPulse : object.panel === "capital" ? state.conviction >= 55 : false,
        frame,
      })),
    }));

    agentsRef.current.forEach((agent, index) => items.push({
      depth: agent.x + agent.y, order: 900 + index,
      paint: () => drawAgent(ctx, {
        x: agent.x, y: agent.y, skin: agent.skin, shirt: agent.shirt, hair: agent.hair, glasses: agent.glasses,
        facing: agent.facing, walking: isWalking(agent), slumped: agent.slumped, phase: agent.phase,
      }, origin, frame, false),
    }));

    items.sort((a, b) => a.depth - b.depth || a.order - b.order);
    for (const item of items) item.paint();

    hitsRef.current = hits;

    if (palette.shadeAlpha > 0) {
      ctx.globalAlpha = palette.shadeAlpha;
      ctx.fillStyle = palette.shade;
      ctx.fillRect(0, 0, view.width, view.height);
      ctx.globalAlpha = 1;
    }
  }, [plan, view, mood, hoveredPanel, state.week, state.pendingEvents.length, state.conviction, metricPulse, unread]);

  // Paint one frame synchronously so a background tab still shows the office.
  useEffect(() => { render(0); }, [render]);

  useEffect(() => {
    let frame = 0;
    let raf = 0;
    let behaviour = 0;
    const loop = () => {
      frame += 1;
      behaviour += 1;
      if (behaviour > 90) {
        behaviour = 0;
        const agent = agentsRef.current[Math.floor(Math.random() * agentsRef.current.length)];
        const person = people.find((item) => item.id === agent?.id);
        if (agent && person) {
          agent.motion = rollMotion(person, Math.floor(Math.random() * 100));
          agent.path = [];
          agent.dwell = 0;
        }
      }
      for (const agent of agentsRef.current) stepAgent(agent, plan, blocked, frame);
      render(frame);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [render, plan, blocked, people]);

  const toInternal = useCallback((event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: -999, y: -999 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * view.width,
      y: ((event.clientY - rect.top) / rect.height) * view.height,
    };
  }, [view]);

  const handleMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = toInternal(event);
    const hit = hitsRef.current.find((item) => point.x >= item.x && point.x <= item.x + item.w && point.y >= item.y && point.y <= item.y + item.h);
    setHoveredPanel((hit?.panel as PanelId) ?? null);

    if (!hit) {
      const { origin } = view;
      const near = agentsRef.current.find((agent) => {
        const screen = toScreen(agent.x, agent.y, view.origin);
        return Math.abs(screen.x - point.x) < 6 && point.y > screen.y - 16 && point.y < screen.y + 4;
      });
      const person = near ? people.find((item) => item.id === near.id) ?? null : null;
      onHoverPerson(person);
    } else {
      onHoverPerson(null);
    }
  }, [toInternal, view, people, onHoverPerson]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = toInternal(event);
    const hit = hitsRef.current.find((item) => point.x >= item.x && point.x <= item.x + item.w && point.y >= item.y && point.y <= item.y + item.h);
    if (hit) onOpen(hit.panel as PanelId);
  }, [toInternal, onOpen]);

  return <canvas
    ref={canvasRef}
    className="iso-canvas"
    width={view.width}
    height={view.height}
    style={{ cursor: hoveredPanel ? "pointer" : "default" }}
    onMouseMove={handleMove}
    onMouseLeave={() => { setHoveredPanel(null); onHoverPerson(null); }}
    onClick={handleClick}
    aria-label="Isometric view of the company office"
  />;
}
