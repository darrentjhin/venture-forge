import { playSfx } from "../audio/sfx";
import { selectRunway, selectRunwayDisplay } from "../engine/selectors";
import type { GameState } from "../engine/types";
import { useGame } from "../store/useGame";
import { NumberValue } from "./Number";

export function HUD({ game }: { game: GameState }) {
  const endWeek=useGame((s)=>s.endWeek), openPanel=useGame((s)=>s.openPanel), muted=useGame((s)=>s.muted), toggleMuted=useGame((s)=>s.toggleMuted), toggleHelp=useGame((s)=>s.toggleHelp), abandon=useGame((s)=>s.abandon);
  const runway=selectRunway(game), blocked=game.pendingEvents.length>0;
  return <header className="hud"><div className="brand"><i>V</i><span>VENTURE<br/>FORGE</span></div><div className="hud-four"><article><span>WEEK</span><strong><NumberValue value={game.week}/><small>/104</small></strong></article><article className={game.cash<5000?"danger":""}><span>CASH</span><strong><NumberValue value={Math.round(game.cash)} prefix="$"/></strong></article><article className={runway<12?"danger":""}><span>RUNWAY</span><strong>{selectRunwayDisplay(game)}</strong></article><article><span>FOCUS</span><strong><NumberValue value={game.focus}/></strong></article></div><div className="hud-controls"><button onClick={()=>{playSfx("click",muted);toggleMuted();}} aria-label={muted?"Unmute audio":"Mute audio"}>{muted?"SOUND OFF":"SOUND ON"}</button><button onClick={toggleHelp} aria-label="Open help">?</button><button onClick={abandon} aria-label="Return to title">↙</button><button className="end-week" onClick={()=>{if(blocked){playSfx("alert",muted);openPanel("inbox");}else{playSfx("week_tick",muted);endWeek();}}}>{blocked?`RESOLVE ${game.pendingEvents.length}`:`END WEEK · ${game.focus} LEFT`} <b>→</b></button></div></header>;
}
