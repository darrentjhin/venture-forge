"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CANDIDATES, HUSTLES, IDEA, OFFICE_CONFIG, OFFICE_UPGRADES } from "@/lib/game/config";
import { calculateFinancials, calculatePriceFit, canLaunch, clamp, featureComplete, generateOpportunities, history, productCompletion, processWeek, resolveEventChoice } from "@/lib/game/engine";
import { createGame, migrateGame } from "@/lib/game/seed";
import type { Background, Employee, GameState, GameView, Opportunity, WeekResult } from "@/lib/game/types";
import { OfficeScene } from "./OfficeScene";
import { Onboarding } from "./Onboarding";

const SAVE_KEY = "venture-forge-save-v1";
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

function Metric({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: "good" | "bad" | "watch" }) {
  return <article className="metric-card"><span>{label}</span><strong className={tone ? `tone-${tone}` : ""}>{value}</strong>{detail && <small>{detail}</small>}</article>;
}

function ProgressBar({ value, label, tone }: { value: number; label?: string; tone?: string }) {
  return <div className={`progress-wrap ${tone ?? ""}`}><div className="progress-track"><span style={{ width: `${clamp(value, 0, 100)}%` }} /></div>{label && <small>{label}</small>}</div>;
}

function CapacityMeter({ state }: { state: GameState }) {
  return <div className="capacity-meter"><div><span>FOUNDER CAPACITY</span><strong>{state.founderCapacity}/100</strong></div><ProgressBar value={state.founderCapacity} label={state.founderCapacity < 25 ? "End the week to recover your attention." : "Every important action spends time."} /></div>;
}

function runwayRisk(months: number) {
  if (months < 1.5) return "CRITICAL";
  if (months < 3) return "HIGH";
  if (months < 5) return "MODERATE";
  return "LOW";
}

