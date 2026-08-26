import { motion } from "framer-motion";
import { BALANCE } from "../data/balance";
import { useGame } from "../store/useGame";

export function Help() {
  const toggleHelp = useGame((store) => store.toggleHelp);

  return <motion.div className="modal-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }} onClick={toggleHelp}>
    <motion.div className="report" role="dialog" aria-label="How to play"
      initial={{ opacity: 0, y: 20, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }} onClick={(event) => event.stopPropagation()}>
      <header className="report-head">
        <span className="eyebrow">How this works</span>
        <h2>You are wrong about something.</h2>
        <p>The only question is whether you find out before the money does.</p>
      </header>
      <div className="report-body help-body">
        <h3>The hidden truth</h3>
        <p>
          Every seed generates a market with one correct answer for each of five dimensions: <strong>buyer</strong>,
          <strong> wedge</strong>, <strong>price</strong>, <strong>channel</strong>, and <strong>churn cause</strong>.
          You start holding the wrong hypothesis on most of them, at moderate confidence. Nothing tells you which.
        </p>

        <h3>Focus is the real currency</h3>
        <p>
          You get {BALANCE.baseFocus} Focus a week. Interviews, building, selling, hiring, and committing a belief all cost
          Focus. Cash buys some things, but Focus is what you never have enough of.
        </p>

        <h3>Evidence lies sometimes</h3>
        <p>
          Interviews produce evidence cards pointing at a value with a <strong>strength</strong>. A single interview is noisy —
          roughly a quarter of them mislead. Sprints, landing pages, win/loss reviews and churn autopsies are more expensive
          and more honest. The number on a chip in the notebook is the total evidence weight behind that option.
        </p>

        <h3>Beliefs drive the economy</h3>
        <p>
          Your committed beliefs — not the truth — determine who converts, at what rate, and how fast they churn.
          Being right on buyer and wedge matters most. Being right quietly beats being confident loudly.
        </p>

        <h3>Conviction versus evidence</h3>
        <p>
          Conviction opens funding doors. Evidence is what you can actually prove. When conviction runs ahead of evidence,
          the gap accrues as <strong>overclaim</strong> — and the post-mortem grades you on it.
        </p>

        <h3>Ending the week</h3>
        <p>
          Revenue lands, customers churn, payroll and rent leave, and consequences of old decisions arrive in the inbox.
          You cannot skip a pending decision. The run ends at week {BALANCE.totalWeeks}, at zero cash, when the team empties,
          or when nobody believes you any more.
        </p>

        <h3>Keys</h3>
        <p><span className="kbd">Esc</span> closes a panel · <span className="kbd">?</span> opens this.</p>
      </div>
      <div className="report-foot">
        <button className="btn btn-primary" onClick={toggleHelp}>Back to it</button>
      </div>
    </motion.div>
  </motion.div>;
}
