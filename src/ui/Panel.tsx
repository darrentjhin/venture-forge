import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { playSfx } from "../audio/sfx";
import { BALANCE } from "../data/balance";
import { CHANNELS, CHANNEL_LABELS, type ChannelId } from "../data/channels";
import { CHURN_DRIVERS, CHURN_LABELS, type ChurnDriverId } from "../data/churnDrivers";
import { FEATURES, FEATURE_LABELS, type FeatureId } from "../data/features";
import { SEGMENTS, SEGMENT_LABELS, type SegmentId } from "../data/segments";
import { selectBurn, selectRunway, selectRunwayDisplay, selectWeeklyRevenue, selectWorkspaceCost } from "../engine/selectors";
import { alignmentFor } from "../engine/beliefs";
import type { BeliefKey, EvidenceCard, GameState, InvestorKind, PanelId, Person, Workspace } from "../engine/types";
import { canRepitchInvestor, investorStageLabel, investorThesis, latestTermSheet, lowestOpenBar, ownershipPercent } from "../engine/fundraising";
import { officeMoveCost, WORKSPACE_ORDER } from "../engine/growth";
import { useGame } from "../store/useGame";
import { ActionList } from "./ActionList";
import { NumberValue } from "./Number";
import { Sparkline } from "./Sparkline";
import { Phone } from "./phone/Phone";

const PANEL_META: Record<PanelId, { title: string; blurb: string }> = {
  metrics: { title: "The laptop", blurb: "Money, customers, and the price you are charging for the thing you have." },
  notebook: { title: "The notebook", blurb: "Everything the market has told you — and what you have decided to believe." },
  inbox: { title: "The phone", blurb: "Work, messages, people, money, and the numbers—inside the object on your desk." },
  roadmap: { title: "The whiteboard", blurb: "What is built, what is next, and what the shortcuts are costing." },
  team: { title: "The door", blurb: "The people carrying the company, and how close they are to leaving." },
  capital: { title: "The raise binder", blurb: "People to meet, passes to learn from, terms to weigh, and the ownership you keep." },
};

const PRICE_STOPS = [25, 49, 79, 99, 149, 199, 249, 349, 499, 699, 900];
const DIMENSIONS: { key: BeliefKey; label: string; question: string }[] = [
  { key: "buyer", label: "Buyer", question: "Who actually has the budget and the pain?" },
  { key: "wedge", label: "Must-have feature", question: "Which single capability wins the deal?" },
  { key: "price", label: "Price", question: "What will they approve without a fight?" },
  { key: "channel", label: "Where they find you", question: "Where do they actually come from?" },
  { key: "churnCause", label: "Why they leave", question: "Why do the ones who leave, leave?" },
];

function optionsFor(key: BeliefKey): readonly string[] {
  if (key === "buyer") return SEGMENTS;
  if (key === "wedge") return FEATURES;
  if (key === "channel") return CHANNELS;
  if (key === "churnCause") return CHURN_DRIVERS;
  return PRICE_STOPS.map(String);
}

function labelFor(key: BeliefKey, value: string): string {
  if (key === "buyer") return SEGMENT_LABELS[value as SegmentId] ?? value;
  if (key === "wedge") return FEATURE_LABELS[value as FeatureId] ?? value;
  if (key === "channel") return CHANNEL_LABELS[value as ChannelId] ?? value;
  if (key === "churnCause") return CHURN_LABELS[value as ChurnDriverId] ?? value;
  return `$${Number(value).toLocaleString()}`;
}

function evidenceWeight(evidence: EvidenceCard[], key: BeliefKey, value: string): number {
  return evidence.filter((card) => card.dimension === key && card.suggests === value).reduce((sum, card) => sum + card.strength, 0);
}

function Gauge({ label, value, max = 100, tone }: { label: string; value: number; max?: number; tone: string }) {
  return <div className="gauge">
    <div className="gauge-head"><span>{label}</span><b>{Math.round(value)}{max === 100 ? "%" : ""}</b></div>
    <div className="gauge-track"><i style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: tone }}/></div>
  </div>;
}

