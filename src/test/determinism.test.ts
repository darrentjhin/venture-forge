import { describe, expect, it, vi } from "vitest";
import { queueAction } from "../engine/actions";
import { commitBelief } from "../engine/beliefs";
import { resolveEvent } from "../engine/events";
import { newRun } from "../engine/init";
import type { ActionId, GameState } from "../engine/types";
import { advanceWeek } from "../engine/week";

function scripted(seed: number): GameState {
  let state = newRun(seed);
  const weeks: ActionId[][] = [["angel", "interview"], ["interviewSprint"], ["ship", "coldOutreach"], ["landingPage", "salesCall"], ["harden", "content"], ["weekend", "teardown"]];
  for (const actions of weeks) {
    for (const action of actions) state = queueAction(state, action);
    state = advanceWeek(state);
    while (state.pendingEvents.length) {
      const event = state.pendingEvents[0];
      const choice = event.choices.find((item) => state.focus >= item.focusCost && state.cash >= item.cashCost);
      if (!choice) break;
      state = resolveEvent(state, event.id, choice.id);
    }
    const buyerCard = [...state.evidence].reverse().find((card) => card.dimension === "buyer");
    if (buyerCard && state.focus > 0) state = commitBelief(state, "buyer", buyerCard.suggests);
    if (state.ending) break;
  }
  return state;
}

describe("deterministic simulation", () => {
  it("produces byte-identical state for the same seed and actions", () => {
    expect(scripted(90421)).toEqual(scripted(90421));
  });

  it("never calls Math.random during a simulation run", () => {
    const spy = vi.spyOn(Math, "random").mockImplementation(() => { throw new Error("Math.random is forbidden"); });
    expect(() => scripted(77)).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
