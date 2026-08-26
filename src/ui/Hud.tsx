import { playSfx } from "../audio/sfx";
import { BALANCE } from "../data/balance";
import { calendarLabel } from "../engine/calendar";

// The room lights the week Monday to Friday; naming the day makes that read
// as the working week rather than an unexplained colour shift.
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];
import { selectBurn, selectRunway, selectRunwayDisplay, selectRunwayMood, selectWeeklyRevenue } from "../engine/selectors";
import type { GameState } from "../engine/types";
import { useGame } from "../store/useGame";
import { NumberValue } from "./Number";

const MAX_PIPS = 10;

function FocusPips({ focus, bonus }: { focus: number; bonus: number }) {
  // A large team can push Focus well past ten; past that a count reads better
  // than a row of pips that overflows the bar.
  const shown = Math.min(focus, MAX_PIPS);
  return <div className="focus-pips" aria-hidden="true">
    {Array.from({ length: Math.max(BALANCE.baseFocus, shown) }, (_, index) => (
      <i key={index} className={`focus-pip ${index < shown ? (index >= BALANCE.baseFocus ? "on bonus" : "on") : ""}`}/>
    ))}
    {focus > MAX_PIPS && <span className="focus-more">+{focus - MAX_PIPS}</span>}
    {bonus > 0 && <i className="focus-pip bonus" title={`+${bonus} next week`}/>}
  </div>;
}

export function Hud({ game }: { game: GameState }) {
  const endWeek = useGame((store) => store.endWeek);
  const toggleHelp = useGame((store) => store.toggleHelp);
  const toggleMuted = useGame((store) => store.toggleMuted);
  const abandon = useGame((store) => store.abandon);
  const openPanel = useGame((store) => store.openPanel);
  const muted = useGame((store) => store.muted);

  const mood = selectRunwayMood(game);
  const runway = selectRunway(game);
  const burn = selectBurn(game);
  const net = selectWeeklyRevenue(game) - burn;
  const mrrDelta = game.mrr - game.previousMrr;
  const blocked = game.pendingEvents.length > 0 || game.crisis.choiceRequired;

  const cashClass = game.cash < 5000 ? "is-bad" : game.cash < 15000 ? "is-warn" : "";
  const runwayClass = mood >= 4 ? "is-bad" : mood >= 3 ? "is-warn" : mood === 0 ? "is-good" : "";

  return <header className="hud">
    <div className="hud-brand">
      <span className="hud-mark" aria-hidden="true">V</span>
      <span>VENTURE<br/>FORGE</span>
    </div>

    <div className="hud-stats">
      <div className="stat"><small>Calendar</small><strong>{calendarLabel(game.week)}<span style={{ opacity: .45, fontSize: 11 }}> {DAY_NAMES[Math.min(4, Math.max(0, game.day - 1))]}</span></strong></div>
      <div className={`stat ${cashClass}`}><small>Cash</small><strong><NumberValue value={Math.round(game.cash)} prefix="$"/></strong></div>
      <div className="stat">
        <small>MRR</small>
        <strong>
          <NumberValue value={Math.round(game.mrr)} prefix="$"/>
          {mrrDelta !== 0 && game.week > 1 && <span className={`stat-delta ${mrrDelta > 0 ? "up" : "down"}`}>{mrrDelta > 0 ? "▲" : "▼"}{Math.abs(Math.round(mrrDelta)).toLocaleString()}</span>}
        </strong>
      </div>
      <div className="stat"><small>Customers</small><strong>{game.customers.length}</strong></div>
      <div className={`stat ${runwayClass}`}><small>Runway</small><strong>{selectRunwayDisplay(game)}</strong></div>
      <div className="stat"><small>Net / wk</small><strong style={{ color: net >= 0 ? "#7fd4c1" : undefined }}>{net >= 0 ? "+" : "−"}${Math.abs(Math.round(net)).toLocaleString()}</strong></div>
      <div className="stat"><small>Focus</small><FocusPips focus={game.focus} bonus={game.nextFocusBonus}/></div>
    </div>

    <div className="hud-actions">
      <button className="icon-btn" onClick={() => { playSfx("click", muted); toggleMuted(); }} aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute" : "Mute"}>{muted ? "🔇" : "🔊"}</button>
      <button className="icon-btn" onClick={toggleHelp} aria-label="How to play" title="How to play (?)">?</button>
      <button className="icon-btn" onClick={abandon} aria-label="Back to title" title="Back to title">⏻</button>
      <button
        className="end-week"
        disabled={game.crisis.choiceRequired}
        title={game.crisis.choiceRequired ? "Answer your cofounder first" : blocked ? "Resolve the events in your inbox first" : `Advance to ${calendarLabel(game.week + 1)}`}
        onClick={() => {
          if (game.crisis.choiceRequired) return;
          if (blocked) { playSfx("alert", muted); openPanel("inbox"); return; }
          playSfx("week_tick", muted);
          endWeek();
        }}
      >
        {game.crisis.choiceRequired ? "Cash crisis" : blocked ? "Resolve inbox" : "End week"} <b>{game.crisis.choiceRequired ? "!" : blocked ? `${game.pendingEvents.length}` : `${game.focus} left`}</b>
      </button>
    </div>
  </header>;
}