/* ── Metrics ─────────────────────────────────────────────── */
function MetricsPanel({ game }: { game: GameState }) {
  const setPrice = useGame((store) => store.setPrice);
  const muted = useGame((store) => store.muted);
  const revenue = selectWeeklyRevenue(game);
  const burn = selectBurn(game);
  const net = revenue - burn;
  const runway = selectRunway(game);
  const history = game.history.slice(-30);
  const fit = Math.round(alignmentFor(game.beliefs, game.truth) * 100);

  return <>
    <div className="section">
      <span className="eyebrow">This week</span>
      <div className="metric-grid">
        <div className={`metric ${game.cash < 5000 ? "bad" : game.cash < 15000 ? "warn" : ""}`}>
          <small>Cash</small><strong><NumberValue value={Math.round(game.cash)} prefix="$"/></strong>
          <em>{selectRunwayDisplay(game)} of runway</em>
        </div>
        <div className="metric"><small>MRR</small><strong><NumberValue value={Math.round(game.mrr)} prefix="$"/></strong><em>${Math.round(game.mrr * 12).toLocaleString()} ARR</em></div>
        <div className={`metric ${net >= 0 ? "good" : ""}`}><small>Net / week</small><strong>{net >= 0 ? "+" : "−"}${Math.abs(Math.round(net)).toLocaleString()}</strong><em>${Math.round(revenue).toLocaleString()} in · ${Math.round(burn).toLocaleString()} out</em></div>
        <div className="metric"><small>Customers</small><strong>{game.customers.length}</strong><em>{game.churnedCustomers} churned all-time</em></div>
        <div className="metric"><small>Pipeline</small><strong>{Math.round(game.pipeline)}</strong><em>prospects not yet converted</em></div>
        <div className={`metric ${fit >= 65 ? "good" : fit < 30 ? "bad" : "warn"}`}><small>Fit</small><strong>{fit}/100</strong><em>{fit >= 65 ? "customers keep returning" : fit >= 35 ? "some pieces are landing" : "the market is pushing back"}</em></div>
        <div className="metric"><small>Reputation</small><strong>{Math.round(game.reputation)}</strong><em>{game.reputation < 20 ? "fragile" : game.reputation > 55 ? "credible" : "unproven"}</em></div>
      </div>
    </div>

    {history.length > 1 && <div className="section">
      <span className="eyebrow">MRR · last {history.length} weeks</span>
      <Sparkline points={history.map((point) => point.mrr)} label="Monthly recurring revenue over time"/>
      <span className="eyebrow" style={{ marginTop: 12 }}>Cash · last {history.length} weeks</span>
      <Sparkline points={history.map((point) => point.cash)} variant="cash" label="Cash balance over time"/>
    </div>}

    <div className="section">
      <span className="eyebrow">Price · ${game.price.toLocaleString()} per customer / month</span>
      <div className="chips">
        {PRICE_STOPS.map((stop) => <button key={stop} className={`chip ${game.price === stop ? "active" : ""}`}
          onClick={() => { playSfx("click", muted); setPrice(stop); }}>${stop}</button>)}
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.55 }}>
        Changing the price is free and immediate. It only affects <em>new</em> customers — the {game.customers.length} you already have
        keep the price they signed at. Changing your working answer in the notebook is what costs Focus.
      </p>
    </div>

    <div className="section">
      <span className="eyebrow">Fill the pipeline</span>
      <ActionList game={game} group="metrics"/>
    </div>

    {game.customers.length > 0 && <div className="section">
      <span className="eyebrow">Accounts ({game.customers.length})</span>
      <div className="evidence">
        {game.customers.slice(-8).reverse().map((customer) => {
          const unmet = customer.demands.filter((demand) => !game.shippedFeatures.includes(demand));
          return <div key={customer.id} className={`ev-card ${unmet.length ? "unread" : ""}`}>
            <div className="ev-head"><strong>{customer.name}</strong><span>${customer.mrr}/mo · w{customer.joinedWeek}</span></div>
            <div className="ev-tags">
              <span className="ev-tag">{SEGMENT_LABELS[customer.segment]}</span>
              {customer.champion && <span className="ev-tag strength">champion</span>}
              {unmet.map((demand) => <span key={demand} className="ev-tag">wants {FEATURE_LABELS[demand]}</span>)}
            </div>
          </div>;
        })}
      </div>
    </div>}
  </>;
}

