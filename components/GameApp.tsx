"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CANDIDATES, HUSTLES, IDEA, OFFICE_CONFIG, OFFICE_UPGRADES } from "@/lib/game/config";
import { calculateRunway, history, processWeek } from "@/lib/game/engine";
import { createGame } from "@/lib/game/seed";
import type { Background, Employee, GameState, GameView, WeekResult } from "@/lib/game/types";
import { OfficeScene } from "./OfficeScene";
import { Onboarding } from "./Onboarding";

const SAVE_KEY = "venture-forge-save-v1";
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const compact = (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

function Metric({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: "good" | "bad" }) {
  return <article className="metric-card"><span>{label}</span><strong className={tone ? `tone-${tone}` : ""}>{value}</strong>{detail && <small>{detail}</small>}</article>;
}

function ProgressBar({ value, label }: { value: number; label?: string }) {
  return <div className="progress-wrap"><div className="progress-track"><span style={{ width: `${Math.min(100, value)}%` }} /></div>{label && <small>{label}</small>}</div>;
}

function WeekChart({ state }: { state: GameState }) {
  const values = state.snapshots.length ? state.snapshots.slice(-10) : [{ week: state.week, cash: state.companyCash, revenue: 0, expenses: 0, customers: 0 }];
  const max = Math.max(1, ...values.flatMap((item) => [Math.max(0, item.revenue), item.expenses]));
  return (
    <div className="chart">
      <div className="chart-head"><div><span className="eyebrow">OPERATING PULSE</span><h3>Revenue vs. expenses</h3></div><div className="legend"><span className="rev">Revenue</span><span className="exp">Expenses</span></div></div>
      <div className="bars">
        {values.map((item) => <div className="bar-group" key={item.week}><div className="bar rev-bar" style={{ height: `${Math.max(3, item.revenue / max * 100)}%` }} /><div className="bar exp-bar" style={{ height: `${Math.max(3, item.expenses / max * 100)}%` }} /><span>W{item.week}</span></div>)}
      </div>
    </div>
  );
}

function FounderPhase({ state, setState, advance }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState | null>>; advance: () => void }) {
  const doHustle = (hustle: typeof HUSTLES[number]) => {
    if (state.founderEnergy < hustle.energy) return;
    setState((current) => current && ({ ...current, personalCash: current.personalCash + hustle.pay, founderEnergy: current.founderEnergy - hustle.energy, network: current.network + (hustle.skill === "network" ? 3 : 1), ledger: [{ id: `hustle-${Date.now()}`, week: current.week, label: hustle.name, amount: hustle.pay, account: "Personal" }, ...current.ledger], history: [history(current, "Founder", hustle.name, `Earned ${money(hustle.pay)} and learned what small businesses struggle with.`), ...current.history] }));
  };
  const research = () => {
    if (state.personalCash < 250 || state.founderEnergy < 18) return;
    setState((current) => current && ({ ...current, personalCash: current.personalCash - 250, founderEnergy: current.founderEnergy - 18, ideaResearch: Math.min(100, current.ideaResearch + 25), network: current.network + 2, ledger: [{ id: `research-${Date.now()}`, week: current.week, label: "Customer research", amount: -250, account: "Personal" }, ...current.ledger], history: [history(current, "Founder", "Customer interviews", "Spoke with agency owners and sharpened the opportunity thesis."), ...current.history] }));
  };
  const form = () => {
    if (state.personalCash < 1800 || state.ideaResearch < 50) return;
    const contribution = state.personalCash - 650;
    setState((current) => current && ({ ...current, companyFormed: true, companyName: "Northstar Systems, Inc.", personalCash: 650, companyCash: contribution - 400, ledger: [{ id: `formation-${Date.now()}`, week: current.week, label: "Formation & license fees", amount: -400, account: "Company" }, { id: `capital-${Date.now()}`, week: current.week, label: "Founder contribution", amount: contribution, account: "Company" }, ...current.ledger], history: [history(current, "Milestone", "Northstar Systems, Inc. formed", `A Delaware corporation opened with ${money(contribution - 400)} in its operating account.`), ...current.history] }));
  };

  return (
    <div className="founder-phase">
      <div className="phase-hero">
        <div><span className="eyebrow">CURRENT CHAPTER / STARTING FROM ZERO</span><h1>Earn the right<br />to start.</h1><p>Before there&apos;s a company, there&apos;s just your time, judgment, and dwindling personal cash.</p></div>
        <div className="goal-card"><span>CURRENT GOAL</span><strong>{state.ideaResearch < 50 ? "Validate a business idea" : "Form your company"}</strong><ProgressBar value={state.ideaResearch < 50 ? state.ideaResearch * 2 : Math.min(100, state.personalCash / 18)} label={state.ideaResearch < 50 ? `${state.ideaResearch}% research confidence` : `${money(state.personalCash)} / $1,800`} /></div>
      </div>
      <div className="metrics-row"><Metric label="Personal cash" value={money(state.personalCash)} detail="Keep $650 in reserve" /><Metric label="Founder energy" value={`${state.founderEnergy}%`} detail="Recovers each week" tone={state.founderEnergy < 30 ? "bad" : undefined} /><Metric label="Network" value={`${state.network} contacts`} detail="Small, but growing" /><Metric label="Reputation" value={`${state.reputation}/100`} detail="Unknown founder" /></div>
      <div className="two-column founder-workspace">
        <section className="panel"><div className="section-head"><div><span className="eyebrow">01 / CASHFLOW</span><h2>Founder hustles</h2></div><span className="capacity-pill">{state.founderEnergy} energy</span></div><p className="muted">Trade limited attention for cash and relationships. Hustles become inefficient once your company has momentum.</p><div className="action-list">{HUSTLES.map((hustle) => <article className="action-row" key={hustle.name}><div><strong>{hustle.name}</strong><span>{hustle.detail}</span><small>−{hustle.energy} energy · +{hustle.skill}</small></div><button disabled={state.founderEnergy < hustle.energy} onClick={() => doHustle(hustle)}>Earn {money(hustle.pay)}</button></article>)}</div></section>
        <section className="panel idea-panel"><div className="section-head"><div><span className="eyebrow">02 / OPPORTUNITY</span><h2>{IDEA.name}</h2></div><span className="idea-score">{state.ideaResearch}% known</span></div><p>{IDEA.description}</p><dl className="idea-facts"><div><dt>Customer</dt><dd>{state.ideaResearch >= 25 ? IDEA.customer : "Research needed"}</dd></div><div><dt>Business model</dt><dd>{state.ideaResearch >= 25 ? IDEA.model : "Research needed"}</dd></div><div><dt>Market</dt><dd>{state.ideaResearch >= 50 ? IDEA.market : "Uncertain"}</dd></div><div><dt>Expected margin</dt><dd>{state.ideaResearch >= 75 ? IDEA.margin : "Uncertain"}</dd></div></dl><ProgressBar value={state.ideaResearch} /><button className="secondary-button wide" disabled={state.personalCash < 250 || state.founderEnergy < 18 || state.ideaResearch >= 100} onClick={research}>Interview 5 customers · $250</button>{state.ideaResearch >= 50 && <button className="primary-button wide" disabled={state.personalCash < 1800} onClick={form}>Form Northstar Systems · $400 <span>→</span></button>}</section>
      </div>
    </div>
  );
}

