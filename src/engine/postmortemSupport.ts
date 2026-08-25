import { CHANNEL_LABELS } from "../data/channels";
import { CHURN_LABELS } from "../data/churnDrivers";
import { FEATURE_LABELS } from "../data/features";
import { SEGMENT_LABELS } from "../data/segments";
import type { BeliefKey, GameState } from "./types";

export const ALIGNMENT_KEYS: BeliefKey[] = ["buyer", "price", "wedge", "churnCause", "channel"];

function labels(state: GameState, key: BeliefKey): { truth: string; committed: string; truthRaw: string; committedRaw: string } {
  if (key === "buyer") return { truth: SEGMENT_LABELS[state.truth.buyer], committed: SEGMENT_LABELS[state.beliefs.buyer.value], truthRaw: state.truth.buyer, committedRaw: state.beliefs.buyer.value };
  if (key === "price") return { truth: `$${state.truth.willingnessToPay}/mo`, committed: `$${state.beliefs.price.value}/mo`, truthRaw: String(Math.round(state.truth.willingnessToPay / 25) * 25), committedRaw: String(state.beliefs.price.value) };
  if (key === "wedge") return { truth: FEATURE_LABELS[state.truth.wedgeFeature], committed: FEATURE_LABELS[state.beliefs.wedge.value], truthRaw: state.truth.wedgeFeature, committedRaw: state.beliefs.wedge.value };
  if (key === "churnCause") return { truth: CHURN_LABELS[state.truth.churnDriver], committed: CHURN_LABELS[state.beliefs.churnCause.value], truthRaw: state.truth.churnDriver, committedRaw: state.beliefs.churnCause.value };
  return { truth: CHANNEL_LABELS[state.truth.channel], committed: CHANNEL_LABELS[state.beliefs.channel.value], truthRaw: state.truth.channel, committedRaw: state.beliefs.channel.value };
}

export function evidenceWinnerByWeek(state: GameState, key: BeliefKey, week: number) {
  const value = labels(state, key);
  const cards = state.evidence.filter((card) => card.dimension === key && card.week <= week);
  const strength = (raw: string) => cards.filter((card) => card.suggests === raw).reduce((sum, card) => sum + card.strength, 0);
  return { correct: strength(value.truthRaw), committed: strength(value.committedRaw), truthLabel: value.truth, committedLabel: value.committed };
}

export function beliefRevealRows(state: GameState) {
  return ALIGNMENT_KEYS.map((key) => { const value = labels(state, key); return { key, label: key === "churnCause" ? "Churn cause" : key.charAt(0).toUpperCase() + key.slice(1), believed: value.committed, truth: value.truth, correct: key === "price" ? Math.abs(state.beliefs.price.value - state.truth.willingnessToPay) / state.truth.willingnessToPay <= .3 : value.truthRaw === value.committedRaw }; });
}
