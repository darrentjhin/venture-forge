"use client";

import { useMemo, useState } from "react";
import { OFFICE_CONFIG } from "@/lib/game/config";
import type { Employee, GameState } from "@/lib/game/types";

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

export function OfficeScene({ state, onSelect }: { state: GameState; onSelect: (employee: Employee | null) => void }) {
  const [rotation, setRotation] = useState(-45);
  const [zoom, setZoom] = useState(1);
  const capacity = OFFICE_CONFIG[state.office].capacity;
  const displayPeople = useMemo(() => {
    const founder: Employee = { id: "founder", name: state.founderName, role: "Founder & CEO", skill: 84, morale: state.morale, weeklySalary: 0, color: "#e7ff6b" };
    return [founder, ...state.employees];
  }, [state.employees, state.founderName, state.morale]);

  return (
    <section className="office-card">
      <div className="office-toolbar">
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
      </div>

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
          </div>
        </div>
        <div className="office-status">
          <span>{displayPeople.length} people here</span>
          <span>{state.morale >= 70 ? "Focused energy" : state.morale >= 45 ? "Team feels stretched" : "Burnout risk"}</span>
          <span>{displayPeople.length}/{capacity} seats</span>
        </div>
      </div>
    </section>
  );
}