function FounderWorkPanel({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState | null>> }) {
  const [showFormation, setShowFormation] = useState(false);
  const [companyName, setCompanyName] = useState(state.companyName || "Northstar Systems");
  const maxContribution = Math.max(0, state.personalCash - 300);
  const [contribution, setContribution] = useState(Math.min(maxContribution, Math.max(3000, Math.floor(maxContribution / 100) * 100)));
  const preview = useMemo(() => ({ ...state, companyFormed: true, companyCash: Math.max(0, contribution - 400) }), [state, contribution]);
  const previewFinance = calculateFinancials(preview);

  const hustle = (item: typeof HUSTLES[number]) => setState((current) => {
    if (!current || current.founderCapacity < item.attention) return current;
    const next = structuredClone(current);
    next.founderCapacity -= item.attention;
    next.personalCash += item.pay;
    next.ideaResearch = clamp(next.ideaResearch + item.research, 0, 100);
    next.network += item.network;
    next.ledger.unshift({ id: `hustle-${Date.now()}`, week: next.week, label: item.name, amount: item.pay, account: "Personal" });
    next.history.unshift(history(next, "Founder", item.name, `Earned ${money(item.pay)} using ${item.attention} of this week's attention.`));
    return next;
  });

  const research = () => setState((current) => {
    if (!current || current.founderCapacity < 25 || current.personalCash < 150) return current;
    const next = structuredClone(current);
    const founderBonus = next.background === "Business" ? 8 : next.background === "Design" ? 5 : 0;
    next.founderCapacity -= 25;
    next.personalCash -= 150;
    next.ideaResearch = clamp(next.ideaResearch + 18 + founderBonus, 0, 100);
    next.network += 2;
    next.ledger.unshift({ id: `research-${Date.now()}`, week: next.week, label: "Customer interviews", amount: -150, account: "Personal" });
    return next;
  });

  const formCompany = () => setState((current) => {
    if (!current || contribution < 2900 || current.personalCash < contribution || companyName.trim().length < 2) return current;
    const next = structuredClone(current);
    next.companyFormed = true;
    next.companyName = `${companyName.trim().replace(/,?\s*(Inc\.?|LLC)$/i, "")}, ${next.businessStructure === "LLC" ? "LLC" : "Inc."}`;
    next.personalCash -= contribution;
    next.founderContribution = contribution;
    next.companyCash = contribution - 400;
    next.ledger.unshift({ id: `formation-${Date.now()}`, week: next.week, label: "Formation and filing", amount: -400, account: "Company" }, { id: `capital-${Date.now()}`, week: next.week, label: "Founder contribution", amount: contribution, account: "Company" });
    next.history.unshift(history(next, "Milestone", `${next.companyName} formed`, `Capitalized with ${money(contribution - 400)} after formation costs.`));
    next.milestones.push("company-formed");
    return next;
  });

  return <div className="content-view founder-phase">
    <header className="page-title compact-title"><span className="eyebrow">FOUNDER DESK / WEEK {state.week}</span><h1>Your time is the first<br />scarce resource.</h1><p>Earn money, learn the market, and decide when enough certainty and capital is enough.</p></header>
    <CapacityMeter state={state} />
    <div className="metrics-row"><Metric label="Personal cash" value={money(state.personalCash)} detail="$220 living costs at week end" /><Metric label="Research confidence" value={`${state.ideaResearch}%`} detail={state.ideaResearch >= 60 ? "Idea validated" : "Ranges become clearer"} /><Metric label="Network" value={`${state.network} people`} detail="Warmer access over time" /><Metric label="Formation readiness" value={state.ideaResearch >= 40 && state.personalCash >= 2900 ? "READY" : "NOT YET"} tone={state.ideaResearch >= 40 && state.personalCash >= 2900 ? "good" : "watch"} /></div>
    <div className="two-column founder-workspace">
      <section className="panel"><div className="section-head"><div><span className="eyebrow">EARN / LEARN</span><h2>Choose this week&apos;s tradeoffs</h2></div></div><div className="action-list">{HUSTLES.map((item) => <article className="action-row" key={item.name}><div><strong>{item.name}</strong><span>{item.detail}</span><small>{item.attention} attention · +{money(item.pay)} · +{item.research}% research</small></div><button disabled={state.founderCapacity < item.attention} onClick={() => hustle(item)}>Do it</button></article>)}</div></section>
      <section className="panel idea-panel"><div className="section-head"><div><span className="eyebrow">OPPORTUNITY</span><h2>{IDEA.name}</h2></div><span className="idea-score">{state.ideaResearch}% known</span></div><p>{IDEA.description}</p><dl className="idea-facts"><div><dt>Customer</dt><dd>{state.ideaResearch >= 20 ? IDEA.customer : "Research needed"}</dd></div><div><dt>Business model</dt><dd>{state.ideaResearch >= 35 ? IDEA.model : "Still uncertain"}</dd></div><div><dt>Market</dt><dd>{state.ideaResearch >= 60 ? IDEA.market : "Wide estimate"}</dd></div><div><dt>Competition</dt><dd>{state.ideaResearch >= 50 ? IDEA.competition : "Unknown"}</dd></div></dl><ProgressBar value={state.ideaResearch} /><button className="secondary-button wide" disabled={state.founderCapacity < 25 || state.personalCash < 150} onClick={research}>Interview customers · 25 attention · $150</button><button className="primary-button wide" disabled={state.ideaResearch < 40 || state.personalCash < 2900} onClick={() => { setContribution(Math.min(maxContribution, Math.max(3000, Math.floor(maxContribution / 100) * 100))); setShowFormation(true); }}>Explore formation <span>→</span></button></section>
    </div>
    {showFormation && <div className="decision-overlay"><section className="formation-card"><button className="modal-close" onClick={() => setShowFormation(false)}>×</button><span className="eyebrow">FORMATION SUMMARY</span><h2>Turn the idea into a company.</h2><div className="formation-fields"><label>Company name<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></label><label>Structure<select value={state.businessStructure} onChange={(event) => setState((current) => current && ({ ...current, businessStructure: event.target.value as GameState["businessStructure"] }))}><option>C-Corporation</option><option>LLC</option></select></label><label>Founder contribution<input type="range" min="2900" max={Math.max(2900, maxContribution)} step="100" value={contribution} onChange={(event) => setContribution(Number(event.target.value))} /><strong>{money(contribution)}</strong></label></div><div className="formation-summary"><div><span>Personal cash</span><strong>{money(state.personalCash)}</strong></div><div><span>Founder contribution</span><strong>−{money(contribution)}</strong></div><div><span>Personal cash after</span><strong>{money(state.personalCash - contribution)}</strong></div><div><span>Company cash after $400 filing</span><strong>{money(contribution - 400)}</strong></div><div><span>Pre-revenue runway</span><strong>{previewFinance.runwayMonths === Infinity ? "No recurring burn yet" : `${previewFinance.runwayMonths.toFixed(1)} months`}</strong></div><div><span>Estimated MVP</span><strong>{state.background === "Engineering" ? "5–8 weeks" : "7–11 weeks"}</strong></div><div><span>Risk</span><strong className={`risk-${runwayRisk(previewFinance.runwayMonths).toLowerCase()}`}>{contribution < 3800 ? "HIGH" : contribution < 6000 ? "MODERATE" : "LOW"}</strong></div></div><p className="formation-note">Form earlier to reach the market sooner. Wait to build a larger buffer, but every pre-company week costs $220 and gives competitors time.</p><div className="formation-actions"><button className="secondary-button" onClick={() => setShowFormation(false)}>Wait</button><button className="primary-button" disabled={contribution < 2900 || state.personalCash < contribution} onClick={formCompany}>Form company <span>→</span></button></div></section></div>}
  </div>;
}

