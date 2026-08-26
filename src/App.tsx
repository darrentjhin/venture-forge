import { useEffect } from "react";
import { playSfx, setDread } from "./audio/sfx";
import { selectRunwayMood } from "./engine/selectors";
import type { PanelId } from "./engine/types";
import { Room } from "./scene/Room";
import { useGame } from "./store/useGame";
import { ActionBar } from "./ui/ActionBar";
import { Help } from "./ui/Help";
import { HUD } from "./ui/HUD";
import { Panel } from "./ui/Panel";
import { PostMortem } from "./ui/PostMortem";
import { TitleScreen } from "./ui/TitleScreen";
import { WeekResolve } from "./ui/WeekResolve";
import { CapitalPanel } from "./ui/panels/CapitalPanel";
import { InboxPanel } from "./ui/panels/InboxPanel";
import { MetricsPanel } from "./ui/panels/MetricsPanel";
import { NotebookPanel } from "./ui/panels/NotebookPanel";
import { RoadmapPanel } from "./ui/panels/RoadmapPanel";
import { TeamPanel } from "./ui/panels/TeamPanel";

function panelContent(panel: PanelId, game: NonNullable<ReturnType<typeof useGame.getState>["game"]>) {
  if(panel==="metrics")return <MetricsPanel game={game}/>;
  if(panel==="notebook")return <NotebookPanel game={game}/>;
  if(panel==="inbox")return <InboxPanel game={game}/>;
  if(panel==="roadmap")return <RoadmapPanel game={game}/>;
  if(panel==="team")return <TeamPanel game={game}/>;
  return <CapitalPanel game={game}/>;
}

export default function App(){const game=useGame((s)=>s.game),screen=useGame((s)=>s.screen),panel=useGame((s)=>s.panel),openPanel=useGame((s)=>s.openPanel),endWeek=useGame((s)=>s.endWeek),toggleHelp=useGame((s)=>s.toggleHelp),muted=useGame((s)=>s.muted);useEffect(()=>{if(game)setDread(selectRunwayMood(game),muted);},[game,muted]);useEffect(()=>{const handler=(event:KeyboardEvent)=>{const target=event.target as HTMLElement|null;if(target&&["INPUT","SELECT","TEXTAREA"].includes(target.tagName))return;if(event.key==="Escape")openPanel(null);if(event.key==="?")toggleHelp();if(event.key===" "&&game&&!game.ending){event.preventDefault();if(game.pendingEvents.length)openPanel("inbox");else{playSfx("week_tick",muted);endWeek();}}const map:Record<string,PanelId>={"1":"metrics","2":"notebook","3":"inbox","4":"roadmap","5":"team","6":"capital"};if(map[event.key])openPanel(map[event.key]);};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);},[endWeek,game,muted,openPanel,toggleHelp]);if(screen==="title"||!game)return <TitleScreen/>;if(screen==="postmortem"||game.ending)return <PostMortem game={game}/>;return <main className="game-shell"><HUD game={game}/><Room state={game} onOpen={openPanel}/><ActionBar onOpen={openPanel}/><Panel id={panel} onClose={()=>openPanel(null)}>{panel?panelContent(panel,game):null}</Panel><WeekResolve game={game}/><Help/></main>;}