function CompanyOverview({ state, setView }: { state: GameState; setView: (view: GameView) => void }) {
  const last = state.snapshots.at(-1);
  const lastNet = last ? last.revenue - last.expenses : -190;
  const runway = calculateRunway(state);
  const payroll = state.employees.reduce((sum, employee) => sum + employee.weeklySalary, 0);
  const weeklyRevenue = state.customers * state.price;
  const valuation = Math.max(32_000, weeklyRevenue * 52 * 4.2 + state.productQuality * 700);
  return (
    <>
      <section className="dashboard-hero"><div><span className="eyebrow">WEEK {state.week} / {state.office.toUpperCase()}</span><h1>{state.productLaunched ? "Find repeatable momentum." : "Build what the market needs."}</h1><p>{state.productLaunched ? `${state.customers} customers now rely on ${state.ideaName}. The next constraint is ${state.employees.length < 2 ? "team capacity" : "efficient growth"}.` : `Your MVP is ${state.productProgress}% complete. Every week of building costs runway.`}</p></div><div className="runway-card"><span>RUNWAY</span><strong>{runway === Infinity ? "∞" : `${runway.toFixed(1)} mo`}</strong><small>{runway < 3 ? "Critical—reduce burn or grow revenue" : `${money(Math.max(0, payroll + OFFICE_CONFIG[state.office].weeklyCost - weeklyRevenue))} weekly net burn`}</small></div></section>
      <div className="metrics-row"><Metric label="Company cash" value={money(state.companyCash)} detail={last ? `${last.cash >= 0 ? "Operating account" : "Overdrawn"}` : "Operating account"} tone={state.companyCash < 2500 ? "bad" : undefined} /><Metric label="Weekly revenue" value={money(weeklyRevenue)} detail={`${state.customers} active customers`} tone={weeklyRevenue > 0 ? "good" : undefined} /><Metric label="Weekly profit" value={money(lastNet)} detail={lastNet >= 0 ? "Cash-flow positive" : "Investing ahead"} tone={lastNet >= 0 ? "good" : "bad"} /><Metric label="Est. valuation" value={money(valuation)} detail="4.2× run-rate + product" /></div>
      <div className="dashboard-grid">
        <WeekChart state={state} />
        <section className="panel focus-panel"><div className="section-head"><div><span className="eyebrow">FOUNDER FOCUS</span><h3>What needs you now</h3></div></div>{!state.productLaunched ? <><div className="focus-progress"><strong>MVP development</strong><span>{state.productProgress}%</span></div><ProgressBar value={state.productProgress} /><p>At current capacity, launch is roughly {Math.max(1, Math.ceil((100 - state.productProgress) / (5 + state.employees.length * 2)))} weeks away.</p><button className="secondary-button wide" onClick={() => setView("product")}>Open product room →</button></> : state.customers < 10 ? <><div className="focus-progress"><strong>First repeatable segment</strong><span>{state.customers}/10</span></div><ProgressBar value={state.customers * 10} /><p>Customer interviews point to boutique agencies. Add leads, then advance the week.</p><button className="secondary-button wide" onClick={() => setView("growth")}>Build pipeline →</button></> : <><div className="focus-progress"><strong>Operating leverage</strong><span>{Math.round((weeklyRevenue / Math.max(1, payroll + 190)) * 100)}%</span></div><ProgressBar value={(weeklyRevenue / Math.max(1, payroll + 190)) * 100} /><p>Revenue is catching up to the cost base. Protect quality as the team grows.</p><button className="secondary-button wide" onClick={() => setView("finance")}>Review burn →</button></>}</section>
        <section className="panel signal-panel"><div className="section-head"><div><span className="eyebrow">LIVE SIGNALS</span><h3>Inside Northstar</h3></div><button className="text-button" onClick={() => setView("office")}>View office →</button></div><div className="signal-list"><span><i className={state.morale >= 60 ? "green" : "orange"} /> Team morale is {state.morale >= 70 ? "strong" : state.morale >= 45 ? "under pressure" : "critical"}</span><span><i className={state.productProgress >= 100 ? "green" : "blue"} /> Product quality is {state.productQuality}/100</span><span><i className={state.companyCash < 2500 ? "orange" : "green"} /> {state.companyCash < 2500 ? "Cash requires attention" : "Bank account reconciled"}</span><span><i className="blue" /> Competitor Ledgerly is holding price</span></div></section>
        <section className="panel recent-panel"><div className="section-head"><div><span className="eyebrow">COMPANY MEMORY</span><h3>Recent history</h3></div><button className="text-button" onClick={() => setView("history")}>Full timeline →</button></div>{state.history.slice(0, 3).map((item) => <article className="timeline-mini" key={item.id}><span>W{item.week}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div></article>)}</section>
      </div>
    </>
  );
}

