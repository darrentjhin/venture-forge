import { useState } from "react";
import { playSfx } from "../audio/sfx";
import { CHANNEL_LABELS } from "../data/channels";
import { CHURN_LABELS } from "../data/churnDrivers";
import { FEATURE_LABELS } from "../data/features";
import { SEGMENT_LABELS } from "../data/segments";
import { fiveBiggestDecisions } from "../engine/endings";
import type { GameState, PostMortem as PostMortemData } from "../engine/types";
import { useGame } from "../store/useGame";

function Verdict({ label, believed, actual }: { label: string; believed: string; actual: string }) {
  const right = believed === actual;
  return <li>
    <b>{right ? "✓" : "✗"}</b>
    <span>
      <strong style={{ color: right ? "#7fd4c1" : "#ff8b76" }}>{label}</strong> — you played <em>{believed}</em>.
      {right ? " That was true." : <> The market wanted <em style={{ color: "var(--amber)" }}>{actual}</em>.</>}
    </span>
  </li>;
}

export function PostMortem({ game, postMortem }: { game: GameState; postMortem: PostMortemData }) {
  const runAgain = useGame((store) => store.runAgain);
  const start = useGame((store) => store.start);
  const abandon = useGame((store) => store.abandon);
  const muted = useGame((store) => store.muted);
  const [copied, setCopied] = useState(false);

  const decisions = fiveBiggestDecisions(game.decisionLog);
  const truth = game.truth;
  const beliefs = game.beliefs;

  async function share() {
    playSfx("click", muted);
    try { await navigator.clipboard.writeText(postMortem.shareText); setCopied(true); setTimeout(() => setCopied(false), 2200); }
    catch { setCopied(false); }
  }

  return <div className="pm-shell">
    <div className="pm-inner">
      <div className="pm-grade" aria-label={`Grade ${postMortem.grade}`}>{postMortem.grade}</div>
      <span className="eyebrow" style={{ color: "var(--amber)", marginBottom: 12 }}>Week {game.week} · seed {game.seed}</span>
      <h1>{postMortem.title}</h1>
      <p className="pm-lede">{postMortem.feedback}</p>

      <div className="pm-stats">
        <div className="pm-stat"><small>MRR</small><strong>${Math.round(game.mrr).toLocaleString()}</strong></div>
        <div className="pm-stat"><small>Customers</small><strong>{game.customers.length}</strong></div>
        <div className="pm-stat"><small>Cash</small><strong>${Math.round(game.cash).toLocaleString()}</strong></div>
        <div className="pm-stat"><small>Team</small><strong>{game.people.length + 1}</strong></div>
        <div className="pm-stat"><small>Churned</small><strong>{game.churnedCustomers}</strong></div>
        <div className="pm-stat"><small>Overclaim</small><strong>{Math.round(game.overclaim)}</strong></div>
      </div>

      <div className="pm-block">
        <span className="eyebrow">What was actually true</span>
        <ul className="pm-timeline" style={{ marginTop: 4 }}>
          <Verdict label="Buyer" believed={SEGMENT_LABELS[beliefs.buyer.value]} actual={SEGMENT_LABELS[truth.buyer]}/>
          <Verdict label="Wedge" believed={FEATURE_LABELS[beliefs.wedge.value]} actual={FEATURE_LABELS[truth.wedgeFeature]}/>
          <Verdict label="Channel" believed={CHANNEL_LABELS[beliefs.channel.value]} actual={CHANNEL_LABELS[truth.channel]}/>
          <Verdict label="Churn cause" believed={CHURN_LABELS[beliefs.churnCause.value]} actual={CHURN_LABELS[truth.churnDriver]}/>
          <Verdict label="Price" believed={`$${beliefs.price.value}`} actual={`about $${truth.willingnessToPay}`}/>
        </ul>
      </div>

      <div className="pm-block">
        <span className="eyebrow">{postMortem.couldKnowWeek ? `You could have known in week ${postMortem.couldKnowWeek}` : "Could you have known?"}</span>
        <p>{postMortem.couldKnowText}</p>
      </div>

      <div className="pm-block">
        <span className="eyebrow">The counterfactual</span>
        <p>{postMortem.counterfactual}</p>
      </div>

      {decisions.length > 0 && <div className="pm-block">
        <span className="eyebrow">The five decisions that mattered most</span>
        <ul className="pm-timeline">
          {decisions.map((decision) => <li key={decision.id}>
            <b>W{decision.week}</b>
            <span>{decision.detail}{decision.alternate && <em style={{ color: "#7d7972" }}> · alternative: {decision.alternate}</em>}</span>
          </li>)}
        </ul>
      </div>}

      <div className="pm-actions">
        <button className="btn btn-amber" onClick={() => { playSfx("commit", muted); runAgain(); }}>Run seed {game.seed} again <span aria-hidden="true">→</span></button>
        <button className="btn btn-ghost" onClick={() => { playSfx("click", muted); start(Math.floor(Math.random() * 2_147_483_647)); }}>New market</button>
        <button className="btn btn-ghost" onClick={share}>{copied ? "Copied ✓" : "Copy result"}</button>
        <button className="btn btn-ghost" onClick={() => { playSfx("click", muted); abandon(); }}>Title screen</button>
      </div>
    </div>
  </div>;
}
