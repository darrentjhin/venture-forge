import { useMemo, useState } from "react";
import { playSfx } from "../../audio/sfx";
import { alignmentFor } from "../../engine/beliefs";
import { selectBurn, selectRunwayDisplay, selectWeeklyRevenue } from "../../engine/selectors";
import { skillValue } from "../../engine/tasks";
import type { GameState, PhoneAppId, Skill } from "../../engine/types";
import { useGame } from "../../store/useGame";
import { Sparkline } from "../Sparkline";

const APPS: Record<PhoneAppId, { label: string; icon: string }> = {
  tasks: { label: "Tasks", icon: "✓" }, inbox: { label: "Inbox", icon: "✉" }, team: { label: "Team", icon: "●" }, bank: { label: "Bank", icon: "$" }, stats: { label: "Stats", icon: "↗" },
};
const SKILLS: Skill[] = ["engineering", "design", "sales", "support", "ops", "research"];

function TasksApp({ game }: { game: GameState }) {
  const assign = useGame((store) => store.assignTask);
  const unassign = useGame((store) => store.unassignTask);
  const [selected, setSelected] = useState<string | null>(game.people[0]?.id ?? null);
  const load = useMemo(() => Object.fromEntries(game.people.map((person) => [person.id, game.tasks.filter((task) => task.assigned.includes(person.id)).length])), [game.people, game.tasks]);
  return <>
    <div className="phone-people" aria-label="People available for work">
      {game.people.map((person) => <button key={person.id} draggable className={selected === person.id ? "selected" : ""}
        onDragStart={(event) => event.dataTransfer.setData("text/person", person.id)} onClick={() => setSelected(person.id)}>
        <b>{person.name}</b><span>{person.role} · {load[person.id] ?? 0} task{(load[person.id] ?? 0) === 1 ? "" : "s"}</span>
      </button>)}
    </div>
    <p className="phone-hint">Pick a person, then pick a task. Dragging works too. More than one task splits their week and loses 15% to switching.</p>
    <div className="task-list">
      {game.tasks.map((task) => {
        const progress = Math.round(task.progress / task.effort * 100);
        return <article className="task-card" key={task.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const personId = event.dataTransfer.getData("text/person"); if (personId) assign(task.id, personId); }}>
          <div className="task-head"><span className={`skill-dot skill-${task.skill}`}/><div><strong>{task.title}</strong><small>{task.skill} · {task.source}</small></div><b>{progress}%</b></div>
          <p>{task.detail}</p>
          <div className="task-progress"><i style={{ width: `${progress}%` }}/></div>
          <div className="task-assigned">
            {task.assigned.map((id) => { const person = game.people.find((item) => item.id === id); return person ? <button key={id} onClick={() => unassign(task.id, id)} title={`Remove ${person.name}`}>{person.name} ×</button> : null; })}
            {task.assigned.length < 3 && selected && !task.assigned.includes(selected) && <button className="assign-person" onClick={() => assign(task.id, selected)}>+ assign {game.people.find((person) => person.id === selected)?.name}</button>}
          </div>
          {task.assigned.some((id) => (load[id] ?? 0) > 1) && <em>Output is split · 15% switching loss</em>}
        </article>;
      })}
    </div>
  </>;
}

function InboxApp({ game }: { game: GameState }) {
  const resolve = useGame((store) => store.resolveEvent);
  return <div className="phone-messages">
    {game.pendingEvents.length === 0 && <div className="empty"><strong>No replies needed.</strong><p>Messages arrive from people affected by your decisions.</p></div>}
    {game.pendingEvents.map((event) => <article key={event.id} className="phone-message unread">
      <header><span className="phone-avatar">{event.sender.charAt(0)}</span><div><strong>{event.sender}</strong><small>Now · {event.cause}</small></div></header>
      <h3>{event.headline}</h3><p>{event.body}</p>
      <div className="event-choices">{event.choices.map((choice) => <button className="event-choice" key={choice.id} disabled={game.cash < choice.cashCost} onClick={() => resolve(event.id, choice.id)}><strong>{choice.label}</strong><span>{choice.detail}</span></button>)}</div>
    </article>)}
    {[...game.eventHistory].reverse().slice(0, 12).map((event) => <article key={event.id} className="phone-message"><header><span className="phone-avatar">{event.sender.charAt(0)}</span><div><strong>{event.sender}</strong><small>Resolved</small></div></header><p>{event.headline}</p></article>)}
  </div>;
}