function ProductView({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState | null>> }) {
  const invest = () => setState((current) => current && current.companyCash >= 600 ? ({ ...current, companyCash: current.companyCash - 600, productProgress: Math.min(100, current.productProgress + 14), productQuality: Math.min(100, current.productQuality + 3), ledger: [{ id: `product-${Date.now()}`, week: current.week, label: "Focused product sprint", amount: -600, account: "Company" }, ...current.ledger] }) : current);
  const launch = () => setState((current) => current && current.productProgress >= 100 ? ({ ...current, productLaunched: true, history: [history(current, "Product", `${current.ideaName} launched`, `The first paid version launched at ${money(current.price)} per week.`), ...current.history] }) : current);
  return <div className="content-view"><header className="page-title"><span className="eyebrow">PRODUCT / {state.ideaName.toUpperCase()}</span><h1>Ship the smallest thing<br />customers will keep.</h1><p>Progress, quality, and runway pull in different directions. Decide what “ready” means.</p></header><div className="product-grid"><section className="panel product-score"><span className="score-ring" style={{ "--score": `${state.productProgress * 3.6}deg` } as React.CSSProperties}><b>{state.productProgress}%</b><small>BUILD</small></span><div><h2>{state.productLaunched ? "Live in market" : state.productProgress >= 100 ? "Ready to launch" : "MVP in development"}</h2><p>{state.productLaunched ? `${state.customers} customers are generating live feedback.` : "A client operations workspace with projects, approvals, and a calm weekly pulse."}</p></div></section><section className="panel"><span className="eyebrow">PRODUCT HEALTH</span><div className="health-row"><span>Experience quality</span><strong>{state.productQuality}/100</strong></div><ProgressBar value={state.productQuality} /><div className="health-row"><span>Technical confidence</span><strong>{Math.min(100, state.productProgress + state.employees.filter((e) => e.role.includes("Engineer")).length * 8)}/100</strong></div><ProgressBar value={Math.min(100, state.productProgress + state.employees.filter((e) => e.role.includes("Engineer")).length * 8)} /></section></div><section className="panel decision-panel"><div><span className="eyebrow">THIS WEEK&apos;S DECISION</span><h2>{state.productLaunched ? "Improve retention" : "Accelerate the build"}</h2><p>A focused sprint costs $600 today and adds 14% build progress plus 3 quality points.</p></div><div className="impact-box"><span>Cash after</span><strong>{money(state.companyCash - 600)}</strong><span>Runway after</span><strong>{calculateRunway({ ...state, companyCash: state.companyCash - 600 }).toFixed(1)} mo</strong></div><button className="primary-button" disabled={state.companyCash < 600 || state.productLaunched} onClick={invest}>{state.productLaunched ? "MVP shipped" : "Fund sprint · $600"}</button></section>{!state.productLaunched && <button className="launch-button" disabled={state.productProgress < 100} onClick={launch}><span>{state.productProgress < 100 ? `Launch locked · ${100 - state.productProgress}% remaining` : `Launch ${state.ideaName}`}</span><b>→</b></button>}</div>;
}

