import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { setDread } from "./audio/sfx";
import { selectRunwayMood } from "./engine/selectors";
import { Room } from "./scene/Room";
import { useGame } from "./store/useGame";
import { Help } from "./ui/Help";
import { Hud } from "./ui/Hud";
import { Panel } from "./ui/Panel";
import { Title } from "./ui/Title";
import { WeekReport } from "./ui/WeekReport";
import { CrisisCard } from "./ui/CrisisCard";
import { GameCard } from "./ui/GameCard";
import type { PanelId } from "./engine/types";

const PANEL_KEYS: Record<string, PanelId> = { "1": "metrics", "2": "notebook", "3": "inbox", "4": "roadmap", "5": "team", "6": "capital" };

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
      const destination = PANEL_KEYS[event.key];
      if (destination) { openPanel(destination); return; }
      if (event.key === "?" || (event.key === "/" && event.shiftKey)) { event.preventDefault(); toggleHelp(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, openPanel, toggleHelp]);

  if (screen === "title" || !game) return <Title/>;
  return <div className="game-shell">
    <Hud game={game}/>
    <Room state={game} onOpen={openPanel}/>
    <AnimatePresence>{panel && <Panel key={panel} id={panel} game={game}/>}</AnimatePresence>
    <AnimatePresence>{reportOpen && <WeekReport key="report" game={game}/>}</AnimatePresence>
    <AnimatePresence>{!reportOpen && game.crisis.choiceRequired && <CrisisCard key="crisis" game={game}/>}</AnimatePresence>
    <AnimatePresence>{!reportOpen && !game.crisis.choiceRequired && game.cards[0] && <GameCard key={game.cards[0].id} card={game.cards[0]}/>}</AnimatePresence>
    <AnimatePresence>{helpOpen && <Help key="help"/>}</AnimatePresence>
  </div>;
}
