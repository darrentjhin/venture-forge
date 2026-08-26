import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { setDread } from "./audio/sfx";
import { selectRunwayMood } from "./engine/selectors";
import { Room } from "./scene/Room";
import { useGame } from "./store/useGame";
import { Help } from "./ui/Help";
import { Hud } from "./ui/Hud";
import { Panel } from "./ui/Panel";
import { PostMortem } from "./ui/PostMortem";
import { Title } from "./ui/Title";
import { WeekReport } from "./ui/WeekReport";

export function App() {
  const screen = useGame((store) => store.screen);
  const game = useGame((store) => store.game);
  const panel = useGame((store) => store.panel);
  const reportOpen = useGame((store) => store.reportOpen);
  const helpOpen = useGame((store) => store.helpOpen);
  const muted = useGame((store) => store.muted);
  const openPanel = useGame((store) => store.openPanel);
  const toggleHelp = useGame((store) => store.toggleHelp);

  const mood = game ? selectRunwayMood(game) : 0;
  useEffect(() => { setDread(screen === "game" ? mood : 0, muted); }, [mood, muted, screen]);

  useEffect(() => {
    if (screen !== "game") return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { openPanel(null); return; }
      if (event.key === "?" || (event.key === "/" && event.shiftKey)) { event.preventDefault(); toggleHelp(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, openPanel, toggleHelp]);

  if (screen === "title" || !game) return <Title/>;
  if (screen === "postmortem" && game.postMortem) return <PostMortem game={game} postMortem={game.postMortem}/>;

  return <div className="game-shell">
    <Hud game={game}/>
    <Room state={game} onOpen={openPanel}/>
    <AnimatePresence>{panel && <Panel key={panel} id={panel} game={game}/>}</AnimatePresence>
    <AnimatePresence>{reportOpen && <WeekReport key="report" game={game}/>}</AnimatePresence>
    <AnimatePresence>{helpOpen && <Help key="help"/>}</AnimatePresence>
  </div>;
}