function GrowthView({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState | null>> }) {
  const outreach = () => setState((current) => current && current.productLaunched && current.founderEnergy >= 16 ? ({ ...current, founderEnergy: current.founderEnergy - 16, salesPipeline: current.salesPipeline + 9 + (current.background === "Sales" ? 3 : 0) }) : current);
  const campaign = () => setState((current) => current && current.productLaunched && current.companyCash >= 900 ? ({ ...current, companyCash: current.companyCash - 900, marketing: current.marketing + 16, ledger: [{ id: `campaign-${Date.now()}`, week: current.week, label: "Founder story campaign", amount: -900, account: "Company" }, ...current.ledger] }) : current);
  return <div className="content-view"><header className="page-title"><span className="eyebrow">GROWTH / GO TO MARKET</span><h1>Earn attention.<br />Convert it carefully.</h1><p>Pipeline is potential—not revenue. Pricing and product quality determine what converts.</p></header><div className="metrics-row"><Metric label="Active customers" value={`${state.customers}`} detail={`${state.salesPipeline} leads in pipeline`} /><Metric label="Weekly MRR" value={money(state.customers * state.price)} detail={`At ${money(state.price)} / customer`} /><Metric label="Marketing signal" value={`${state.marketing}/100`} detail="Decays each week" /><Metric label="Product quality" value={`${state.productQuality}/100`} detail="Reduces churn" /></div><div className="two-column"><section className="panel"><span className="eyebrow">PRICING</span><h2>One clear plan</h2><p className="muted">A lower price converts more easily; a higher price creates more revenue per customer but raises expectations.</p><div className="price-options">{[99,149,219].map((price) => <button className={state.price === price ? "price-option active" : "price-option"} key={price} onClick={() => setState((current) => current && ({ ...current, price }))}><strong>{money(price)}</strong><span>/ week</span><small>{price === 99 ? "Easier conversion" : price === 149 ? "Balanced" : "Premium proof needed"}</small></button>)}</div></section><section className="panel"><span className="eyebrow">ACQUISITION</span><h2>Build this week&apos;s pipeline</h2><div className="action-list"><article className="action-row"><div><strong>Founder-led outreach</strong><span>Talk directly to agency operators.</span><small>−16 energy · +9–12 leads</small></div><button onClick={outreach} disabled={!state.productLaunched || state.founderEnergy < 16}>Start</button></article><article className="action-row"><div><strong>Founder story campaign</strong><span>Share the build with a narrow audience.</span><small>−$900 cash · +16 reach</small></div><button onClick={campaign} disabled={!state.productLaunched || state.companyCash < 900}>Fund</button></article></div>{!state.productLaunched && <div className="locked-note">Launch the MVP before acquiring customers.</div>}</section></div></div>;
}

