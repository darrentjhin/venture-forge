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
        <h3>Start with the phone</h3>
        <p>
          Open the phone on your desk, choose Tasks, and assign work to a person. Their strongest skills finish that work faster.
          Putting someone on several tasks splits their week and eventually burns them out.
        </p>

        <h3>Focus is the real currency</h3>
        <p>
          You get {BALANCE.baseFocus} Focus a week. Interviews, building, selling, hiring, and committing a belief all cost
          Focus. Cash buys some things, but Focus is what you never have enough of.
        </p>

        <h3>Customer notes disagree sometimes</h3>
        <p>
          A single conversation is noisy. Assign research work, read the notebook, and look for the sentence that keeps repeating.
          Shipping work based on a real finding is what moves the Fit meter on the monitor.
        </p>

        <h3>Fit drives the economy</h3>
        <p>
          Better Fit brings more customers and keeps them longer. The monitor shows one score; customer messages tell you why it moved.
        </p>

        <h3>Your story versus your proof</h3>
        <p>
          A strong story opens funding doors. Proof is what customers actually did. When the story runs too far ahead,
          investors and employees eventually notice.
        </p>

        <h3>Ending the week</h3>
        <p>
          Revenue lands, customers churn, payroll and rent leave, and consequences of old decisions arrive in the inbox.
          You cannot skip a pending decision. Week {BALANCE.totalWeeks} closes the old two-year benchmark, but the career keeps moving.
          If cash stays negative for two weeks, this company closes and the next one begins in a small room.
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
