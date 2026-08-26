import { useState } from "react";
import { CHANNEL_LABELS, CHANNELS } from "../../data/channels";
import { CHURN_DRIVERS, CHURN_LABELS } from "../../data/churnDrivers";
import { FEATURES, FEATURE_LABELS } from "../../data/features";
import { SEGMENTS, SEGMENT_LABELS } from "../../data/segments";
import type { BeliefKey, GameState } from "../../engine/types";
import { useGame } from "../../store/useGame";
import { ActionList } from "../ActionList";

function BeliefCommit({ label, beliefKey, value, options, game }: { label: string; beliefKey: BeliefKey; value: string; options: { value: string; label: string }[]; game: GameState }) {
  const [draft, setDraft] = useState(value); const commit = useGame((store) => store.commitBelief);
  return <article className="belief-row"><div><span>{label}</span><strong>{options.find((item) => item.value === value)?.label ?? value}</strong><small>{game.beliefs[beliefKey].confidence}% confidence · committed W{game.beliefs[beliefKey].committedWeek}</small></div><select value={draft} onChange={(event) => setDraft(event.target.value)} aria-label={`New ${label} hypothesis`}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button disabled={draft === value || game.focus < 1} onClick={() => commit(beliefKey, beliefKey === "price" ? Number(draft) : draft)}>Commit · 1 Focus</button></article>;
}

export function NotebookPanel({ game }: { game: GameState }) {
  const markRead = useGame((store) => store.markEvidenceRead);
  const segmentOptions = SEGMENTS.map((value) => ({ value, label: SEGMENT_LABELS[value] })); const featureOptions = FEATURES.map((value) => ({ value, label: FEATURE_LABELS[value] })); const churnOptions = CHURN_DRIVERS.map((value) => ({ value, label: CHURN_LABELS[value] })); const channelOptions = CHANNELS.map((value) => ({ value, label: CHANNEL_LABELS[value] })); const priceOptions = [25,49,99,149,299,499,799,1199,1799].map((value) => ({ value: String(value), label: `$${value}/month` }));
  return <div className="panel-stack"><p className="panel-intro">Evidence is noisy. Committing a belief costs attention and makes the rest of the company behave as if it is true.</p><section className="belief-list"><BeliefCommit label="Buyer" beliefKey="buyer" value={game.beliefs.buyer.value} options={segmentOptions} game={game}/><BeliefCommit label="Price" beliefKey="price" value={String(game.beliefs.price.value)} options={priceOptions} game={game}/><BeliefCommit label="Wedge" beliefKey="wedge" value={game.beliefs.wedge.value} options={featureOptions} game={game}/><BeliefCommit label="Churn cause" beliefKey="churnCause" value={game.beliefs.churnCause.value} options={churnOptions} game={game}/><BeliefCommit label="Channel" beliefKey="channel" value={game.beliefs.channel.value} options={channelOptions} game={game}/></section><div className="section-title"><span className="eyebrow">EVIDENCE LOG</span><h3>{game.evidence.length ? `${game.evidence.length} cards, ${game.evidence.filter((card)=>!card.read).length} unread` : "You have not talked to anyone yet."}</h3>{game.evidence.length ? <button className="text-button" onClick={markRead}>Mark all read</button> : <p>That is the most expensive thing on this list.</p>}</div><div className="evidence-grid">{[...game.evidence].reverse().map((card) => <article key={card.id} className={!card.read ? "evidence-card unread" : "evidence-card"}><span>W{card.week} · {card.dimension}</span><strong>{card.suggests}</strong><blockquote>“{card.quote}”</blockquote><small>{card.source} · strength {card.strength}/5</small></article>)}</div><div className="section-title"><span className="eyebrow">RESEARCH</span><h3>Buy a less convenient answer</h3></div><ActionList game={game} group="notebook"/></div>;
}
