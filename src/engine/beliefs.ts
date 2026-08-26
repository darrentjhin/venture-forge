import type { BeliefKey, Beliefs, EvidenceCard, GameState, MarketTruth } from "./types";
import { cloneGameState } from "./clone";

export function priceFit(price: number, ceiling: number): number {
  const ratio = price / Math.max(1, ceiling);
  if (ratio >= .7 && ratio <= 1.15) return 1;
  if (ratio < .7) return Math.max(0, (ratio - .25) / .45);
  return Math.max(0, (2 - ratio) / .85);
}

export function alignmentFor(beliefs: Beliefs, truth: MarketTruth): number {
  const buyer = beliefs.buyer.value === truth.buyer ? 1 : beliefs.buyer.value === truth.secondaryBuyer ? .4 : 0;
  const wedge = beliefs.wedge.value === truth.wedgeFeature ? 1 : beliefs.wedge.value === truth.supportFeature ? .5 : 0;
  return .30 * buyer + .25 * wedge + .20 * priceFit(beliefs.price.value, truth.willingnessToPay) + .15 * Number(beliefs.channel.value === truth.channel) + .10 * Number(beliefs.churnCause.value === truth.churnDriver);
}

export function evidenceScoreFor(state: Pick<GameState, "beliefs" | "truth" | "evidence">): number {
  const dimensions: BeliefKey[] = ["buyer", "price", "wedge", "churnCause", "channel"];
  const truthValues: Record<BeliefKey, string> = { buyer: state.truth.buyer, price: String(state.truth.willingnessToPay), wedge: state.truth.wedgeFeature, churnCause: state.truth.churnDriver, channel: state.truth.channel };
  const beliefValues: Record<BeliefKey, string> = { buyer: state.beliefs.buyer.value, price: String(state.beliefs.price.value), wedge: state.beliefs.wedge.value, churnCause: state.beliefs.churnCause.value, channel: state.beliefs.channel.value };
  let total = 0;
  for (const key of dimensions) {
    const cards = state.evidence.filter((card) => card.dimension === key && card.suggests === beliefValues[key]);
    const support = cards.reduce((sum, card) => sum + card.strength, 0);
    const correct = key === "price" ? priceFit(Number(beliefValues[key]), Number(truthValues[key])) : Number(beliefValues[key] === truthValues[key]);
    total += Math.min(20, support * 2) * correct;
  }
  return Math.round(total);
}

export function commitBelief(state: GameState, key: BeliefKey, value: string | number): GameState {
  if (state.focus < 1 || state.crisis.choiceRequired) return state;
  const next = cloneGameState(state);
  if (key === "buyer") next.beliefs.buyer = { value: value as Beliefs["buyer"]["value"], confidence: confidenceFor(next.evidence, key, String(value)), committedWeek: next.week };
  if (key === "price") next.beliefs.price = { value: Number(value), confidence: confidenceFor(next.evidence, key, String(value)), committedWeek: next.week };
  if (key === "wedge") next.beliefs.wedge = { value: value as Beliefs["wedge"]["value"], confidence: confidenceFor(next.evidence, key, String(value)), committedWeek: next.week };
  if (key === "churnCause") next.beliefs.churnCause = { value: value as Beliefs["churnCause"]["value"], confidence: confidenceFor(next.evidence, key, String(value)), committedWeek: next.week };
  if (key === "channel") next.beliefs.channel = { value: value as Beliefs["channel"]["value"], confidence: confidenceFor(next.evidence, key, String(value)), committedWeek: next.week };
  next.focus -= 1;
  next.conviction = Math.min(100, next.conviction + 6);
  next.decisionLog.push({ id: `belief-${next.week}-${key}-${next.decisionLog.length}`, week: next.week, type: "belief", detail: `Committed ${key} to ${String(value)}`, refId: key, impact: 6, alternate: "Wait for more evidence" });
  return next;
}

function confidenceFor(cards: EvidenceCard[], key: BeliefKey, value: string): number {
  return Math.min(100, 25 + cards.filter((card) => card.dimension === key && card.suggests === value).reduce((sum, card) => sum + card.strength * 8, 0));
}