function FindingsPanel({ game }: { game: GameState }) {
  const cards = [...game.findings].reverse();
  return <>
    <div className="section">
      <span className="eyebrow">Findings · {cards.length}</span>
      {cards.length === 0 ? <div className="empty"><strong>No pattern yet.</strong><p>Assign customer interviews, ticket reviews, or sales shadowing in the phone.</p></div> : <div className="evidence">{cards.map((finding) => <div className={`ev-card ${finding.actedOn ? "" : "unread"}`} key={finding.id}><div className="ev-head"><strong>{finding.from}</strong><span>week {finding.week}</span></div><blockquote>“{finding.text}”</blockquote><div className="ev-tags"><span className="ev-tag">{finding.actedOn ? "acted on" : "not acted on"}</span></div></div>)}</div>}
    </div>
    <div className="section">
      <span className="eyebrow">Customer notes</span>
      <div className="evidence">{[...game.evidence].reverse().slice(0, 30).map((card) => <div className="ev-card" key={card.id}><div className="ev-head"><strong>{card.source}</strong><span>week {card.week}</span></div><blockquote>“{card.quote}”</blockquote></div>)}</div>
    </div>
  </>;
}

/* ── Notebook ────────────────────────────────────────────── */
function NotebookPanel({ game }: { game: GameState }) {
  const commitBelief = useGame((store) => store.commitBelief);
  const markEvidenceRead = useGame((store) => store.markEvidenceRead);
  const muted = useGame((store) => store.muted);
  useEffect(() => { markEvidenceRead(); }, [markEvidenceRead]);

  const cards = [...game.evidence].reverse();

  return <>
    <div className="section">
      <span className="eyebrow">Your current market picture · changing an answer costs 1 Focus</span>
      {DIMENSIONS.map(({ key, label, question }) => {
        const belief = game.beliefs[key];
        const current = String(belief.value);
        return <div className="belief" key={key}>
          <div className="belief-head">
            <strong>{label}</strong>
            <span>{belief.confidence}% confident · week {belief.committedWeek}</span>
          </div>
          <div className="confidence-bar"><i style={{ width: `${belief.confidence}%` }}/></div>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 10 }}>{question}</p>
          <div className="chips">
            {optionsFor(key).map((option) => {
              const weight = evidenceWeight(game.evidence, key, option);
              const active = option === current;
              return <button key={option}
                className={`chip ${active ? "active" : ""} ${weight > 0 ? "evidenced" : ""}`}
                disabled={active || game.focus < 1 || game.crisis.choiceRequired}
                title={active ? "Current answer" : game.focus < 1 ? "Not enough Focus" : `Choose ${labelFor(key, option)}`}
                onClick={() => { playSfx("commit", muted); commitBelief(key, key === "price" ? Number(option) : option); }}>
                {labelFor(key, option)}{weight > 0 && <b>{weight}</b>}
              </button>;
            })}
          </div>
        </div>;
      })}
    </div>

    <div className="section">
      <span className="eyebrow">Gather evidence</span>
      <ActionList game={game} group="notebook"/>
    </div>

    <div className="section">
      <span className="eyebrow">Evidence · {cards.length} card{cards.length === 1 ? "" : "s"}</span>
      {cards.length === 0
        ? <div className="empty"><strong>The notebook is empty.</strong><p>Run an interview or a landing-page test. Evidence is the only thing that separates a belief from a guess — and not all of it is honest.</p></div>
        : <div className="evidence">
          {cards.slice(0, 24).map((card) => {
            const dimension = DIMENSIONS.find((item) => item.key === card.dimension);
            return <div key={card.id} className={`ev-card ${card.read ? "" : "unread"}`}>
              <div className="ev-head"><strong>{card.source}</strong><span>week {card.week}</span></div>
              <blockquote>“{card.quote}”</blockquote>
              <div className="ev-tags">
                <span className="ev-tag">{dimension?.label ?? card.dimension}</span>
                <span className="ev-tag">suggests {labelFor(card.dimension, card.suggests)}</span>
                <span className="ev-tag strength">strength {card.strength}</span>
              </div>
            </div>;
          })}
        </div>}
    </div>
  </>;
}