function RoadmapPanel({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState | null>> }) {
  const selected = state.productFeatures.find((feature) => feature.id === state.selectedFeatureId) ?? state.productFeatures[0];
  const requiredReady = canLaunch(state);
  const founderPoints = state.background === "Engineering" ? 14 : state.background === "Design" ? 10 : 9;
  const founderBuild = () => setState((current) => {
    if (!current || current.founderCapacity < 40) return current;
    const next = structuredClone(current);
    const feature = next.productFeatures.find((item) => item.id === next.selectedFeatureId)!;
    const before = featureComplete(feature);
    feature.progress = clamp(feature.progress + founderPoints, 0, feature.pointsRequired);
    next.founderCapacity -= 40;
    next.productProgress = productCompletion(next);
    next.productQuality = clamp(next.productQuality + (next.background === "Design" ? 3 : 1), 10, 100);
    if (!before && featureComplete(feature)) next.history.unshift(history(next, "Product", `${feature.name} completed`, feature.effect));
    return next;
  });
  const launch = () => setState((current) => {
    if (!current || !canLaunch(current)) return current;
    const next = structuredClone(current);
    next.productLaunched = true;
    const optionalComplete = next.productFeatures.filter((feature) => !feature.required && featureComplete(feature)).length;
    next.productQuality = clamp(next.productQuality + optionalComplete * 4, 10, 100);
    next.history.unshift(history(next, "Milestone", `${next.ideaName} launched`, `Launched at ${money(next.price)}/week with ${optionalComplete} optional roadmap components complete.`));
    next.milestones.push("product-launched");
    return next;
  });
  return <div className="content-view"><header className="page-title compact-title"><span className="eyebrow">PRODUCT ROOM / ROADMAP</span><h1>Choose what earns<br />the right to ship.</h1><p>Required foundations unlock launch. Optional work changes who buys, what they expect, and whether they stay.</p></header><CapacityMeter state={state} /><div className="roadmap-layout"><section className="roadmap-list">{state.productFeatures.map((feature) => <button key={feature.id} className={`roadmap-item ${selected.id === feature.id ? "active" : ""} ${featureComplete(feature) ? "complete" : ""}`} onClick={() => setState((current) => current && ({ ...current, selectedFeatureId: feature.id }))}><div><span className="feature-type">{feature.required ? "REQUIRED" : "OPTIONAL"}</span><strong>{feature.name}</strong><small>{feature.description}</small></div><div className="feature-points"><b>{Math.min(feature.progress, feature.pointsRequired)}/{feature.pointsRequired}</b><ProgressBar value={feature.progress / feature.pointsRequired * 100} /></div></button>)}</section><section className="panel feature-detail"><span className="eyebrow">CURRENT FOCUS</span><h2>{selected.name}</h2><p>{selected.description}</p><div className="feature-big-progress"><strong>{Math.max(0, selected.pointsRequired - selected.progress)}</strong><span>engineering points remaining</span></div><ProgressBar value={selected.progress / selected.pointsRequired * 100} label={selected.effect} /><button className="primary-button wide" disabled={state.founderCapacity < 40 || featureComplete(selected)} onClick={founderBuild}>{featureComplete(selected) ? "Complete" : `Founder build sprint · 40 attention · +${founderPoints}`} <span>→</span></button><small className="founder-edge">{state.background === "Engineering" ? "Engineering founder edge: 50% more output per sprint." : state.background === "Design" ? "Design founder edge: each sprint also improves activation quality." : "Employees continue the selected feature at week end."}</small></section></div>{!state.productLaunched && <button className={`launch-button ${requiredReady ? "ready" : ""}`} disabled={!requiredReady} onClick={launch}><span>{requiredReady ? `Launch ${state.ideaName} now` : `Launch locked · complete all three required foundations`}</span><b>→</b></button>}{state.productLaunched && <div className="launched-banner"><span>● LIVE</span><strong>{state.ideaName} is in market at {money(state.price)}/week.</strong><small>Missing optional components still influence deal fit and customer health.</small></div>}</div>;
}

function OpportunityCard({ opportunity, state, onFocus }: { opportunity: Opportunity; state: GameState; onFocus: () => void }) {
  return <article className="opportunity-card"><div className="opp-head"><div><span className={`fit fit-${opportunity.fit.toLowerCase()}`}>{opportunity.fit} fit</span><h3>{opportunity.name}</h3><small>{opportunity.segment} · {opportunity.employees} employees</small></div><strong>{money(opportunity.potentialValue)}<small>/week</small></strong></div><div className="opp-facts"><span>Stage <b>{opportunity.stage}</b></span><span>Need <b>{opportunity.need}</b></span><span>Decision <b>W{opportunity.decisionWeek}</b></span><span>Win chance <b>{opportunity.probability}%</b></span></div><ProgressBar value={(Math.max(0, ["Lead", "Contacted", "Discovery", "Demo", "Proposal", "Negotiation"].indexOf(opportunity.stage)) + 1) / 6 * 100} /><button disabled={state.founderCapacity < 20 || ["Won", "Lost"].includes(opportunity.stage)} onClick={onFocus}>Work this deal · 20 attention</button></article>;
}