function TeamView({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState | null>> }) {
  const hire = (candidate: Employee) => {
    if (state.companyCash < candidate.weeklySalary * 1.4 || state.employees.some((item) => item.id === candidate.id) || state.employees.length + 1 >= OFFICE_CONFIG[state.office].capacity) return;
    const signing = Math.round(candidate.weeklySalary * .4);
    setState((current) => current && ({ ...current, companyCash: current.companyCash - signing, employees: [...current.employees, candidate], ledger: [{ id: `hire-${candidate.id}`, week: current.week, label: `${candidate.name} signing cost`, amount: -signing, account: "Company" }, ...current.ledger], history: [history(current, "Team", `${candidate.name} joined`, `${candidate.name} became Northstar's ${candidate.role}.`), ...current.history] }));
  };
  const move = (tier: "Coworking" | "Studio") => {
    const config = OFFICE_UPGRADES[tier];
    if (state.companyCash < config.deposit || state.employees.length + 1 < config.minTeam) return;
    setState((current) => current && ({ ...current, office: tier, companyCash: current.companyCash - config.deposit, ledger: [{ id: `office-${Date.now()}`, week: current.week, label: `${tier} deposit`, amount: -config.deposit, account: "Company" }, ...current.ledger], history: [history(current, "Milestone", `Moved into ${OFFICE_CONFIG[tier].label}`, `The company gained room for ${OFFICE_CONFIG[tier].capacity} people.`), ...current.history] }));
  };
  return <div className="content-view"><header className="page-title"><span className="eyebrow">TEAM / CAPACITY</span><h1>Hire for the constraint,<br />not the org chart.</h1><p>Every person adds output, perspective, payroll, and management load.</p></header><div className="team-layout"><section className="panel"><div className="section-head"><div><span className="eyebrow">YOUR TEAM</span><h2>{state.employees.length + 1} people</h2></div><span className="capacity-pill">{state.employees.length + 1}/{OFFICE_CONFIG[state.office].capacity} seats</span></div><article className="employee-row"><span className="avatar founder-avatar">{state.founderName.charAt(0)}</span><div><strong>{state.founderName}</strong><small>Founder & CEO</small></div><span className="skill-badge">Founder</span></article>{state.employees.map((employee) => <article className="employee-row" key={employee.id}><span className="avatar" style={{ background: employee.color }}>{employee.name.charAt(0)}</span><div><strong>{employee.name}</strong><small>{employee.role}</small></div><span className="skill-badge">{employee.skill} skill</span></article>)}</section><section className="panel"><span className="eyebrow">CANDIDATE MARKET</span><h2>Available this week</h2><div className="candidate-list">{CANDIDATES.filter((candidate) => !state.employees.some((item) => item.id === candidate.id)).slice(0, 3).map((candidate) => <article className="candidate" key={candidate.id}><div><span className="avatar" style={{ background: candidate.color }}>{candidate.name.charAt(0)}</span><div><strong>{candidate.name}</strong><small>{candidate.role} · {candidate.skill} skill</small></div></div><span>{money(candidate.weeklySalary)}/wk</span><button disabled={state.companyCash < candidate.weeklySalary * 1.4 || state.employees.length + 1 >= OFFICE_CONFIG[state.office].capacity} onClick={() => hire(candidate)}>Hire</button></article>)}</div></section></div><section className="panel office-options"><div><span className="eyebrow">OFFICE PROGRESSION</span><h2>Your company needs somewhere to become real.</h2></div>{(["Coworking", "Studio"] as const).map((tier) => <article key={tier} className={state.office === tier ? "office-option current" : "office-option"}><div><strong>{OFFICE_CONFIG[tier].label}</strong><span>{OFFICE_CONFIG[tier].capacity} seats · {money(OFFICE_CONFIG[tier].weeklyCost)}/wk</span><small>Deposit {money(OFFICE_UPGRADES[tier].deposit)} · requires {OFFICE_UPGRADES[tier].minTeam} people</small></div><button disabled={state.office === tier || state.companyCash < OFFICE_UPGRADES[tier].deposit || state.employees.length + 1 < OFFICE_UPGRADES[tier].minTeam} onClick={() => move(tier)}>{state.office === tier ? "Current" : "Move in"}</button></article>)}</section></div>;
}