/* ── Inbox ───────────────────────────────────────────────── */
function InboxPanel({ game }: { game: GameState }) {
  const resolveEvent = useGame((store) => store.resolveEvent);
  const muted = useGame((store) => store.muted);
  const lastReport = game.weeklyReports[game.weeklyReports.length - 1];

  return <>
    {game.pendingEvents.length > 0 && <div className="section">
      <span className="eyebrow">Needs a decision before the week ends</span>
      {game.pendingEvents.map((event) => <div className="event-card" key={event.id}>
        <span className="event-cause">{event.cause}</span>
        <h3>{event.headline}</h3>
        <p>{event.body}</p>
        <div className="event-choices">
          {event.choices.map((choice) => {
            const short = game.focus < choice.focusCost;
            return <button key={choice.id} className="event-choice" disabled={game.cash < choice.cashCost}
              title={game.cash < choice.cashCost ? "Not enough cash" : short ? "You will borrow Focus from next week" : ""}
              onClick={() => { playSfx(choice.cashCost > 0 ? "cash_out" : "commit", muted); resolveEvent(event.id, choice.id); }}>
              <strong>{choice.label}</strong>
              <span>{choice.detail}{short ? " · borrows Focus from next week" : ""}</span>
            </button>;
          })}
        </div>
      </div>)}
    </div>}

    {game.pendingEvents.length === 0 && <div className="section">
      <div className="empty"><strong>Nothing is on fire.</strong><p>Consequences arrive here a few weeks after the decisions that cause them.</p></div>
    </div>}

    {lastReport && lastReport.notes.length > 0 && <div className="section">
      <span className="eyebrow">Week {lastReport.week} notes</span>
      <ul className="note-list">{lastReport.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
    </div>}

    <div className="section">
      <span className="eyebrow">Founder moves</span>
      <ActionList game={game} group="inbox"/>
    </div>

    {game.eventHistory.length > 0 && <div className="section">
      <span className="eyebrow">Resolved · {game.eventHistory.length}</span>
      <div className="evidence">
        {[...game.eventHistory].reverse().slice(0, 8).map((event) => <div className="ev-card" key={event.id}>
          <div className="ev-head"><strong>{event.headline}</strong></div>
          <div className="ev-tags"><span className="ev-tag">{event.cause}</span></div>
        </div>)}
      </div>
    </div>}
  </>;
}

/* ── Roadmap ─────────────────────────────────────────────── */
function RoadmapPanel({ game }: { game: GameState }) {
  const setFeature = useGame((store) => store.setFeature);
  const startProductLine = useGame((store) => store.startProductLine);
  const selectProductFeature = useGame((store) => store.selectProductFeature);
  const shipProductFeature = useGame((store) => store.shipProductFeature);
  const muted = useGame((store) => store.muted);
  const demandCount = (feature: FeatureId) => game.customers.filter((customer) => customer.demands.includes(feature)).length;

  return <>
    <div className="section">
      <span className="eyebrow">Product health</span>
      <Gauge label="Tech debt" value={game.techDebt} max={120} tone={game.techDebt > 60 ? "var(--red)" : game.techDebt > 30 ? "var(--amber)" : "var(--teal)"}/>
      <Gauge label="Onboarding quality" value={game.onboardingQuality} tone={game.onboardingQuality < 50 ? "var(--red)" : "var(--teal)"}/>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, lineHeight: 1.55 }}>
        Every shipped feature adds 8 tech debt. Debt raises churn for every customer you have, not just the new ones.
      </p>
    </div>

    <div className="section">
      <span className="eyebrow">Roadmap · {game.shippedFeatures.length}/{FEATURES.length} shipped</span>
      <div className="feature-list">
        {FEATURES.map((feature) => {
          const shipped = game.shippedFeatures.includes(feature);
          const selected = game.selectedFeature === feature;
          const wanted = demandCount(feature);
          return <button key={feature} className={`feature ${shipped ? "shipped" : ""} ${selected ? "selected" : ""}`}
            disabled={shipped} title={shipped ? "Already shipped" : "Select as the next build"}
            onClick={() => { playSfx("click", muted); setFeature(feature); }}>
            <span className="feature-check" aria-hidden="true">{shipped ? "✓" : ""}</span>
            <span>
              <strong>{FEATURE_LABELS[feature]}</strong>
              {game.beliefs.wedge.value === feature && <span style={{ color: "var(--amber-deep)" }}>your current must-have</span>}
            </span>
            <span>{wanted > 0 ? `${wanted} want${wanted === 1 ? "s" : ""} it` : shipped ? "shipped" : selected ? "next" : ""}</span>
          </button>;
        })}
      </div>
    </div>

    <div className="section">
      <span className="eyebrow">Build</span>
      <ActionList game={game} group="roadmap"/>
    </div>

    <div className="section">
      <span className="eyebrow">Product lines · {game.productLines.length + 1}</span>
      <div className="product-line main"><strong>Main product</strong><span>{game.customers.length} customers · ${Math.round(game.mrr - game.productLines.reduce((sum, line) => sum + line.mrr, 0)).toLocaleString()} monthly</span></div>
      {game.productLines.map((line) => <article className="product-line" key={line.id}>
        <header><div><strong>{line.name}</strong><span>{line.customers} customers · ${line.mrr.toLocaleString()} monthly · {line.churned} left</span></div><b>{line.shippedFeatures.length} shipped</b></header>
        <div><select value={line.selectedFeature} onChange={(event) => selectProductFeature(line.id, event.target.value as FeatureId)}>{FEATURES.map((feature) => <option key={feature} value={feature} disabled={line.shippedFeatures.includes(feature)}>{FEATURE_LABELS[feature]}{line.shippedFeatures.includes(feature) ? " · shipped" : ""}</option>)}</select><button onClick={() => shipProductFeature(line.id)} disabled={line.shippedFeatures.includes(line.selectedFeature) || game.focus < 2 || game.cash < 500}>Ship · 2 Focus · $500</button></div>
      </article>)}
      <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={startProductLine} disabled={game.productLines.length >= 3 || game.focus < 2 || game.cash < 2_000}>Start another product · 2 Focus · $2,000</button>
    </div>

    <div className="section">
      <span className="eyebrow">Company history · {game.companyHistory.length}</span>
      {game.companyHistory.length === 0 ? <div className="empty"><strong>The wall is blank.</strong><p>Firsts, quarter closes, and hard weeks will stay here permanently.</p></div> : <div className="evidence">
        {[...game.companyHistory].reverse().map((entry) => <div className="ev-card" key={`${entry.id}-${entry.week}`}>
          <div className="ev-head"><strong>{entry.icon} {entry.title}</strong><span>week {entry.week}</span></div>
          <blockquote>{entry.body}</blockquote>
        </div>)}
      </div>}
      {game.founder.history.map((company) => <details key={company.companyNumber} className="company-archive">
        <summary>Company {company.companyNumber} · weeks {company.startedWeek}–{company.closedWeek}</summary>
        <p>${Math.round(company.finalMrr).toLocaleString()} monthly · {company.customers} customers · peak team {company.peakHeadcount}</p>
        {company.history.map((entry) => <small key={`${company.companyNumber}-${entry.id}`}>{entry.icon} W{entry.week} · {entry.title}</small>)}
      </details>)}
    </div>
  </>;
}

