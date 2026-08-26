import { describe, expect, it } from "vitest";
import { ACTIONS } from "../data/actionDefs";
import { queueAction } from "../engine/actions";
import { commitBelief } from "../engine/beliefs";
import { resolveEvent } from "../engine/events";
import { newRun } from "../engine/init";
import { randomInt } from "../engine/rng";
import type { ActionDef, BeliefKey, GameState } from "../engine/types";
import { advanceWeek } from "../engine/week";
import { evaluateEnding } from "../engine/endings";

type Policy = "random" | "greedy" | "research";
const WINS = new Set(["alive", "acquisition", "series-a", "built-to-last"]);

function bestSuggestion(state: GameState, key: BeliefKey): string | null {
  const scores = new Map<string, number>();
  state.evidence.filter((card) => card.dimension === key).forEach((card) => scores.set(card.suggests, (scores.get(card.suggests) ?? 0) + card.strength));
  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

function resolveAll(state: GameState): GameState {
  let next = state;
  while (next.pendingEvents.length) {
    const event = next.pendingEvents[0];
    const choice = event.choices[0];
    if (!choice) break;
    next = resolveEvent(next, event.id, choice.id);
  }
  return next;
}

function pickAction(state: GameState, policy: Policy, roll: number): ActionDef | undefined {
  const available = ACTIONS.filter((action) => action.availability(state) && state.focus >= action.focusCost && state.cash >= action.cashCost && action.id !== "allNighter");
  if (state.week <= 2 && state.cash < 25_000) return available.find((action) => action.id === "bridge");
  if (policy === "research") {
    if (state.evidence.length < 20) return available.find((action) => action.id === "interviewSprint") ?? available.find((action) => action.id === "interview");
    if (state.shippedFeatures.length < 1) return available.find((action) => action.id === "ship");
    return available.find((action) => action.id === "salesCall") ?? available.find((action) => action.id === "content") ?? available[0];
  }
  if (policy === "greedy") return available.find((action) => action.id === "paidAds") ?? available.find((action) => action.id === "salesCall") ?? available.find((action) => action.id === "coldOutreach") ?? available.find((action) => action.id === "rewritePitch") ?? available[0];
  return available[roll % Math.max(1, available.length)];
}

function play(seed: number, policy: Policy): GameState {
  let state = newRun(seed); let policyRng = seed ^ 0xa5a5a5a5;
  while (state.companyNumber === 1 && !state.crisis.choiceRequired && state.week <= 104) {
    state = resolveAll(state);
    if (policy === "research" && state.evidence.length) {
      for (const key of ["price", "buyer", "wedge", "churnCause", "channel"] as BeliefKey[]) {
        const suggestion = bestSuggestion(state, key);
        const current = String(state.beliefs[key].value);
        if (suggestion !== null && suggestion !== current && state.focus > 0 && state.week % 4 === 0) state = commitBelief(state, key, key === "price" ? Number(suggestion) : suggestion);
      }
      state.selectedFeature = state.beliefs.wedge.value;
      state.price = state.beliefs.price.value;
    }
    for (let attempt = 0; attempt < 2 && state.focus > 0; attempt += 1) {
      const roll = randomInt(policyRng, 0, 10000); policyRng = roll.state;
      const action = pickAction(state, policy, roll.value);
      if (!action) break;
      const queued = queueAction(state, action.id);
      if (queued === state) break;
      state = queued;
    }
    state = advanceWeek(state);
    assertFiniteState(state);
  }
  return state;
}

function assertFiniteState(state: GameState) {
  const visit = (value: unknown, key = "root") => {
    if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error(`${key} must be finite`); return; }
    if (Array.isArray(value)) value.forEach((item, index) => visit(item, `${key}[${index}]`));
    else if (value && typeof value === "object") Object.entries(value).forEach(([childKey, child]) => visit(child, `${key}.${childKey}`));
  };
  visit(state);
  if (state.customers.length < 0) throw new Error("customer count cannot be negative");
  if (state.week > 105) throw new Error("benchmark exceeded its year-one horizon");
}

describe("2,000-run balance simulation", () => {
  it("stays finite and rewards research over premature growth", () => {
    const counts: Record<Policy, { runs: number; wins: number }> = { random: { runs: 0, wins: 0 }, greedy: { runs: 0, wins: 0 }, research: { runs: 0, wins: 0 } };
    for (let index = 0; index < 2000; index += 1) {
      const policy: Policy = index % 3 === 0 ? "random" : index % 3 === 1 ? "greedy" : "research";
      const result = play(1000 + index * 17, policy);
      counts[policy].runs += 1;
      const benchmarkEnding = result.companyNumber > 1 || result.crisis.choiceRequired ? "cash" : evaluateEnding({ ...result, week: 104 });
      if (benchmarkEnding && WINS.has(benchmarkEnding)) counts[policy].wins += 1;
    }
    const totalWins = counts.random.wins + counts.greedy.wins + counts.research.wins;
    const overall = totalWins / 2000;
    const greedy = counts.greedy.wins / counts.greedy.runs;
    const research = counts.research.wins / counts.research.runs;
    expect(overall).toBeGreaterThanOrEqual(.15);
    expect(overall).toBeLessThanOrEqual(.45);
    expect(research - greedy).toBeGreaterThanOrEqual(.08);
  }, 120_000);
});