function GrowthPanel({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState | null>> }) {
  const active = state.opportunities.filter((opportunity) => !["Won", "Lost"].includes(opportunity.stage));
  const outreach = () => setState((current) => {
    if (!current || current.founderCapacity < 30 || !current.productLaunched) return current;
    const next = structuredClone(current);
    const created = generateOpportunities(next, next.background === "Sales" ? 3 : 2);
    next.opportunities.push(...created);
    next.founderCapacity -= 30;
    if (created.length && !next.milestones.includes("first-lead")) next.history.unshift(history(next, "Sales", "First leads entered the pipeline", `${created.map((item) => item.name).join(" and ")} showed interest.`));
    return next;
  });
  const focus = (id: string) => setState((current) => {
    if (!current || current.founderCapacity < 20) return current;
    const next = structuredClone(current);
    const opportunity = next.opportunities.find((item) => item.id === id)!;
    opportunity.founderEffort += next.background === "Sales" ? 32 : 24;
    next.founderCapacity -= 20;
    return next;
  });
  const setPrice = (price: number) => setState((current) => current && ({ ...current, price }));
  const finances = calculateFinancials(state);
  return <div className="content-view"><header className="page-title compact-title"><span className="eyebrow">SALES ROOM / PIPELINE</span><h1>Deals move when<br />someone moves them.</h1><p>Every prospect has a need, a clock, and a reason to say no. Price and roadmap shape the odds.</p></header><CapacityMeter state={state} /><div className="metrics-row"><Metric label="Pipeline" value={`${active.length} opportunities`} detail={`${state.opportunities.filter((item) => item.stage === "Won").length} won all-time`} /><Metric label="Customers" value={`${state.customerAccounts.length}`} detail={`${state.customerAccounts.filter((item) => item.risk === "High").length} high-risk accounts`} /><Metric label="MRR" value={money(finances.monthlyRecurringRevenue)} detail={`${money(finances.annualRecurringRevenue)} ARR`} /><Metric label="Founder edge" value={state.background === "Sales" ? "WARM OUTREACH" : state.background.toUpperCase()} detail={state.background === "Sales" ? "Starts deals one stage ahead" : "No sales specialization"} /></div><section className="panel pricing-strategy"><div><span className="eyebrow">POSITIONING</span><h2>Choose who the price is for.</h2></div><div className="price-options">{[99,149,219].map((price) => { const micro = calculatePriceFit(price, "Micro", state.productQuality); const mid = calculatePriceFit(price, "Mid-market", state.productQuality); return <button className={state.price === price ? "price-option active" : "price-option"} key={price} onClick={() => setPrice(price)}><strong>{money(price)}</strong><span>/ week</span><small>{price === 99 ? `Micro fit ${Math.round(micro * 100)} · support-heavy` : price === 149 ? "Balanced SMB position" : `Mid-market fit ${Math.round(mid * 100)} · high expectations`}</small></button>; })}</div></section><div className="pipeline-header"><div><span className="eyebrow">ACTIVE OPPORTUNITIES</span><h2>{active.length ? "What deserves your attention?" : "The pipeline is empty."}</h2></div><button className="primary-button" disabled={state.founderCapacity < 30 || !state.productLaunched} onClick={outreach}>Founder outreach · 30 <span>→</span></button></div>{!state.productLaunched && <div className="locked-note">Launch the product before generating paid opportunities.</div>}<div className="opportunity-grid">{active.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} state={state} onFocus={() => focus(opportunity.id)} />)}</div>{state.customerAccounts.length > 0 && <section className="customer-book"><div className="section-head"><div><span className="eyebrow">CUSTOMER BOOK</span><h2>Accounts with memory</h2></div></div>{state.customerAccounts.map((customer) => <article className="customer-row" key={customer.id}><div><strong>{customer.name}</strong><span>{customer.segment} · {customer.employees} employees</span></div><span>Needs <b>{customer.need}</b></span><span>Health <b className={`risk-${customer.risk.toLowerCase()}`}>{customer.health}</b></span><span>Renewal <b>W{customer.renewalWeek}</b></span><span>{money(customer.contractValue)}/wk</span></article>)}</section>}</div>;
}

