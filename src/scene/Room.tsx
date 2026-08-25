import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { appearanceFromId } from "../engine/people";
import { selectMoralePhrase, selectRoomStage, selectRunway, selectRunwayMood } from "../engine/selectors";
import type { GameState, PanelId, Person as PersonData } from "../engine/types";
import { useGame } from "../store/useGame";
import { Person } from "./Person";
import { SEATS } from "./layout";
import { ApartmentDesk } from "./stages/ApartmentDesk";
import { Coworking } from "./stages/Coworking";
import { FirstOffice } from "./stages/FirstOffice";
import { Headquarters } from "./stages/Headquarters";
import { KitchenTable } from "./stages/KitchenTable";
import { OfficeFloor } from "./stages/OfficeFloor";
import { DoorObject, FilingObject, LaptopObject, NotebookObject, PhoneObject, WhiteboardObject } from "./props/Objects";

const STAGE_LABELS = { apartment: "APARTMENT DESK", kitchen: "KITCHEN TABLE", coworking: "COWORKING CORNER", office: "FIRST OFFICE", floor: "OFFICE FLOOR", hq: "HEADQUARTERS", downsized: "DOWNSIZED OFFICE" } as const;

function Stage({ stage }: { stage: ReturnType<typeof selectRoomStage> }) {
  if (stage === "apartment") return <ApartmentDesk/>;
  if (stage === "kitchen") return <KitchenTable/>;
  if (stage === "coworking") return <Coworking/>;
  if (stage === "office") return <FirstOffice/>;
  if (stage === "floor") return <OfficeFloor/>;
  if (stage === "hq") return <Headquarters/>;
  return <g><FirstOffice/><g className="downsized-props"><rect x="260" y="610" width="120" height="80" fill="#a98658" stroke="#22201d" strokeWidth="5"/><rect x="1120" y="600" width="150" height="90" fill="#a98658" stroke="#22201d" strokeWidth="5"/><path d="M440 610l45-90 45 90M470 520v150M920 610l45-90 45 90M950 520v150" fill="none" stroke="#4a5259" strokeWidth="12"/><circle cx="1370" cy="580" r="45" fill="#5f6754" opacity=".55"/></g></g>;
}

