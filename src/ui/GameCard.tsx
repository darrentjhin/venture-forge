import { motion } from "framer-motion";
import type { GameCard as GameCardData } from "../engine/types";
import { useGame } from "../store/useGame";

export function GameCard({ card }: { card: GameCardData }) {
  const dismiss = useGame((store) => store.dismissCard);
  return <motion.aside className={`game-card game-card-${card.kind}`} initial={{ opacity: 0, y: 18, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 24 }}>
    <span className="game-card-icon" aria-hidden="true">{card.icon}</span>
    <div><small>{card.kind === "quarter" ? "Quarter closed" : card.kind === "restart" ? "A new beginning" : "Milestone"} · week {card.week}</small><strong>{card.title}</strong><p>{card.body}</p></div>
    <button onClick={dismiss} aria-label="Dismiss card">×</button>
  </motion.aside>;
}
