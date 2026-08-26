import { motion } from "framer-motion";
import { useEffect } from "react";
import { playSfx } from "../audio/sfx";
import { BALANCE } from "../data/balance";
import { CHANNELS, CHANNEL_LABELS, type ChannelId } from "../data/channels";
import { CHURN_DRIVERS, CHURN_LABELS, type ChurnDriverId } from "../data/churnDrivers";
import { FEATURES, FEATURE_LABELS, type FeatureId } from "../data/features";
import { SEGMENTS, SEGMENT_LABELS, type SegmentId } from "../data/segments";
import { selectBurn, selectRunway, selectRunwayDisplay, selectWeeklyRevenue, selectWorkspaceCost } from "../engine/selectors";
import type { BeliefKey, EvidenceCard, GameState, PanelId, Person } from "../engine/types";
import { useGame } from "../store/useGame";
import { ActionList } from "./ActionList";
import { NumberValue } from "./Number";
import { Sparkline } from "./Sparkline";

const PANEL_META: Record<PanelId, { title: string; blurb: string }> = {
  metrics: { title: "The laptop", blurb: "Money, customers, and the price you are charging for the thing you have." },
  notebook: { title: "The notebook", blurb: "Everything the market has told you — and what you have decided to believe." },
  inbox: { title: "The phone", blurb: "Consequences arriving from decisions you already made." },
  roadmap: { title: "The whiteboard", blurb: "What is built, what is next, and what the shortcuts are costing." },
  team: { title: "The door", blurb: "The people carrying the company, and how close they are to leaving." },
  capital: { title: "The filing cabinet", blurb: "Valuation, outside money, and the gap between your story and your evidence." },
};

const PRICE_STOPS = [25, 49, 79, 99, 149, 199, 249, 349, 499, 699, 900];
const DIMENSIONS: { key: BeliefKey; label: string; question: string }[] = [
  { key: "buyer", label: "Buyer", question: "Who actually has the budget and the pain?" },
  { key: "wedge", label: "Wedge", question: "Which single capability wins the deal?" },
  { key: "price", label: "Price", question: "What will they approve without a fight?" },
  { key: "channel", label: "Channel", question: "Where do they actually come from?" },
  { key: "churnCause", label: "Churn cause", question: "Why do the ones who leave, leave?" },
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
        keep the price they signed at. Committing to a price <em>hypothesis</em> in the notebook is what costs Focus.
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

/* ── Notebook ────────────────────────────────────────────── */
function NotebookPanel({ game }: { game: GameState }) {
  const commitBelief = useGame((store) => store.commitBelief);
  const markEvidenceRead = useGame((store) => store.markEvidenceRead);
  const muted = useGame((store) => store.muted);
  useEffect(() => { markEvidenceRead(); }, [markEvidenceRead]);

  const cards = [...game.evidence].reverse();

  return <>
    <div className="section">
      <span className="eyebrow">Working hypotheses · committing costs 1 Focus</span>
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
                disabled={active || game.focus < 1 || Boolean(game.ending)}
                title={active ? "Current hypothesis" : game.focus < 1 ? "Not enough Focus" : `Commit to ${labelFor(key, option)}`}
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
              {game.beliefs.wedge.value === feature && <span style={{ color: "var(--amber-deep)" }}>your wedge hypothesis</span>}
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
  </>;
}

/* ── Capital ─────────────────────────────────────────────── */
function CapitalPanel({ game }: { game: GameState }) {
  const gap = game.conviction - game.evidenceScore;
  const overclaimLevel = game.overclaim > BALANCE.overclaimThresholds[2] ? "bad" : game.overclaim > BALANCE.overclaimThresholds[1] ? "warn" : "";

  return <>
    <div className="section">
      <span className="eyebrow">Position</span>
      <div className="metric-grid">
        <div className="metric"><small>Valuation</small><strong>${(game.valuation / 1_000_000).toFixed(2)}M</strong><em>estimate, not an offer</em></div>
        <div className="metric"><small>Outside capital</small><strong>${game.outsideCapital.toLocaleString()}</strong><em>{game.outsideCapital > 0 ? "revenue carries a financing drag" : "fully bootstrapped"}</em></div>
        <div className="metric"><small>Conviction</small><strong>{Math.round(game.conviction)}</strong><em>how hard you are selling it</em></div>
        <div className="metric"><small>Evidence</small><strong>{Math.round(game.evidenceScore)}</strong><em>what you can actually prove</em></div>
      </div>
    </div>

    <div className={`section`}>
      <span className="eyebrow">The gap</span>
      <Gauge label="Conviction" value={game.conviction} tone="var(--amber)"/>
      <Gauge label="Evidence" value={game.evidenceScore} tone="var(--teal)"/>
      <div className={`metric ${overclaimLevel}`} style={{ marginTop: 10 }}>
        <small>Overclaim</small><strong>{Math.round(game.overclaim)}</strong>
        <em>{game.overclaim > 45 ? "You are selling a company that does not exist yet." : game.overclaim > 25 ? "The story is running ahead of the proof." : gap > 15 ? "Slightly ahead of the evidence." : "Story and proof are roughly aligned."}</em>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.55 }}>
        Conviction opens doors — an angel needs 48, a seed fund needs 62. But conviction that outruns evidence accumulates
        as overclaim, and overclaim is what the post-mortem grades you on.
      </p>
    </div>

    <div className="section">
      <span className="eyebrow">Raise or cut</span>
      <ActionList game={game} group="capital"/>
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
        {id === "notebook" && <NotebookPanel game={game}/>}
        {id === "inbox" && <InboxPanel game={game}/>}
        {id === "roadmap" && <RoadmapPanel game={game}/>}
        {id === "team" && <TeamPanel game={game}/>}
        {id === "capital" && <CapitalPanel game={game}/>}
      </div>
    </motion.aside>
  </>;
}