export function Room({ state, onOpen }: { state: GameState; onOpen: (panel: PanelId) => void }) {
  const stage = selectRoomStage(state);
  const mood = selectRunwayMood(state);
  const runway = selectRunway(state);
  const [ambient, setAmbient] = useState(0);
  const [hovered, setHovered] = useState<PersonData | null>(null);
  const queueAction = useGame((store) => store.queueAction);
  useEffect(() => { const timer = window.setInterval(() => setAmbient((value) => value + 1), 8000); return () => window.clearInterval(timer); }, []);
  const founder = useMemo<PersonData>(() => ({ id: `founder-${state.seed}`, name: "You", role: "Operations", archetype: "operator", salaryWeekly: 0, skill: 74, morale: 76, beliefs: {}, drift: 0, quirk: "Still checks the bank balance before opening the roadmap.", hiredWeek: 1, seat: 0, appearance: appearanceFromId(`founder-${state.seed}`), motion: "typing", isCofounder: false }), [state.seed]);
  const people = [founder, ...state.people].map((person, index) => index === ambient % Math.max(1, state.people.length + 1) ? { ...person, motion: person.morale < 35 ? "struggling" as const : (["thinking", "coffee", "talking", "meeting"] as const)[ambient % 4] } : person);
  const seats = SEATS[stage];
  const unread = state.evidence.filter((card) => !card.read).length;
  const metricPulse = state.history.length > 2 && Math.abs(state.mrr - state.previousMrr) / Math.max(1, state.previousMrr) > .15;
  return <section className={`room-wrap mood-${mood}`} aria-label={`${STAGE_LABELS[stage]}, company room`}>
    <svg className="room-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" aria-hidden="false">
      <g className="back-wall"><rect width="1600" height="900" fill="#ede6da"/><path d="M0 735H1600" stroke="#938b80" strokeWidth="7"/><path d="M0 740h1600v160H0z" fill="#b4aa9c"/></g>
      <g className="window" role="img" aria-label={`Window showing quarter ${Math.ceil(state.week / 13)} market weather`}><rect x="75" y="90" width="360" height="270" fill={mood >= 4 ? "#25384a" : mood >= 2 ? "#a5bac3" : "#bcd8de"} stroke="#22201d" strokeWidth="10"/><circle cx={135 + state.day * 42} cy={mood >= 3 ? 305 : 155 + state.day * 16} r="48" fill="#f2b857" opacity={mood >= 4 ? .15 : .85}/><path d="M255 90v270M75 225h360" stroke="#ede6da" strokeWidth="8"/>{mood >= 3 && <path d="M100 120l-20 55M180 110l-20 55M330 120l-20 55M410 110l-20 55" stroke="#d7e6e7" strokeWidth="5"/>}</g>
      <g className="wall-props"><text x="500" y="105" className="stage-label">{STAGE_LABELS[stage]}</text><g role="img" aria-label={`Wall calendar, week ${state.week}`}><rect x="690" y="70" width="160" height="130" rx="5" fill="#f5f1e9" stroke="#22201d" strokeWidth="6"/><rect x="690" y="70" width="160" height="32" fill="#e1523d"/><text x="770" y="155" textAnchor="middle" className="calendar-week">W{state.week}</text></g></g>
      <g className="floor"><path d="M0 740h1600" stroke="#22201d" strokeWidth="6"/><path d="M0 900L420 740M350 900L650 740M760 900L900 740M1200 900L1130 740M1570 900L1380 740" stroke="#9a9184" strokeWidth="3" opacity=".45"/></g>
      <AnimatePresence mode="wait"><motion.g key={stage} initial={{ opacity: 0, y: 45 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .9 }}><Stage stage={stage}/></motion.g></AnimatePresence>
      <g className="people-layer">{people.slice(0, seats.length).map((person, index) => <Person key={person.id} person={person} x={seats[index].x} y={seats[index].y} onHover={() => setHovered(person)} onLeave={() => setHovered(null)}/>)}</g>
      <g className="foreground-props">
        <LaptopObject pulse={metricPulse} onClick={() => onOpen("metrics")}/><NotebookObject badge={unread} onClick={() => onOpen("notebook")}/><PhoneObject badge={state.pendingEvents.length} onClick={() => onOpen("inbox")}/><WhiteboardObject count={state.shippedFeatures.length} onClick={() => onOpen("roadmap")}/><DoorObject knock={state.decisionLog.some((d) => d.type === "candidate-interviewed")} onClick={() => onOpen("team")}/><FilingObject glow={state.conviction >= 55} onClick={() => onOpen("capital")}/>
        <g role="img" aria-label={`${state.focus} Focus remaining`} transform="translate(610 588)"><path d="M-35 -35h60v65h-60z" fill="#e7dfd2" stroke="#22201d" strokeWidth="5"/><path d={`M-29 ${24 - state.focus * 5}h48v${state.focus * 5}h-48z`} fill="#6a4436" opacity=".85"/><path d="M25 -22q35 0 27 28q-5 20-27 12" fill="none" stroke="#22201d" strokeWidth="6"/></g>
        <g className={mood >= 4 ? "lamp-flicker" : ""} role="img" aria-label={`Desk lamp. Runway ${Number.isFinite(runway) ? Math.floor(runway) : "infinite"} weeks`} transform="translate(955 560)"><path d="M0 25v-95l55-45" stroke="#4a5259" strokeWidth="12"/><path d="M25 -145h80l-15 55H40z" fill="#f2b857" stroke="#22201d" strokeWidth="6"/><ellipse cx="65" cy="-70" rx="105" ry="45" fill="#f2b857" opacity={mood >= 5 ? .15 : mood >= 4 ? .28 : .18}/></g>
      </g>
      <g className="lighting-overlay"><rect width="1600" height="900" fill={mood >= 4 ? "#07121e" : "#394d58"} opacity={[0,.05,.1,.18,.42,.58][mood]}/><rect width="1600" height="900" fill="url(#none)" opacity="0"/></g>
    </svg>
    {hovered && <aside className="person-card" onMouseEnter={() => setHovered(hovered)} onMouseLeave={() => setHovered(null)}><span>{hovered.role} · week {Math.max(1, state.week - hovered.hiredWeek + 1)}</span><strong>{hovered.name}</strong><p>{selectMoralePhrase(hovered)}. {hovered.quirk}</p>{hovered.name !== "You" && <button onClick={() => queueAction("oneOnOne", hovered.id)} disabled={state.focus < 1}>Run a 1:1 · 1 Focus</button>}</aside>}
    <ul className="sr-only"><li><button onClick={() => onOpen("metrics")}>Open metrics</button></li><li><button onClick={() => onOpen("notebook")}>Open notebook</button></li><li><button onClick={() => onOpen("inbox")}>Open inbox</button></li><li><button onClick={() => onOpen("roadmap")}>Open roadmap</button></li><li><button onClick={() => onOpen("team")}>Open team</button></li><li><button onClick={() => onOpen("capital")}>Open capital</button></li></ul>
  </section>;
}