function TeamPanel({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState | null>> }) {
  const hire = (candidate: Employee) => setState((current) => {
    if (!current || current.founderCapacity < 25 || current.companyCash < candidate.weeklySalary * .35 || current.employees.some((item) => item.id === candidate.id) || current.employees.length + 1 >= OFFICE_CONFIG[current.office].capacity) return current;
    const next = structuredClone(current);
    const signing = Math.round(candidate.weeklySalary * .35);
    next.founderCapacity -= 25;
    next.companyCash -= signing;
    next.employees.push(structuredClone(candidate));
    next.ledger.unshift({ id: `hire-${candidate.id}`, week: next.week, label: `${candidate.name} recruiting cost`, amount: -signing, account: "Company" });
    next.history.unshift(history(next, "Team", `${candidate.name} joined`, `${candidate.role} joined to solve a specific company constraint.`));
    return next;
  });
  const move = (tier: "Coworking" | "Studio") => setState((current) => {
    const requirement = OFFICE_UPGRADES[tier];
    if (!current || current.companyCash < requirement.deposit || current.employees.length + 1 < requirement.minTeam) return current;
    const next = structuredClone(current);
    next.office = tier;
    next.companyCash -= requirement.deposit;
    next.history.unshift(history(next, "Milestone", `Moved into ${OFFICE_CONFIG[tier].label}`, `The company gained room for ${OFFICE_CONFIG[tier].capacity} people.`));
    return next;
  });
  return <div className="content-view"><header className="page-title compact-title"><span className="eyebrow">TEAM / CONSTRAINTS</span><h1>Hire for the bottleneck,<br />not the résumé.</h1><p>Each specialist changes a different system. Payroll changes all of them.</p></header><CapacityMeter state={state} /><div className="team-layout"><section className="panel"><div className="section-head"><div><span className="eyebrow">CURRENT TEAM</span><h2>{state.employees.length + 1} people</h2></div><span className="capacity-pill">{state.employees.length + 1}/{OFFICE_CONFIG[state.office].capacity} seats</span></div>{state.employees.map((employee) => <article className="employee-row detailed" key={employee.id}><span className="avatar" style={{ background: employee.color }}>{employee.name.charAt(0)}</span><div><strong>{employee.name}</strong><small>{employee.role} · {employee.activity}</small></div><span className={`workload workload-${employee.workload > 75 ? "high" : "normal"}`}>{employee.workload}% load</span></article>)}</section><section className="panel candidate-market"><span className="eyebrow">CANDIDATE MARKET</span><h2>Which constraint hurts most?</h2>{CANDIDATES.filter((candidate) => !state.employees.some((item) => item.id === candidate.id)).slice(0, 4).map((candidate) => { const topSkills = Object.entries(candidate.skills).sort((a,b) => b[1]-a[1]).slice(0,3); return <article className="candidate detailed-candidate" key={candidate.id}><div><span className="avatar" style={{ background: candidate.color }}>{candidate.name.charAt(0)}</span><div><strong>{candidate.name}</strong><small>{candidate.role} · {money(candidate.weeklySalary)}/wk</small></div></div><div className="skill-chips">{topSkills.map(([skill,value]) => <span key={skill}>{skill.replace("customerSuccess","customer success")} <b>{value}</b></span>)}</div><button disabled={state.founderCapacity < 25 || state.companyCash < candidate.weeklySalary * .35 || state.employees.length + 1 >= OFFICE_CONFIG[state.office].capacity} onClick={() => hire(candidate)}>Recruit · 25 attention</button></article>; })}</section></div><section className="panel office-options"><div><span className="eyebrow">OFFICE PROGRESSION</span><h2>Space becomes a constraint too.</h2></div>{(["Coworking","Studio"] as const).map((tier) => <article key={tier} className={state.office === tier ? "office-option current" : "office-option"}><div><strong>{OFFICE_CONFIG[tier].label}</strong><span>{OFFICE_CONFIG[tier].capacity} seats · {money(OFFICE_CONFIG[tier].weeklyCost)}/wk</span><small>Deposit {money(OFFICE_UPGRADES[tier].deposit)} · requires {OFFICE_UPGRADES[tier].minTeam} people</small></div><button disabled={state.office === tier || state.companyCash < OFFICE_UPGRADES[tier].deposit || state.employees.length + 1 < OFFICE_UPGRADES[tier].minTeam} onClick={() => move(tier)}>{state.office === tier ? "Current" : "Move in"}</button></article>)}</section></div>;
}