/* ── Team ────────────────────────────────────────────────── */
function AVATAR_COLOR(person: Person): string {
  return ["#315b70", "#70475f", "#2f7a5e", "#8a633c", "#4a5259", "#64609b"][person.appearance.shirt];
}

function TeamPanel({ game }: { game: GameState }) {
  const queueAction = useGame((store) => store.queueAction);
  const muted = useGame((store) => store.muted);
  const payroll = game.people.reduce((sum, person) => sum + person.salaryWeekly, 0);
  const startOfficeMove = useGame((store) => store.startOfficeMove);
  const currentTier = WORKSPACE_ORDER.indexOf(game.workspace);

  return <>
    <div className="section">
      <span className="eyebrow">Headcount</span>
      <div className="metric-grid">
        <div className="metric"><small>People</small><strong>{game.people.length + 1}</strong><em>including you</em></div>
        <div className="metric"><small>Payroll / wk</small><strong>${payroll.toLocaleString()}</strong><em>salaries only</em></div>
        <div className="metric"><small>Workspace</small><strong style={{ fontSize: 14 }}>{game.workspace}</strong><em>${selectWorkspaceCost(game).toLocaleString()}/wk</em></div>
        {game.formerPeople.length > 0 && <div className="metric bad"><small>Departed</small><strong>{game.formerPeople.length}</strong><em>{game.formerPeople.slice(-2).join(", ")}</em></div>}
      </div>
    </div>

    <div className="section">
      <span className="eyebrow">The room</span>
      {game.people.map((person) => <div className="person-row" key={person.id}>
        <span className="avatar" style={{ background: AVATAR_COLOR(person) }} aria-hidden="true">{person.name.charAt(0)}</span>
        <span>
          <strong>{person.name}{person.isCofounder && " · cofounder"}</strong>
          <small>{person.role} · skill {person.skill} · joined w{person.hiredWeek}</small>
        </span>
        <span className="person-meta">
          <i>${person.salaryWeekly.toLocaleString()}/wk</i>
          <span className="mini-bars">
            <i className="mini-bar" title={`Morale ${Math.round(person.morale)}`}><i style={{ width: `${person.morale}%`, background: person.morale < 35 ? "var(--red)" : person.morale < 60 ? "var(--amber)" : "var(--teal)" }}/></i>
            <i className="mini-bar" title={`Drift ${Math.round(person.drift)}`}><i style={{ width: `${person.drift}%`, background: person.drift > 70 ? "var(--red)" : "var(--slate)" }}/></i>
          </span>
        </span>
      </div>)}
      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>
        Left bar is morale, right bar is drift — how far their picture of the company has moved from yours. High drift plus low morale is how people leave.
      </p>
      {game.people.some((person) => person.drift > 55) && <button className="btn btn-ghost" style={{ width: "100%", marginTop: 10 }}
        disabled={game.focus < 1}
        onClick={() => { playSfx("commit", muted); queueAction("oneOnOne", [...game.people].sort((a, b) => b.drift - a.drift)[0]?.id); }}>
        Run a 1:1 with the highest drift · 1 Focus
      </button>}
    </div>

    <div className="section">
      <span className="eyebrow">Hiring and management</span>
      <ActionList game={game} group="team"/>
    </div>

    <div className="section">
      <span className="eyebrow">Move the company</span>
      {game.officeMove ? <div className="move-active"><strong>Moving to the {game.officeMove.target}</strong><span>Output is halved this week while the room changes.</span></div> : <div className="move-options">
        {WORKSPACE_ORDER.slice(currentTier + 1).map((workspace) => { const cost = officeMoveCost(workspace); return <button key={workspace} onClick={() => startOfficeMove(workspace as Workspace)} disabled={game.focus < 1 || game.cash < cost}><strong>{workspace}</strong><span>${BALANCE.workspaceWeekly[workspace].toLocaleString()}/week · ${cost.toLocaleString()} deposit</span></button>; })}
        {currentTier === WORKSPACE_ORDER.length - 1 && <p>You are already in the largest office.</p>}
      </div>}
      <p className="raise-help">A move takes one week and cuts all delegated output in half while boxes are open.</p>
    </div>
  </>;
}

