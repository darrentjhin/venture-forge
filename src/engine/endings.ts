import { ALIGNMENT_KEYS, evidenceWinnerByWeek } from "./postmortemSupport";
import { alignmentFor } from "./beliefs";
import { selectBurn, selectWeeklyRevenue } from "./selectors";
import type { Decision, EndingId, GameState, PostMortem } from "./types";

export function evaluateEnding(state: GameState): EndingId | null {
  if (state.acceptedAcquisition) return "acquisition";
  if (state.raisedSeriesA && state.valuation > 12_000_000 && state.churnedCustomers < Math.max(4, state.totalCustomersWon * .35)) return "series-a";
  if (state.cash < 0) return "cash";
  const cofounderGone = !state.people.some((person) => person.isCofounder);
  if (cofounderGone && state.formerPeople.length >= Math.max(1, Math.ceil((state.people.length + state.formerPeople.length) / 2))) return "team";
  if (state.reputation < 10) return "reputation";
  if (state.week < 104) return null;
  const alignment = alignmentFor(state.beliefs, state.truth);
  const profitable = selectWeeklyRevenue(state) > selectBurn(state);
  const quarterAgo = [...state.history].reverse().find((point) => point.week <= state.week - 13)?.mrr ?? 0;
  const growing = state.mrr > quarterAgo;
  const morale = state.people.length ? state.people.reduce((sum, person) => sum + person.morale, 0) / state.people.length : 0;
  const externallyFinanced = state.outsideCapital > 0 || state.decisionLog.some((decision) => decision.type === "bridge" || decision.type === "revenueFinance");
  if (profitable && state.people.length + 1 < 12 && morale >= 75 && !externallyFinanced) return "built-to-last";
  if (profitable && growing && alignment > .65) return "alive";
  return "searching";
}

const ENDING_TITLES: Record<EndingId, string> = {
  alive: "You made it through week 104.", acquisition: "The company was acquired.", "series-a": "The Series A closed.", "built-to-last": "You built it to last.", cash: "The bank account reached zero.", team: "The room emptied before the market answered.", reputation: "Nobody believed the next promise.", searching: "Week 104 arrived while the company was still searching.",
};

function counterfactual(state: GameState): string {
  const biggest = [...state.decisionLog].sort((a, b) => b.impact - a.impact)[0];
  if (!biggest) return "There was no single branch large enough to dominate the run.";
  const remaining = Math.max(1, 104 - biggest.week);
  const weeklySwing = Math.round((biggest.impact * (state.mrr + 1000)) / 24);
  const alternateCash = Math.round(state.cash + weeklySwing * Math.min(12, remaining));
  return `Re-running the economic tail from week ${biggest.week} without “${biggest.detail}” moves the 12-week cash outcome by about $${Math.abs(alternateCash - state.cash).toLocaleString()}. The alternate branch was “${biggest.alternate ?? "wait"}.”`;
}

function couldKnow(state: GameState): { week: number | null; text: string } {
  for (let week = 1; week <= state.week; week += 1) {
    for (const key of ALIGNMENT_KEYS) {
      const result = evidenceWinnerByWeek(state, key, week);
      if (result.correct > result.committed && result.correct > 0) {
        const committedWeek = state.beliefs[key].committedWeek;
        return { week, text: `By week ${week} your notebook contained stronger evidence for ${result.truthLabel} than for ${result.committedLabel}. You committed the competing hypothesis in week ${committedWeek}.` };
      }
    }
  }
  return { week: null, text: "The notebook never held a clean answer. The run turned on how you acted under ambiguity." };
}

function gradeFor(state: GameState, ending: EndingId): string {
  if (["built-to-last", "series-a"].includes(ending)) return "A";
  if (["alive", "acquisition"].includes(ending)) return "B";
  const alignment = alignmentFor(state.beliefs, state.truth);
  if (alignment >= .55) return "C";
  if (state.week >= 40) return "D";
  return "F";
}

export function buildPostMortem(state: GameState, ending: EndingId): PostMortem {
  const know = couldKnow(state);
  const grade = gradeFor(state, ending);
  const feedback = state.overclaim > 25 ? "You sold certainty faster than the company could manufacture evidence." : know.week ? "The useful evidence arrived before the decision changed." : "You kept the company alive, but the market stayed unresolved.";
  return { ending, title: ENDING_TITLES[ending], grade, feedback, couldKnowWeek: know.week, couldKnowText: know.text, counterfactual: counterfactual(state), shareText: `VENTURE FORGE — Seed ${state.seed}\n${ENDING_TITLES[ending]}\nWeek ${state.week} · $${Math.round(state.mrr).toLocaleString()} MRR · ${state.customers.length} customers\nGrade ${grade}: ${feedback}` };
}

export function fiveBiggestDecisions(decisions: Decision[]): Decision[] { return [...decisions].sort((a, b) => b.impact - a.impact).slice(0, 5).sort((a, b) => a.week - b.week); }
