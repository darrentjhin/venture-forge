import { motion } from "framer-motion";
import { EMERGENCY_LOAN_AMOUNT, lowerWorkspace } from "../engine/crisis";
import type { GameState } from "../engine/types";
import { useGame } from "../store/useGame";

export function CrisisCard({ game }: { game: GameState }) {
  const resolveCrisis = useGame((store) => store.resolveCrisis);
  const cofounder = game.people.find((person) => person.isCofounder)?.name ?? "Your cofounder";
  const lower = lowerWorkspace(game.workspace);
  return <motion.div className="modal-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <motion.section className="crisis-dialog" role="dialog" aria-modal="true" aria-label="Cash crisis" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <span className="eyebrow">Message from {cofounder}</span>
      <h2>“We cannot make payroll like this.”</h2>
      <p>The bank balance is ${Math.abs(Math.round(game.cash)).toLocaleString()} below zero. Pick the least-bad way through this week.</p>
      <div className="crisis-options">
        <div className="crisis-option">
          <strong>Lay someone off</strong><span>Payroll falls. Everyone left loses 35 morale.</span>
          <div className="chips">{game.people.map((person) => <button className="chip" key={person.id} onClick={() => resolveCrisis("layoff", person.id)}>{person.name}</button>)}</div>
        </div>
        <button className="event-choice" onClick={() => resolveCrisis("loan")}>
          <strong>Take the emergency loan</strong><span>+${EMERGENCY_LOAN_AMOUNT.toLocaleString()} now · 18% weekly interest · reputation −8</span>
        </button>
        <button className="event-choice" disabled={!lower} onClick={() => resolveCrisis("sellOffice")}>
          <strong>Sell the office</strong><span>{lower ? `Move down to ${lower} and recover the deposit.` : "There is no smaller room to sell."}</span>
        </button>
      </div>
      <small>If the balance is still negative after next week, this company closes—but your career continues.</small>
    </motion.section>
  </motion.div>;
}