function FinancePanel({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState | null>> }) {
  const finances = calculateFinancials(state);
  const consult = () => setState((current) => {
    if (!current || current.founderCapacity < 40) return current;
    const next = structuredClone(current);
    next.founderCapacity -= 40;
    next.consultingLoad += 40;
    next.companyCash += 1100;
    next.ledger.unshift({ id: `consult-${Date.now()}`, week: next.week, label: "Founder consulting engagement", amount: 1100, account: "Company" });
    return next;
  });
  return <div className="content-view"><header className="page-title compact-title"><span className="eyebrow">FINANCE / FINANCIAL TRUTH</span><h1>Cash is time<br />made visible.</h1><p>These numbers use the exact same model that settles every week.</p></header><CapacityMeter state={state} /><div className="metrics-row"><Metric label="Cash" value={money(state.companyCash)} detail={`${finances.runwayState} runway`} tone={finances.runwayState === "Critical" || finances.runwayState === "Danger" ? "bad" : finances.runwayState === "Watch" ? "watch" : "good"} /><Metric label="Runway" value={finances.runwayMonths === Infinity ? "∞" : `${finances.runwayMonths.toFixed(1)} mo`} detail={`${money(finances.monthlyBurn)} monthly burn`} /><Metric label="MRR" value={money(finances.monthlyRecurringRevenue)} detail={`${money(finances.annualRecurringRevenue)} ARR`} /><Metric label="Gross margin" value={finances.weeklyRevenue ? `${finances.grossMargin}%` : "—"} detail={`${money(finances.weeklyProfit)} weekly profit`} /></div><div className="two-column"><section className="panel finance-waterfall"><span className="eyebrow">WEEKLY OPERATING MODEL</span><h2>Where the money goes</h2>{[["Recurring revenue",finances.weeklyRevenue],["Payroll",-finances.payroll],["Office",-finances.officeCost],["Base operations",-finances.baseOperations],["Customer costs",-finances.customerCosts],["Net change",finances.weeklyProfit]].map(([label,value]) => <div className="waterfall-row" key={String(label)}><span>{label}</span><strong className={Number(value) >= 0 ? "positive" : "negative"}>{Number(value)>=0?"+":""}{money(Number(value))}</strong></div>)}</section><section className="panel consulting-card"><span className="eyebrow">EMERGENCY LEVER</span><h2>Keep one foot in consulting?</h2><p>Bring $1,100 into the company this week. It costs 40 founder attention and reduces the team&apos;s autonomous product output at week end.</p><div className="tradeoff"><span>Company cash after</span><strong>{money(state.companyCash + 1100)}</strong><span>Founder capacity after</span><strong>{state.founderCapacity - 40}/100</strong></div><button className="primary-button wide" disabled={state.founderCapacity < 40} onClick={consult}>Take consulting project · 40 <span>→</span></button></section></div><section className="panel ledger-panel"><span className="eyebrow">GENERAL LEDGER</span><h2>Recent transactions</h2>{state.ledger.filter((item) => item.account === "Company").slice(0,10).map((item) => <div className="ledger-row" key={item.id}><span>W{item.week}</span><strong>{item.label}</strong><b className={item.amount>=0?"positive":"negative"}>{item.amount>=0?"+":""}{money(item.amount)}</b></div>)}</section></div>;
}

function CompanyBrief({ state, open }: { state: GameState; open: (view: GameView) => void }) {
  const finances = calculateFinancials(state);
  const selected = state.productFeatures.find((feature) => feature.id === state.selectedFeatureId)!;
  const activeDeals = state.opportunities.filter((opportunity) => !["Won","Lost"].includes(opportunity.stage));
  const threads = [!featureComplete(selected) ? `${selected.name}: ${selected.pointsRequired-selected.progress} points left` : null, activeDeals[0] ? `${activeDeals[0].name}: ${activeDeals[0].stage}, decides W${activeDeals[0].decisionWeek}` : null, state.customerAccounts.find((customer) => customer.renewalWeek-state.week<=3) ? "A customer renewal is approaching" : null, finances.runwayState !== "Healthy" ? `${finances.runwayState} runway: ${finances.runwayMonths.toFixed(1)} months` : null].filter(Boolean) as string[];
  return <div className="content-view"><header className="page-title compact-title"><span className="eyebrow">COMPANY BRIEF / WEEK {state.week}</span><h1>{state.productLaunched ? "Momentum creates new constraints." : "The clock started at formation."}</h1><p>{state.companyName} has {state.founderCapacity} founder attention left before week end. Choose what does not get done.</p></header><CapacityMeter state={state} /><div className="metrics-row"><Metric label="Cash" value={money(state.companyCash)} detail={`${finances.runwayState} runway`} tone={finances.runwayState === "Danger" || finances.runwayState === "Critical" ? "bad" : undefined} /><Metric label="MRR" value={money(finances.monthlyRecurringRevenue)} detail={`${state.customerAccounts.length} customer accounts`} /><Metric label="Product" value={`${state.productProgress}%`} detail={canLaunch(state) ? "Required scope ready" : "Required scope incomplete"} /><Metric label="Pipeline" value={`${activeDeals.length} deals`} detail={`${activeDeals.filter((deal)=>deal.stage==="Proposal"||deal.stage==="Negotiation").length} late-stage`} /></div><section className="panel thread-board"><div className="section-head"><div><span className="eyebrow">OPEN THREADS</span><h2>Why end one more week?</h2></div></div><div className="thread-grid">{threads.length ? threads.map((thread,index)=><article key={thread}><span>0{index+1}</span><strong>{thread}</strong></article>) : <article><span>01</span><strong>Create a thread: build, sell, or hire.</strong></article>}</div></section><div className="decision-portals"><button onClick={()=>open("product")}><span>PRODUCT ROOM</span><strong>{canLaunch(state)?"Decide when to launch":`Build ${selected.name}`}</strong><b>→</b></button><button onClick={()=>open("growth")}><span>SALES ROOM</span><strong>{state.productLaunched?"Move real opportunities":"Prepare go-to-market"}</strong><b>→</b></button><button onClick={()=>open("team")}><span>TEAM</span><strong>Hire for the current constraint</strong><b>→</b></button><button onClick={()=>open("finance")}><span>FINANCE</span><strong>Understand the exact runway</strong><b>→</b></button></div></div>;
}

