import { playSfx } from "../audio/sfx";
import { ACTIONS } from "../data/actionDefs";
import type { ActionId, GameState, PanelId } from "../engine/types";
import { useGame } from "../store/useGame";

export function ActionList({ game, group, only, exclude }: { game: GameState; group: PanelId; only?: ActionId[]; exclude?: ActionId[] }) {
  const queueAction = useGame((store) => store.queueAction);
  const muted = useGame((store) => store.muted);

  const list = ACTIONS.filter((action) => action.group === group)
    .filter((action) => (only ? only.includes(action.id) : true))
    .filter((action) => (exclude ? !exclude.includes(action.id) : true));

  if (!list.length) return null;

  return <div className="actions">
    {list.map((action) => {
      const unlocked = action.availability(game);
      const affordable = game.focus >= action.focusCost && game.cash >= action.cashCost;
      const disabled = !unlocked || !affordable || Boolean(game.ending);
      const why = !unlocked ? "Not available yet" : game.focus < action.focusCost ? "Not enough Focus" : game.cash < action.cashCost ? "Not enough cash" : "";
      return <button key={action.id} className="action" disabled={disabled} title={why}
        onClick={() => { playSfx(action.cashCost > 0 ? "cash_out" : "click", muted); queueAction(action.id); }}>
        <span>
          <strong>{action.name}</strong>
          <span>{disabled && why ? `${why} · ${action.preview}` : action.preview}</span>
        </span>
        <span className="action-cost">
          <b>{action.focusCost} Focus</b>
          {action.cashCost > 0 && <i>${action.cashCost.toLocaleString()}</i>}
        </span>
      </button>;
    })}
  </div>;
}
