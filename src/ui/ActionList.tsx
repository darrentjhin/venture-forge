import { playSfx } from "../audio/sfx";
import { ACTIONS } from "../data/actionDefs";
import type { GameState, PanelId } from "../engine/types";
import { useGame } from "../store/useGame";

export function ActionList({ game, group }: { game: GameState; group: PanelId }) {
  const queueAction = useGame((store) => store.queueAction);
  const muted = useGame((store) => store.muted);
  const actions = ACTIONS.filter((action) => action.group === group);
  return <div className="action-list">
    {actions.map((action) => {
      const available = action.availability(game);
      const affordable = game.focus >= action.focusCost && game.cash >= action.cashCost;
      const queued = game.queuedActions.filter((item) => item.actionId === action.id).length;
      return <article className="action-card" key={action.id}>
        <div className="action-copy"><strong>{action.name}</strong><p>{action.preview}</p><small>{action.focusCost ? `${action.focusCost} Focus` : "No Focus now"}{action.cashCost ? ` · $${action.cashCost.toLocaleString()}` : ""}</small></div>
        <button disabled={!available || !affordable} onClick={() => { playSfx(action.cashCost ? "cash_out" : "click", muted); queueAction(action.id); }}>{queued ? `Queued ×${queued}` : !available ? "Unavailable" : "Queue"}</button>
      </article>;
    })}
  </div>;
}