function FinanceView({ state }: { state: GameState }) {
  const runway = calculateRunway(state);
  const revenue = state.customers * state.price;
  const payroll = state.employees.reduce((sum, employee) => sum + employee.weeklySalary, 0);
  return <div className="content-view"><header className="page-title"><span className="eyebrow">FINANCE / OPERATING ACCOUNT</span><h1>Cash is time<br />made visible.</h1><p>Every decision spends or creates weeks of optionality.</p></header><div className="metrics-row"><Metric label="Cash" value={money(state.companyCash)} /><Metric label="Runway" value={runway === Infinity ? "∞" : `${runway.toFixed(1)} mo`} tone={runway < 3 ? "bad" : undefined} /><Metric label="Gross margin" value={revenue ? `${Math.max(0, Math.round((revenue - state.customers * 5) / revenue * 100))}%` : "—"} /><Metric label="Weekly payroll" value={money(payroll)} /></div><div className="two-column"><WeekChart state={state} /><section className="panel ledger-panel"><span className="eyebrow">GENERAL LEDGER</span><h2>Recent transactions</h2>{state.ledger.filter((item) => item.account === "Company").slice(0, 9).map((item) => <div className="ledger-row" key={item.id}><span>W{item.week}</span><strong>{item.label}</strong><b className={item.amount >= 0 ? "positive" : "negative"}>{item.amount >= 0 ? "+" : ""}{money(item.amount)}</b></div>)}</section></div></div>;
}

function HistoryView({ state }: { state: GameState }) {
  return <div className="content-view history-view"><header className="page-title"><span className="eyebrow">PERMANENT RECORD</span><h1>The company remembers<br />every consequential week.</h1><p>This timeline persists beyond products, offices, and eventually, CEOs.</p></header><div className="history-line">{state.history.map((item, index) => <article key={item.id} className="history-item"><span className="history-marker">{String(state.history.length - index).padStart(2, "0")}</span><div><small>WEEK {item.week} · {item.category.toUpperCase()}</small><h3>{item.title}</h3><p>{item.detail}</p></div></article>)}</div></div>;
}

