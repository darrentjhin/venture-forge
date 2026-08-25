"use client";

import { useMemo, useState } from "react";
import { OFFICE_CONFIG } from "@/lib/game/config";
import type { Employee, GameState, GameView } from "@/lib/game/types";

const POSITIONS = [
  [27, 31], [42, 29], [59, 35], [67, 53], [46, 58], [29, 61], [76, 28], [58, 70], [20, 48], [77, 68], [37, 72], [52, 45],
];

function Person({ employee, index, morale, onSelect }: { employee: Employee; index: number; morale: number; onSelect: () => void }) {
  const [x, y] = POSITIONS[index % POSITIONS.length];
  const style = {
    "--person-x": `${x}%`,
    "--person-y": `${y}%`,
    "--person-color": employee.color,
    "--person-delay": `${index * -1.7}s`,
  } as React.CSSProperties;

  return (
    <button className={`office-person ${morale < 45 ? "is-tired" : ""}`} style={style} onClick={onSelect} aria-label={`Inspect ${employee.name}`}>
      <span className="person-shadow" />
      <span className="person-head" />
      <span className="person-body" />
      <span className="person-label">{employee.name.split(" ")[0]}</span>
    </button>
  );
}

export function OfficeScene({ state, onSelect, immersive = false, onNavigate }: { state: GameState; onSelect: (employee: Employee | null) => void; immersive?: boolean; onNavigate?: (view: GameView) => void }) {
  const [rotation, setRotation] = useState(-45);
  const [zoom, setZoom] = useState(1);
  const capacity = OFFICE_CONFIG[state.office].capacity;
  const displayPeople = useMemo(() => {
    const founder: Employee = { id: "founder", name: state.founderName, role: "Founder & CEO", skills: { engineering: state.background === "Engineering" ? 88 : 52, product: 72, design: state.background === "Design" ? 88 : 44, sales: state.background === "Sales" ? 88 : 42, marketing: 48, customerSuccess: 46, operations: state.background === "Business" ? 86 : 48, leadership: 64 }, morale: state.morale, workload: 100 - state.founderCapacity, weeklySalary: 0, color: "#e7ff6b", activity: state.founderCapacity < 25 ? "Late work" : state.companyFormed ? "Working" : "Working", location: "Desk", destination: null, department: "Founder" };
    return [founder, ...state.employees];
  }, [state.background, state.employees, state.founderCapacity, state.founderName, state.morale, state.companyFormed]);

  return (
    <section className={`office-card ${immersive ? "immersive-office" : ""}`}>
      {!immersive && <div className="office-toolbar">
        <div>
          <span className="eyebrow live-dot">LIVE COMPANY</span>
          <h2>{state.office === "Apartment" ? `${state.founderName.split(" ")[0]}'s apartment` : OFFICE_CONFIG[state.office].label}</h2>
        </div>
        <div className="view-controls" aria-label="Office view controls">
          <button onClick={() => setRotation((value) => value - 15)} aria-label="Rotate left">↶</button>
          <button onClick={() => setRotation((value) => value + 15)} aria-label="Rotate right">↷</button>
          <button onClick={() => setZoom((value) => Math.max(.72, value - .12))} aria-label="Zoom out">−</button>
          <button onClick={() => setZoom((value) => Math.min(1.32, value + .12))} aria-label="Zoom in">+</button>
        </div>
      </div>}

      <div className={`office-viewport office-${state.office.toLowerCase()}`}>
        <div className="office-world" style={{ transform: `scale(${zoom}) rotateX(58deg) rotateZ(${rotation}deg)` }}>
          <div className="office-floor">
            <div className="floor-grid" />
            <div className="wall wall-north"><span className="window w1" /><span className="window w2" /></div>
            <div className="wall wall-west"><span className="poster">MAKE<br />IT USEFUL.</span></div>
            <div className="rug" />
            {Array.from({ length: Math.min(capacity, 8) }).map((_, index) => (
              <div className={`desk desk-${index + 1} ${index >= displayPeople.length ? "empty" : ""}`} key={index}>
                <span className="screen"><i /></span><span className="chair" />
              </div>
            ))}
            <div className="sofa"><span /><span /></div>
            <div className="plant"><i /><b /></div>
            <div className="coffee-bar"><span>COFFEE</span></div>
            {state.office === "Studio" && <div className="meeting-room"><span>WEEK {state.week} PLAN</span><i /><i /><i /></div>}
            {displayPeople.map((employee, index) => <Person key={employee.id} employee={employee} index={index} morale={state.morale} onSelect={() => onSelect(employee)} />)}
            {state.officeState.visitorType && <div className="office-visitor"><i /><span>{state.officeState.visitorType}</span></div>}
          </div>
        </div>
        <div className="office-status">
          <span>{displayPeople.length} people here</span>
          <span>{state.morale >= 70 ? "Focused energy" : state.morale >= 45 ? "Team feels stretched" : "Burnout risk"}</span>
          <span>{displayPeople.length}/{capacity} seats</span>
        </div>
        {immersive && onNavigate && <div className="world-hotspots" aria-label="Office stations">
          <button className="hotspot hotspot-desk" onClick={() => onNavigate(state.companyFormed ? "product" : "overview")}><i>01</i><strong>{state.companyFormed ? "Build product" : "Founder desk"}</strong><span>{state.companyFormed ? `${state.productProgress}% complete` : "Hustle & research"}</span></button>
          {state.companyFormed && <button className="hotspot hotspot-board" onClick={() => onNavigate("growth")}><i>02</i><strong>Sales room</strong><span>{state.opportunities.filter((opportunity) => !["Won", "Lost"].includes(opportunity.stage)).length} active deals</span></button>}
          {state.companyFormed && <button className="hotspot hotspot-team" onClick={() => onNavigate("team")}><i>03</i><strong>Team</strong><span>{state.employees.length + 1} people</span></button>}
          {state.companyFormed && <button className="hotspot hotspot-finance" onClick={() => onNavigate("finance")}><i>04</i><strong>Finance</strong><span>Open the books</span></button>}
          <button className="hotspot hotspot-history" onClick={() => onNavigate("history")}><i>{state.companyFormed ? "05" : "02"}</i><strong>Journal</strong><span>{state.history.length} moments saved</span></button>
        </div>}
      </div>
    </section>
  );
}
