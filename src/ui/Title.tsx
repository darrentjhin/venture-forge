import { useState } from "react";
import { playSfx } from "../audio/sfx";
import { BALANCE } from "../data/balance";
import { useGame } from "../store/useGame";

export function dailySeed(date = new Date()): number {
  return Number(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`);
}

export function Title() {
  const start = useGame((store) => store.start);
  const continueRun = useGame((store) => store.continueRun);
  const saved = useGame((store) => store.game);
  const muted = useGame((store) => store.muted);
  const [seed, setSeed] = useState("");

  const parsed = seed.trim() ? Number(seed.trim().replace(/\D/g, "")) : 0;
  const today = dailySeed();

  function begin(value: number) {
    playSfx("commit", muted);
    start(value >>> 0 || Math.floor(Math.random() * 2_147_483_647));
  }

  return <div className="title-shell">
    <div className="title-grid"/>
    <div className="title-glow"/>
    <div className="title-inner">
      <div className="title-copy">
        <span className="eyebrow">A deterministic founder simulation</span>
        <h1>Build something<br/><em>that outlives</em><br/>the hype.</h1>
        <p>
          You start with ${BALANCE.startingCash.toLocaleString()}, a cofounder, and five beliefs about your market.
          Exactly one set of those beliefs is true. You have {BALANCE.totalWeeks} weeks and {BALANCE.baseFocus} units
          of attention a week to find out which — while the money runs down.
        </p>

        <div className="title-facts">
          <div className="title-fact"><strong>{BALANCE.totalWeeks}</strong><span>weeks</span></div>
          <div className="title-fact"><strong>${(BALANCE.startingCash / 1000).toFixed(0)}k</strong><span>starting cash</span></div>
          <div className="title-fact"><strong>5</strong><span>hidden truths</span></div>
          <div className="title-fact"><strong>8</strong><span>endings</span></div>
        </div>

        <div className="seed-row">
          <div className="seed-field">
            <label htmlFor="seed">Seed (optional)</label>
            <input id="seed" inputMode="numeric" placeholder="random" value={seed}
              onChange={(event) => setSeed(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") begin(parsed); }}/>
          </div>
          <button className="btn btn-ghost" onClick={() => { setSeed(String(today)); begin(today); }}>
            Play today’s seed
          </button>
        </div>

        <div className="title-actions">
          <button className="btn btn-amber" onClick={() => begin(parsed)}>
            {parsed ? `Start seed ${parsed}` : "Start a new career"} <span aria-hidden="true">→</span>
          </button>
          {saved && <button className="btn btn-ghost" onClick={() => { playSfx("click", muted); continueRun(); }}>
            Continue week {saved.week}
          </button>}
        </div>
        <p className="seed-hint">Same seed, same market. Share one to compare runs against the identical hidden truth.</p>
      </div>

      <div className="title-vignette">
        <div className="title-card">
          <h3>The loop</h3>
          <p>Every week you spend attention, the market answers slowly, and the answer is sometimes a lie.</p>
          <ul>
            <li><b>01</b><span><strong>Gather.</strong> Interviews and tests produce evidence cards. Some are misleading.</span></li>
            <li><b>02</b><span><strong>Commit.</strong> Turn evidence into a belief. Beliefs drive conversion and churn.</span></li>
            <li><b>03</b><span><strong>Build &amp; sell.</strong> Ship the wedge, price it, fill the pipeline.</span></li>
            <li><b>04</b><span><strong>End the week.</strong> Revenue lands, customers churn, consequences arrive.</span></li>
          </ul>
        </div>
      </div>
    </div>
    <p className="title-foot">VENTURE FORGE · PHASE 1 · DETERMINISTIC · NO MICROTRANSACTIONS</p>
  </div>;
}