function HistoryPanel({ state }: { state: GameState }) {
  return <div className="content-view history-view"><header className="page-title compact-title"><span className="eyebrow">PERMANENT RECORD</span><h1>The company remembers<br />every consequential week.</h1><p>Milestones, hard calls, customers, and crises remain part of the founder&apos;s career.</p></header><div className="history-line">{state.history.map((item,index)=><article key={item.id} className="history-item"><span className="history-marker">{String(state.history.length-index).padStart(2,"0")}</span><div><small>WEEK {item.week} · {item.category.toUpperCase()}</small><h3>{item.title}</h3><p>{item.detail}</p></div></article>)}</div></div>;
}

function WeekSummary({ state, summary, onClose }: { state: GameState; summary: WeekResult["summary"]; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="week-report"><span className="eyebrow">WEEK {state.week} / COMPANY REPORT</span><div className="week-report-title"><div><h2>{summary.net >= 0 ? "Momentum compounded." : "Progress spent runway."}</h2><p>Here is what changed—and why it matters next.</p></div><strong>W{String(state.week).padStart(2,"0")}</strong></div><div className="week-pulse"><div><span>CASH</span><strong>{money(summary.cash)}</strong><small className={summary.net>=0?"positive":"negative"}>{summary.net>=0?"+":""}{money(summary.net)}</small></div><div><span>REVENUE</span><strong>{money(summary.revenue)}</strong><small className={summary.revenueChange>=0?"positive":"negative"}>{summary.revenueChange>=0?"+":""}{summary.revenueChange}%</small></div><div><span>CUSTOMERS</span><strong>{state.customerAccounts.length}</strong><small>{summary.newCustomers} won / {summary.churned} lost</small></div><div><span>PRODUCT</span><strong>+{summary.productGain}</strong><small>engineering points</small></div></div><div className="report-columns"><section><span className="eyebrow">WHAT HAPPENED</span>{summary.happenings.map((item,index)=><p key={index}><b>{String(index+1).padStart(2,"0")}</b>{item}</p>)}</section><section><span className="eyebrow">WATCH NEXT WEEK</span>{summary.watchNext.length ? summary.watchNext.map((item,index)=><p key={index}><b>→</b>{item}</p>) : <p><b>→</b>No urgent thread. Create one before ending next week.</p>}</section></div><button className="primary-button wide" onClick={onClose}>Continue into Week {state.week} <span>→</span></button></section></div>;
}

export default function GameApp() {
  const [state, setState] = useState<GameState | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<GameView>("overview");
  const [panelOpen, setPanelOpen] = useState(false);
  const [summary, setSummary] = useState<WeekResult["summary"] | null>(null);
  const [inspected, setInspected] = useState<Employee | null>(null);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) setState(migrateGame(JSON.parse(raw)));
      } catch { /* a damaged save starts clean */ }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);
  useEffect(() => { if(ready&&state) localStorage.setItem(SAVE_KEY,JSON.stringify(state)); },[state,ready]);
  const advance = useCallback(() => setState((current)=>{ if(!current||current.gameOver||current.pendingEvent)return current; const result=processWeek(current); setSummary(result.summary); return result.state; }),[]);
  const savedName=state?.founderName;
  if(!ready) return <main className="loading-screen"><span>V</span><p>Preparing your founder desk…</p></main>;
  if(!state||!state.loggedIn) return <Onboarding savedName={savedName} onResume={state?()=>{setState({...state,loggedIn:true});setPanelOpen(false);}:undefined} onStart={(data)=>{setState(createGame(data));setView("overview");setPanelOpen(false);}}/>;

  const openStation=(next:GameView)=>{setView(next);setPanelOpen(true);};
  const finances=state.companyFormed?calculateFinancials(state):null;
  const selected=state.productFeatures.find((feature)=>feature.id===state.selectedFeatureId)??state.productFeatures[0];
  const mission=!state.companyFormed ? state.ideaResearch<40?"Learn enough to make a formation decision":state.personalCash<2900?"Build a viable starting cash position":"Choose when and how much to capitalize" : !state.productLaunched?canLaunch(state)?"Decide whether the MVP is ready to meet customers":`Finish ${selected.name} · ${selected.pointsRequired-selected.progress} points left`:state.opportunities.filter((o)=>!["Won","Lost"].includes(o.stage)).length?"Move the next deal before its decision week":"Create the next sales opportunity";
  return <main className="world-shell">
    <OfficeScene state={state} onSelect={setInspected} immersive onNavigate={openStation}/>
    <header className="world-topbar"><div className="world-brand"><div className="brand-mark">V</div><div><strong>VENTURE FORGE</strong><span>{state.companyFormed?state.companyName:`${state.founderName}'s apartment`}</span></div></div><div className="world-week"><span>WEEK</span><strong>{String(state.week).padStart(2,"0")}</strong><small>{state.year} · Q{Math.min(4,Math.ceil(state.week/13))}</small></div><button className="advance-button world-advance" disabled={!!state.pendingEvent||state.gameOver} onClick={advance}>End week <span>→</span></button></header>
    <section className="world-stats"><article><span>{state.companyFormed?"COMPANY CASH":"PERSONAL CASH"}</span><strong>{money(state.companyFormed?state.companyCash:state.personalCash)}</strong></article><article><span>FOUNDER CAPACITY</span><strong>{state.founderCapacity}/100</strong></article><article><span>{state.companyFormed?"RUNWAY":"RESEARCH"}</span><strong>{state.companyFormed?finances?.runwayMonths===Infinity?"∞":`${finances?.runwayMonths.toFixed(1)} mo`:`${state.ideaResearch}%`}</strong></article></section>
    <section className="world-mission"><span className="mission-kicker">CURRENT MISSION</span><strong>{mission}</strong><button onClick={()=>openStation("overview")}>{state.companyFormed?"Open company brief":"Sit down and work"}<b>→</b></button></section>
    <nav className="world-utility"><button onClick={()=>openStation("history")}><span>☰</span>Company journal</button><button onClick={()=>setState({...state,loggedIn:false})}><span>↙</span>Save & leave</button></nav>
    {panelOpen&&<div className="management-layer" role="dialog" aria-modal="true"><button className="drawer-close" onClick={()=>setPanelOpen(false)} aria-label="Return to office">× <span>RETURN TO OFFICE</span></button><div className="management-drawer">{!state.companyFormed&&view==="overview"&&<FounderWorkPanel state={state} setState={setState}/>} {state.companyFormed&&view==="overview"&&<CompanyBrief state={state} open={openStation}/>} {state.companyFormed&&view==="product"&&<RoadmapPanel state={state} setState={setState}/>} {state.companyFormed&&view==="growth"&&<GrowthPanel state={state} setState={setState}/>} {state.companyFormed&&view==="team"&&<TeamPanel state={state} setState={setState}/>} {state.companyFormed&&view==="finance"&&<FinancePanel state={state} setState={setState}/>} {view==="history"&&<HistoryPanel state={state}/>}</div></div>}
    {summary&&<WeekSummary state={state} summary={summary} onClose={()=>setSummary(null)}/>}
    {state.pendingEvent&&<div className="modal-backdrop event-backdrop" role="dialog" aria-modal="true"><section className="event-modal"><span className="event-category">{state.pendingEvent.category}</span><span className="eyebrow">SYSTEM EVENT / WEEK {state.week}</span><h2>{state.pendingEvent.title}</h2><p>{state.pendingEvent.body}</p><div className="event-choices">{state.pendingEvent.choices.map((choice,index)=><button key={choice.label} onClick={()=>setState((current)=>current?resolveEventChoice(current,index):current)}><strong>{choice.label}</strong><span>{choice.detail}</span><b>→</b></button>)}</div></section></div>}
    {inspected&&<aside className="inspector"><button onClick={()=>setInspected(null)}>×</button><span className="avatar large" style={{background:inspected.color}}>{inspected.name.charAt(0)}</span><span className="eyebrow">{inspected.department.toUpperCase()} / {inspected.activity.toUpperCase()}</span><h2>{inspected.name}</h2><p>{inspected.role}</p><dl><div><dt>Top skill</dt><dd>{Object.entries(inspected.skills).sort((a,b)=>b[1]-a[1])[0][0]}</dd></div><div><dt>Morale</dt><dd>{inspected.morale}/100</dd></div><div><dt>Workload</dt><dd>{inspected.workload}/100</dd></div><div><dt>Weekly cost</dt><dd>{inspected.weeklySalary?money(inspected.weeklySalary):"Founder"}</dd></div></dl></aside>}
    {state.gameOver&&<div className="modal-backdrop"><section className="event-modal game-over"><span className="eyebrow">COMPANY CLOSED / FOUNDER CONTINUES</span><h2>{state.companyName} ran out of runway.</h2><p>The warnings were visible, but the chosen recovery did not arrive in time. The founder&apos;s history and experience continue.</p><button className="primary-button wide" onClick={()=>{const next=createGame({name:state.founderName,email:state.email,background:state.background as Background});next.personalCash=1200;next.reputation=state.reputation+5;next.history=[history(next,"Founder","Second chapter begins","A hard-earned restart with sharper judgment."),...state.history];setState(next);setView("overview");}}>Start the next chapter →</button></section></div>}
  </main>;
}
