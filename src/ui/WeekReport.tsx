import { motion } from "framer-motion";
import { playSfx } from "../audio/sfx";
import { selectRunwayDisplay } from "../engine/selectors";
import { calendarLabel } from "../engine/calendar";
import type { GameState } from "../engine/types";
import { useGame } from "../store/useGame";

export function WeekReport({ game }: { game: GameState }) {
  const closeReport = useGame((store) => store.closeReport);
  const openPanel = useGame((store) => store.openPanel);
  const muted = useGame((store) => store.muted);
  const report = game.weeklyReports[game.weeklyReports.length - 1];
  if (!report) return null;

  const positive = report.cashDelta >= 0;
  const net = report.newCustomers - report.churned;

  return <motion.div className="modal-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
    <motion.div className="report" role="dialog" aria-label={`Week ${report.week} report`}
      initial={{ opacity: 0, y: 22, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}>
      <header className="report-head">
        <span className="eyebrow">Week {report.week} closed</span>
        <h2>{positive ? "The company made money." : `You spent $${Math.abs(Math.round(report.cashDelta)).toLocaleString()} to stay alive.`}</h2>
        <p>{selectRunwayDisplay(game)} of runway left · ${Math.round(game.cash).toLocaleString()} in the bank</p>
      </header>

      <div className="report-body">
        <div className="report-grid">
          <div className="metric"><small>Revenue</small><strong>${Math.round(report.revenue).toLocaleString()}</strong></div>
          <div className="metric"><small>Burn</small><strong>${Math.round(report.burn).toLocaleString()}</strong></div>
          <div className={`metric ${positive ? "good" : "warn"}`}><small>Net</small><strong className={positive ? "delta-pos" : "delta-neg"}>{positive ? "+" : "−"}${Math.abs(Math.round(report.cashDelta)).toLocaleString()}</strong></div>
          <div className={`metric ${net < 0 ? "bad" : ""}`}><small>Customers</small><strong>{net >= 0 ? "+" : ""}{net}</strong></div>
        </div>

        {report.notes.length > 0
          ? <><span className="eyebrow" style={{ marginBottom: 10, display: "block" }}>What happened</span>
            <ul className="note-list">{report.notes.map((note, index) => <li key={index}>{note}</li>)}</ul></>
          : <div className="empty"><p>A quiet week. Nothing converted, nothing broke.</p></div>}

        {game.pendingEvents.length > 0 && <div className="event-card" style={{ marginTop: 18, marginBottom: 0 }}>
          <span className="event-cause">Waiting on you</span>
          <h3>{game.pendingEvents.length} decision{game.pendingEvents.length === 1 ? "" : "s"} arrived.</h3>
          <p style={{ marginBottom: 0 }}>You cannot end another week until these are resolved.</p>
        </div>}
      </div>

      <div className="report-foot">
        <button className="btn btn-primary" autoFocus onClick={() => {
          playSfx("click", muted);
          closeReport();
          if (game.pendingEvents.length > 0) openPanel("inbox");
        }}>
          {game.pendingEvents.length > 0 ? "Open the inbox" : game.crisis.choiceRequired ? "Answer your cofounder" : `Start ${calendarLabel(game.week)}`} <span aria-hidden="true">→</span>
        </button>
      </div>
    </motion.div>
  </motion.div>;
}
