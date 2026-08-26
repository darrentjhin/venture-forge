import { useMemo, useState } from "react";
import { playSfx, setMusic } from "../audio/sfx";
import { BALANCE } from "../data/balance";
import { newRun } from "../engine/init";
import { OfficeView } from "../scene/OfficeView";
import { useGame } from "../store/useGame";

export function dailySeed(date = new Date()): number {
  return Number(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`);
}

export function Title() {
  const start = useGame((store) => store.start);
  const continueRun = useGame((store) => store.continueRun);
  const saved = useGame((store) => store.game);
  const muted = useGame((store) => store.muted);
  const toggleMuted = useGame((store) => store.toggleMuted);
  const musicEnabled = useGame((store) => store.musicEnabled);
  const toggleMusic = useGame((store) => store.toggleMusic);
  const [seed, setSeed] = useState("");
  const [newOpen, setNewOpen] = useState(!saved);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const today = dailySeed();
  const preview = useMemo(() => saved ?? newRun(today), [saved, today]);
  const parsed = seed.trim() ? Number(seed.trim().replace(/\D/g, "")) : 0;

  function begin(value: number) {
    playSfx("commit", muted);
    start(value >>> 0 || Math.floor(Math.random() * 2_147_483_647));
  }

  const year = Math.floor((preview.week - 1) / 52) + 1;
  const week = ((preview.week - 1) % 52) + 1;

  return <main className="home-shell">
    <div className="home-office" aria-hidden="true">
      <OfficeView state={preview} moodOverride={0} onOpen={() => undefined} onHoverPerson={() => undefined} onCoffee={() => undefined}/>
    </div>
    <div className="home-golden"/>

    <section className="home-content" aria-label="Venture Forge home">
      <header className="home-logo"><span>V</span><div><small>DESK &amp; COMPANY</small><h1>VENTURE<br/>FORGE</h1></div></header>
      <p className="home-tagline">Build the company by walking the room. If it breaks, return to the desk and build the next one.</p>

      {saved && <button className="save-card" onClick={() => { playSfx("click", muted); continueRun(); }}>
        <span className="save-play">▶</span>
        <div><small>Continue</small><strong>Company {saved.companyNumber}</strong><p>Y{year} W{week} · ${Math.round(saved.mrr).toLocaleString()} monthly · {saved.people.length + 1} people</p></div>
        <b>Back to the office →</b>
      </button>}

      <div className="home-actions">
        <button onClick={() => { setNewOpen((open) => !open); setSettingsOpen(false); }}>＋ New company</button>
        <button onClick={() => { setSettingsOpen((open) => !open); setNewOpen(false); }}>⚙ Settings</button>
      </div>

      {newOpen && <div className="home-drawer">
        <label htmlFor="seed">Company seed <span>optional · same seed, same market</span></label>
        <div><input id="seed" inputMode="numeric" placeholder="random" value={seed} onChange={(event) => setSeed(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") begin(parsed); }}/><button onClick={() => begin(parsed)}>{parsed ? `Start ${parsed}` : "Start company"}</button></div>
        <button className="daily-run" onClick={() => { setSeed(String(today)); begin(today); }}>Play today’s shared market · {today}</button>
      </div>}

      {settingsOpen && <div className="home-drawer settings-drawer">
        <button onClick={() => { playSfx("click", muted); toggleMuted(); }}><span>Sound effects</span><b>{muted ? "Off" : "On"}</b></button>
        <button onClick={() => { setMusic(!musicEnabled, muted); toggleMusic(); }}><span>Warm office music</span><b>{musicEnabled ? "On" : "Off"}</b></button>
        <p>Music stays off until you turn it on. The game saves on this device.</p>
      </div>}
    </section>

    <p className="home-foot">∞ CAREER · 52 WEEKS/YEAR · {BALANCE.baseFocus} FOUNDER ACTIONS/DAY · NO GAME OVER</p>
  </main>;
}