export default function GameApp() {
  const [state, setState] = useState<GameState | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<GameView>("overview");
  const [summary, setSummary] = useState<WeekResult["summary"] | null>(null);
  const [inspected, setInspected] = useState<Employee | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const local = JSON.parse(raw) as GameState;
        setState(local);
        fetch(`/api/save?id=${encodeURIComponent(local.saveId)}`)
          .then((response) => response.ok ? response.json() as Promise<{ state: GameState }> : null)
          .then((result) => { if (result?.state?.saveId === local.saveId) setState(result.state); })
          .catch(() => undefined);
      }
    } catch { /* start clean */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !state) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    const timer = window.setTimeout(() => {
      fetch("/api/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ saveId: state.saveId, state }) }).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [state, ready]);

  const advance = useCallback(() => {
    setState((current) => {
      if (!current || current.gameOver || current.pendingEvent) return current;
      const result = processWeek(current);
      setSummary(result.summary);
      return result.state;
    });
  }, []);

  const resolveEvent = (choiceIndex: number) => setState((current) => {
    if (!current?.pendingEvent) return current;
    const event = current.pendingEvent;
    const choice = event.choices[choiceIndex];
    return { ...current, companyCash: current.companyCash + choice.cash, morale: Math.max(0, Math.min(100, current.morale + choice.morale)), productQuality: Math.max(0, Math.min(100, current.productQuality + choice.quality)), pendingEvent: null, ledger: choice.cash ? [{ id: `event-${Date.now()}`, week: current.week, label: event.title, amount: choice.cash, account: "Company" }, ...current.ledger] : current.ledger, history: [history(current, choice.morale < -4 ? "Crisis" : "Milestone", event.title, `Decision: ${choice.label}. ${choice.detail}`), ...current.history] };
  });

  const savedName = state?.founderName;
  if (!ready) return <main className="loading-screen"><span>V</span><p>Preparing your founder desk…</p></main>;
  if (!state || !state.loggedIn) return <Onboarding savedName={savedName} onResume={state ? () => setState({ ...state, loggedIn: true }) : undefined} onStart={(data) => { setState(createGame(data)); setView("overview"); }} />;

  const nav: Array<{ id: GameView; label: string; icon: string }> = state.companyFormed ? [
    { id: "overview", label: "Overview", icon: "◫" }, { id: "office", label: "3D Office", icon: "◇" }, { id: "product", label: "Product", icon: "◉" }, { id: "growth", label: "Customers", icon: "↗" }, { id: "team", label: "Team", icon: "♙" }, { id: "finance", label: "Finance", icon: "$" }, { id: "history", label: "History", icon: "≡" },
  ] : [{ id: "overview", label: "Founder HQ", icon: "◫" }, { id: "office", label: "Apartment", icon: "◇" }, { id: "history", label: "History", icon: "≡" }];
  const companyInitial = state.companyFormed ? state.companyName.charAt(0) : state.founderName.charAt(0);

  return (
    <main className="game-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">V</div><span>VENTURE<br />FORGE</span></div>
        <div className="company-switcher"><span className="company-logo">{companyInitial}</span><div><small>{state.companyFormed ? "COMPANY 01" : "FOUNDER"}</small><strong>{state.companyFormed ? state.companyName.replace(", Inc.", "") : state.founderName}</strong></div><b>⌄</b></div>
        <nav>{nav.map((item) => <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label}{item.id === "office" && <i>LIVE</i>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="founder-chip"><span>{state.founderName.charAt(0)}</span><div><strong>{state.founderName}</strong><small>{state.background} founder</small></div></div><button className="logout" onClick={() => setState({ ...state, loggedIn: false })}>Save & exit</button></div>
      </aside>
      <section className="main-stage">
        <header className="topbar"><div><span className="week-pill">WEEK {state.week}</span><span className="date-label">{state.year} · Q{Math.min(4, Math.ceil(state.week / 13))}</span></div><div className="top-actions"><span className="save-state">● SAVED</span>{state.companyFormed && <span className="cash-quick">{money(state.companyCash)}<small>COMPANY CASH</small></span>}<button className="advance-button" disabled={!!state.pendingEvent || state.gameOver} onClick={advance}>Advance week <span>→</span></button></div></header>
        <div className="stage-content">
          {!state.companyFormed && view === "overview" && <FounderPhase state={state} setState={setState} advance={advance} />}
          {state.companyFormed && view === "overview" && <CompanyOverview state={state} setView={setView} />}
          {view === "office" && <div className="content-view office-view"><OfficeScene state={state} onSelect={setInspected} /><div className="office-caption"><span>THE LIVING COMPANY</span><p>The scene reflects your real team size, office capacity, and morale. People move autonomously; you manage the business.</p></div></div>}
          {state.companyFormed && view === "product" && <ProductView state={state} setState={setState} />}
          {state.companyFormed && view === "growth" && <GrowthView state={state} setState={setState} />}
          {state.companyFormed && view === "team" && <TeamView state={state} setState={setState} />}
          {state.companyFormed && view === "finance" && <FinanceView state={state} />}
          {view === "history" && <HistoryView state={state} />}
        </div>
      </section>

      {summary && <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="summary-modal"><button className="modal-close" onClick={() => setSummary(null)}>×</button><span className="eyebrow">WEEK {state.week} CLOSED</span><h2>{summary.net >= 0 ? "Momentum, with discipline." : "Runway bought progress."}</h2><div className="summary-grid"><div><span>Revenue</span><strong className="positive">+{money(summary.revenue)}</strong></div><div><span>Expenses</span><strong className="negative">−{money(summary.expenses)}</strong></div><div><span>Net cash change</span><strong>{summary.net >= 0 ? "+" : ""}{money(summary.net)}</strong></div><div><span>New customers</span><strong>+{summary.newCustomers}</strong></div><div><span>Customers lost</span><strong>−{summary.churned}</strong></div><div><span>Product progress</span><strong>+{summary.productGain}%</strong></div></div><button className="primary-button wide" onClick={() => setSummary(null)}>Enter week {state.week}</button></section></div>}
      {state.pendingEvent && <div className="modal-backdrop event-backdrop" role="dialog" aria-modal="true"><section className="event-modal"><span className="eyebrow">{state.pendingEvent.eyebrow} / WEEK {state.week}</span><h2>{state.pendingEvent.title}</h2><p>{state.pendingEvent.body}</p><div className="event-choices">{state.pendingEvent.choices.map((choice, index) => <button key={choice.label} onClick={() => resolveEvent(index)}><strong>{choice.label}</strong><span>{choice.detail}</span><b>→</b></button>)}</div></section></div>}
      {inspected && <aside className="inspector"><button onClick={() => setInspected(null)}>×</button><span className="avatar large" style={{ background: inspected.color }}>{inspected.name.charAt(0)}</span><span className="eyebrow">TEAM MEMBER</span><h2>{inspected.name}</h2><p>{inspected.role}</p><dl><div><dt>Skill</dt><dd>{inspected.skill}/100</dd></div><div><dt>Morale</dt><dd>{inspected.morale}/100</dd></div><div><dt>Weekly cost</dt><dd>{inspected.weeklySalary ? money(inspected.weeklySalary) : "Founder"}</dd></div><div><dt>Status</dt><dd>{state.morale < 45 ? "Overloaded" : "Working"}</dd></div></dl><small>Autonomous schedule · Click the office to inspect another person.</small></aside>}
      {state.gameOver && <div className="modal-backdrop"><section className="event-modal game-over"><span className="eyebrow">COMPANY CLOSED / FOUNDER CONTINUES</span><h2>Northstar ran out of runway.</h2><p>The company is over, but your founder history is not. Failure becomes experience for the next venture.</p><button className="primary-button wide" onClick={() => { const next = createGame({ name: state.founderName, email: state.email, background: state.background as Background }); next.personalCash = 1200; next.reputation = state.reputation + 5; next.history = [history(next, "Founder", "Second chapter begins", "A hard-earned restart with sharper judgment."), ...state.history]; setState(next); setView("overview"); }}>Start the next chapter →</button></section></div>}
    </main>
  );
}