function TeamApp({ game }: { game: GameState }) {
  return <div>{game.people.map((person) => {
    const workload = game.workloads[person.id] ?? { burnout: 0, overworkWeeks: 0 };
    const best = [...SKILLS].sort((a, b) => skillValue(person, b) - skillValue(person, a)).slice(0, 3);
    return <article className="phone-team" key={person.id}>
      <span className="phone-avatar">{person.name.charAt(0)}</span><div><strong>{person.name}{person.isCofounder ? " · cofounder" : ""}</strong><small>{person.role} · ${person.salaryWeekly.toLocaleString()}/week</small><p>{best.map((skill) => `${skill} ${Math.round(skillValue(person, skill))}`).join(" · ")}</p><div className="task-progress"><i style={{ width: `${person.morale}%` }}/></div>{workload.burnout > 0 && <em>Burnout {workload.burnout}% · {workload.overworkWeeks} overloaded weeks</em>}</div>
    </article>;
  })}</div>;
}

function BankApp({ game }: { game: GameState }) {
  const burn = selectBurn(game);
  return <div className="phone-ledger"><div><span>Cash</span><strong>${Math.round(game.cash).toLocaleString()}</strong></div><div><span>Money in / week</span><strong>${Math.round(selectWeeklyRevenue(game)).toLocaleString()}</strong></div><div><span>Payroll and bills</span><strong>−${Math.round(burn).toLocaleString()}</strong></div><div><span>Runway</span><strong>{selectRunwayDisplay(game)}</strong></div>{game.emergencyLoanBalance > 0 && <div className="bad"><span>Emergency loan</span><strong>${game.emergencyLoanBalance.toLocaleString()} · 18% weekly</strong></div>}</div>;
}

function StatsApp({ game }: { game: GameState }) {
  const fit = Math.round(alignmentFor(game.beliefs, game.truth) * 100);
  return <><div className="phone-ledger"><div><span>Fit</span><strong>{fit}/100</strong></div><div><span>Customers</span><strong>{game.customers.length}</strong></div><div><span>Monthly revenue</span><strong>${Math.round(game.mrr).toLocaleString()}</strong></div></div>{game.history.length > 1 && <><small className="eyebrow">Revenue</small><Sparkline points={game.history.slice(-30).map((point) => point.mrr)} label="Monthly revenue"/><small className="eyebrow">Cash</small><Sparkline points={game.history.slice(-30).map((point) => point.cash)} variant="cash" label="Cash"/></>}</>;
}

export function Phone({ game }: { game: GameState }) {
  const muted = useGame((store) => store.muted);
  const [app, setApp] = useState<PhoneAppId | "home">("tasks");
  const badges: Partial<Record<PhoneAppId, number>> = { tasks: game.tasks.length, inbox: game.pendingEvents.length, team: Object.values(game.workloads).filter((item) => item.burnout >= 40).length };
  const open = (id: PhoneAppId | "home") => { playSfx("click", muted); setApp(id); };
  return <div className="phone-shell">
    <header className="phone-top"><button onClick={() => open("home")} aria-label="Phone home">‹</button><strong>{app === "home" ? "Phone" : APPS[app].label}</strong><span>{game.tasks.length} open</span></header>
    {app === "home" ? <div className="phone-grid">{game.unlockedApps.map((id) => <button key={id} onClick={() => open(id)}><span>{APPS[id].icon}</span><strong>{APPS[id].label}</strong>{Boolean(badges[id]) && <b>{badges[id]}</b>}</button>)}</div> : <div className="phone-app">{app === "tasks" && <TasksApp game={game}/>} {app === "inbox" && <InboxApp game={game}/>} {app === "team" && <TeamApp game={game}/>} {app === "bank" && <BankApp game={game}/>} {app === "stats" && <StatsApp game={game}/>}</div>}
  </div>;
}
