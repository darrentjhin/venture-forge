import { useState } from "react";
import { selectMoralePhrase, selectRoomStage, selectRunwayDisplay, selectRunwayMood } from "../engine/selectors";
import type { GameState, PanelId, Person as PersonData } from "../engine/types";
import { useGame } from "../store/useGame";
import { OfficeView } from "./OfficeView";

const STAGE_LABELS = {
  apartment: "YOUR ROOM", kitchen: "KITCHEN TABLE", coworking: "COWORKING CORNER",
  office: "FIRST OFFICE", floor: "OFFICE FLOOR", hq: "HEADQUARTERS", downsized: "DOWNSIZED OFFICE",
} as const;

const PANELS: { id: PanelId; label: string }[] = [
  { id: "metrics", label: "Metrics" }, { id: "notebook", label: "Notebook" }, { id: "inbox", label: "Inbox" },
  { id: "roadmap", label: "Roadmap" }, { id: "team", label: "Team" }, { id: "capital", label: "Capital" },
];

export function Room({ state, onOpen }: { state: GameState; onOpen: (panel: PanelId) => void }) {
  const [hovered, setHovered] = useState<PersonData | null>(null);
  const queueAction = useGame((store) => store.queueAction);
  const stage = selectRoomStage(state);
  const mood = selectRunwayMood(state);

  return <section className={`room-wrap mood-${mood}`} aria-label={`${STAGE_LABELS[stage]}, company office`}>
    <div className="room-stage-tag">
      <span>{STAGE_LABELS[stage]}</span>
      <b>{state.people.length + 1} {state.people.length === 0 ? "person" : "people"} · {selectRunwayDisplay(state)} left</b>
    </div>

    <OfficeView state={state} onOpen={onOpen} onHoverPerson={setHovered}/>

    {hovered && <aside className="person-card">
      <span>{hovered.role} · week {Math.max(1, state.week - hovered.hiredWeek + 1)}</span>
      <strong>{hovered.name}</strong>
      <p>{selectMoralePhrase(hovered)}. {hovered.quirk}</p>
      {hovered.name !== "You" && <button onClick={() => queueAction("oneOnOne", hovered.id)} disabled={state.focus < 1}>
        Run a 1:1 · 1 Focus
      </button>}
    </aside>}

    {/* The canvas is not reachable by keyboard, so the same six destinations
        are exposed here for screen readers and tab navigation. */}
    <ul className="sr-only">
      {PANELS.map((panel) => <li key={panel.id}><button onClick={() => onOpen(panel.id)}>Open {panel.label}</button></li>)}
    </ul>
  </section>;
}