/* ── Capital ─────────────────────────────────────────────── */
function CapitalPanel({ game }: { game: GameState }) {
  const openRound = useGame((store) => store.openRound);
  const discover = useGame((store) => store.discoverInvestors);
  const research = useGame((store) => store.researchInvestor);
  const pitch = useGame((store) => store.pitchInvestor);
  const counter = useGame((store) => store.counterTermSheet);
  const accept = useGame((store) => store.acceptTermSheet);
  const walk = useGame((store) => store.walkFromTermSheet);
  const closeRound = useGame((store) => store.closeRound);
  const appointCeo = useGame((store) => store.appointCeo);
  const visitCompany = useGame((store) => store.visitCompany);
  const [stage, setStage] = useState<InvestorKind>("angel");
  const active = game.rounds.find((round) => round.id === game.activeRoundId) ?? null;
  const founderPercent = ownershipPercent(game.capTable, "founder");
  const totalShares = game.capTable.reduce((sum, entry) => sum + entry.shares, 0);
  const stageDefaults: Record<InvestorKind, [number, number]> = { angel: [100_000, 700_000], preseed: [500_000, 2_500_000], seed: [1_500_000, 6_000_000], seriesA: [5_000_000, 18_000_000], growth: [15_000_000, 60_000_000] };
  const discovered = game.investors.filter((investor) => investor.discovered && (!active || investor.kind === active.stage));
  const committed = active?.commitments.reduce((sum, item) => sum + item.amount, 0) ?? 0;

  return <>
    <div className="section">
      <span className="eyebrow">What you own</span>
      <div className="metric-grid">
        <div className="metric"><small>Your ownership</small><strong>{founderPercent.toFixed(1)}%</strong><em>{game.capTable.find((entry) => entry.kind === "founder")?.shares.toLocaleString()} shares</em></div>
        <div className="metric"><small>What that is worth</small><strong>${Math.round(game.valuation * founderPercent / 100).toLocaleString()}</strong><em>on the current company estimate</em></div>
        <div className="metric"><small>Money raised</small><strong>${game.outsideCapital.toLocaleString()}</strong><em>priced ownership sold</em></div>
        <div className="metric"><small>Company estimate</small><strong>${(game.valuation / 1_000_000).toFixed(2)}M</strong><em>not an offer until someone signs</em></div>
      </div>
      <div className="cap-bar" aria-label="Company ownership">
        {game.capTable.map((entry, index) => <i key={entry.id} title={`${entry.holder}: ${(entry.shares / totalShares * 100).toFixed(1)}%`} style={{ width: `${entry.shares / totalShares * 100}%`, background: ["#d49a3a", "#4f8f86", "#8b7aa8", "#c86d58", "#6689b0", "#7f9b62"][index % 6] }}/>) }
      </div>
      <div className="cap-legend">{game.capTable.map((entry) => <span key={entry.id}><b>{entry.holder}</b> {(entry.shares / totalShares * 100).toFixed(1)}%</span>)}</div>
    </div>

    <div className="section">
      <span className="eyebrow">Raise plan</span>
      {!active ? <div className="raise-open">
        <label>Stage<select value={stage} onChange={(event) => setStage(event.target.value as InvestorKind)}>{(["angel", "preseed", "seed", "seriesA", "growth"] as InvestorKind[]).map((kind) => <option key={kind} value={kind}>{investorStageLabel(kind)}</option>)}</select></label>
        <div><span>Target</span><strong>${stageDefaults[stage][0].toLocaleString()}</strong></div><div><span>Price before money</span><strong>${stageDefaults[stage][1].toLocaleString()}</strong></div>
        <button className="btn btn-primary" onClick={() => openRound(stage, ...stageDefaults[stage])}>Open this round</button>
      </div> : <div className={`raise-summary ${active.status}`}>
        <strong>{investorStageLabel(active.stage)} · ${active.targetAmount.toLocaleString()} target</strong>
        <span>${committed.toLocaleString()} committed · {active.leadInvestorId ? "lead signed" : "still needs a lead"} · week {game.week - active.openedWeek + 1}/8</span>
        {active.leadInvestorId && active.commitments.length > 0 && <button className="btn btn-primary" onClick={closeRound}>Close round and wire money</button>}
      </div>}
    </div>

    <div className="section">
      <span className="eyebrow">Find people to pitch</span>
      <div className="raise-find"><button onClick={() => discover("cold")} disabled={game.focus < 1}>Cold outreach · 1 Focus</button><button onClick={() => discover("network")} disabled={game.focus < 2 || game.cash < 200}>Founder dinner · 2 Focus · $200</button></div>
      <p className="raise-help">Cold outreach starts the relationship at 5 and hurts the first pitch. A warm room finds up to three people.</p>
    </div>

    <div className="section">
      <span className="eyebrow">Investor pipeline · {discovered.length} known</span>
      <div className="investor-list">
        {discovered.map((investor) => {
          const latest = active ? [...active.meetings].reverse().find((meeting) => meeting.investorId === investor.id) : null;
          const sheet = active ? latestTermSheet(active, investor.id) : null;
          const isCommitted = active?.commitments.some((item) => item.investorId === investor.id);
          const researching = !investor.researched && game.decisionLog.some((decision) => decision.type === "investor-research" && decision.refId === investor.id);
          const status = isCommitted ? "Committed" : latest?.outcome.kind === "pass" ? `Passed · ${latest.outcome.reason}` : latest?.outcome.kind === "secondMeeting" ? "Second meeting" : latest?.outcome.kind === "diligence" ? "Diligence · 2 weeks" : sheet ? "Term sheet" : investor.researched ? "Researched" : researching ? "Researching · 1 week" : "Unresearched";
          return <article className="investor-card" key={investor.id}>
            <header><span>{investor.name.charAt(0)}</span><div><strong>{investor.name}</strong><small>{investor.firm} · {investorStageLabel(investor.kind)} · relationship {investor.relationship}</small></div><b>{status}</b></header>
            <p>Checks ${investor.checkMin.toLocaleString()}–${investor.checkMax.toLocaleString()} · Portfolio: {investor.portfolio.join(", ")}</p>
            {investor.researched ? <p className="investor-research">Looks for {investorThesis(investor)} · wants ${Math.round(investor.minMonthlyRevenue).toLocaleString()} monthly · accepts tech strain below {investor.maxTechDebt}</p> : <p className="investor-research hidden">Their customer focus and number bar are still unknown.</p>}
            {sheet && !isCommitted ? <div className="term-sheet"><strong>${sheet.amount.toLocaleString()} at ${sheet.preMoney.toLocaleString()} before money</strong><span>{sheet.boardSeat ? "Board seat" : "No board seat"} · {sheet.liquidationPreference}× first-money-back · {Math.round(sheet.poolTopUp * 100)}% employee pool · expires W{sheet.expiresWeek}</span><div><button onClick={() => accept(investor.id)} disabled={!investor.leadsRounds && !active?.leadInvestorId}>Accept</button><button onClick={() => counter(investor.id, "valuation")}>Counter price · 25% walk risk</button><button onClick={() => counter(investor.id, "board")}>Refuse board seat</button><button onClick={() => counter(investor.id, "pool")}>Ask for 8% pool</button><button onClick={() => walk(investor.id)}>Walk</button></div></div> : <div className="investor-actions">
              {!investor.researched && !researching && <button onClick={() => research(investor.id)} disabled={game.focus < 1}>Research · 1 Focus · one week</button>}
              {active && investor.kind === active.stage && !isCommitted && (!latest || latest.outcome.kind === "secondMeeting" || (latest.outcome.kind === "pass" && canRepitchInvestor(game, investor))) && <button onClick={() => pitch(investor.id)} disabled={game.focus < 2}>Pitch · 2 Focus</button>}
              {!investor.leadsRounds && <em>Will follow — needs a lead</em>}
            </div>}
          </article>;
        })}
      </div>
      {!discovered.length && <div className="empty"><strong>No one fits this round yet.</strong><p>Use cold outreach or go to the founder dinner.</p></div>}
      {lowestOpenBar(game) && <p className="raise-next"><b>Next move:</b> {lowestOpenBar(game)}</p>}
    </div>

    <div className="section">
      <span className="eyebrow">Desperate options</span>
      <ActionList game={game} group="capital"/>
    </div>

    <div className="section">
      <span className="eyebrow">Holding company · {game.portfolio.length + 1} active</span>
      {game.portfolio.map((company) => <article className="portfolio-company" key={company.id}><div><strong>{company.name}</strong><span>{company.ceoName}, CEO · {(company.founderOwnership * 100).toFixed(1)}% owned</span><p>${Math.round(company.mrr).toLocaleString()} monthly · ${Math.round(company.valuation).toLocaleString()} value · ${Math.round(company.dividendsPaid).toLocaleString()} dividends paid</p></div><button onClick={() => visitCompany(company.id)}>Visit office</button></article>)}
      <div className="portfolio-company current"><div><strong>{game.companyName} · you are CEO</strong><span>${Math.round(game.mrr).toLocaleString()} monthly · {game.people.length + 1} people</span></div></div>
      {game.portfolio.length > 0 && <p className="raise-next"><b>Holding dividends:</b> ${Math.round(game.holdingDividends).toLocaleString()} paid into the companies you are building.</p>}
    </div>

    <div className="section">
      <span className="eyebrow">Hand over this company</span>
      <p className="raise-help">Appoint a CEO and this office keeps growing at 60% speed. Your ownership pays dividends while you start the next company from a small room.</p>
      <div className="ceo-options">{game.people.map((person) => <button key={person.id} onClick={() => appointCeo(person.id)}><strong>{person.name}</strong><span>{person.role} · appoint CEO</span></button>)}<button onClick={() => appointCeo(null)} disabled={game.cash < 20_000}><strong>Morgan Vale</strong><span>Outside CEO · $20,000 search</span></button></div>
    </div>
  </>;
}

/* ── Shell ───────────────────────────────────────────────── */
export function Panel({ id, game }: { id: PanelId; game: GameState }) {
  const openPanel = useGame((store) => store.openPanel);
  const meta = PANEL_META[id];

  return <>
    <motion.div className="panel-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: .18 }} onClick={() => openPanel(null)}/>
    <motion.aside className="panel" role="dialog" aria-label={meta.title}
      initial={{ opacity: 0, x: 28, scale: .99 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 28, scale: .99 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}>
      <header className="panel-head">
        <div>
          <h2>{meta.title}</h2>
          <p>{meta.blurb}</p>
        </div>
        <button className="panel-close" onClick={() => openPanel(null)} aria-label="Close panel">✕</button>
      </header>
      <div className="panel-body">
        {id === "metrics" && <MetricsPanel game={game}/>}
        {id === "notebook" && <FindingsPanel game={game}/>}
        {id === "inbox" && <Phone game={game}/>}
        {id === "roadmap" && <RoadmapPanel game={game}/>}
        {id === "team" && <TeamPanel game={game}/>}
        {id === "capital" && <CapitalPanel game={game}/>}
      </div>
    </motion.aside>
  </>;
}
