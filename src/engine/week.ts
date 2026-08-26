import { BALANCE } from "../data/balance";
import { FEATURES } from "../data/features";
import type { SegmentId } from "../data/segments";
import { applyQueuedActions } from "./actions";
import { alignmentFor, evidenceScoreFor } from "./beliefs";
import { churnRate, conversionRate, overclaimDelta, valuation, weeklyBurn } from "./economy";
import { closeQuarter } from "./calendar";
import { EMERGENCY_LOAN_WEEKLY_RATE, processCrisis } from "./crisis";
import { evaluateEvents } from "./events";
import { fireNextMilestone } from "./milestones";
import { computeFocus, updatePeople } from "./people";
import type { Customer, GameState, Workspace } from "./types";

function customerSegment(state: GameState, index: number, alignment: number): SegmentId {
  if (alignment >= .58) return index % 4 === 3 ? state.truth.secondaryBuyer : state.truth.buyer;
  return index % 5 === 4 ? state.truth.secondaryBuyer : state.beliefs.buyer.value;
}

function addCustomers(state: GameState, count: number, alignment: number): void {
  for (let index = 0; index < count; index += 1) {
    const serial = state.totalCustomersWon + index + 1;
    const segment = customerSegment(state, serial, alignment);
    const demandA = FEATURES[(serial + state.seed) % FEATURES.length];
    const demandB = serial % 3 === 0 ? state.truth.wedgeFeature : FEATURES[(serial + 3) % FEATURES.length];
    const customer: Customer = { id: `customer-${serial}`, name: ["Ridgeline Logistics", "Paper Kite Studio", "North Harbor Ops", "Common Thread Labs", "Vela Systems", "Morrow & Co.", "Fieldstone IT", "Signal House"][serial % 8] + ` ${serial}`, segment, mrr: state.price, demands: demandA === demandB ? [demandA] : [demandA, demandB], joinedWeek: state.week, champion: serial % 7 === 0 };
    state.customers.push(customer);
  }
  state.totalCustomersWon += count;
  state.closedDeals += count;
}

function workspaceFor(count: number, cap: Workspace | null): Workspace {
  const desired: Workspace = count <= 1 ? "apartment" : count <= 2 ? "kitchen" : count <= 5 ? "coworking" : count <= 12 ? "office" : count <= 25 ? "floor" : "hq";
  if (!cap) return desired;
  const tiers: Workspace[] = ["apartment", "kitchen", "coworking", "office", "floor", "hq"];
  return tiers[Math.min(tiers.indexOf(desired), tiers.indexOf(cap))];
}

export function advanceWeek(input: GameState): GameState {
  if (input.crisis.choiceRequired || input.pendingEvents.length > 0) return input;
  const applied = applyQueuedActions(input);
  const state = applied.state;
  const notes = [...applied.notes];

  state.focus = computeFocus(state);
  state.nextFocusBonus = state.nextFocusBonus > 0 ? 0 : Math.min(0, state.nextFocusBonus + 1);

  const alignment = alignmentFor(state.beliefs, state.truth);
  const rate = state.pivotWeeksRemaining > 0 ? 0 : conversionRate(state, alignment);
  const newCustomers = Math.max(0, Math.min(Math.floor(state.pipeline * rate), Math.floor(state.pipeline)));
  addCustomers(state, newCustomers, alignment);
  state.pipeline = Math.max(0, state.pipeline - newCustomers);
  if (newCustomers) notes.push(`${newCustomers} customer${newCustomers === 1 ? "" : "s"} converted from the active pipeline.`);

  state.previousMrr = state.mrr;
  state.mrr = state.customers.reduce((sum, customer) => sum + customer.mrr, 0);
  const weeklyRevenue = state.mrr / 4.33;

  const weeklyChurn = churnRate(state, alignment) * (state.pivotWeeksRemaining > 0 ? 1.6 : 1);
  state.churnPressure += state.customers.length * weeklyChurn;
  const churnCount = Math.min(state.customers.length, Math.floor(state.churnPressure));
  state.churnPressure -= churnCount;
  if (churnCount > 0) {
    const shipped = new Set(state.shippedFeatures);
    const ranked = [...state.customers].sort((a, b) => b.demands.filter((d) => !shipped.has(d)).length - a.demands.filter((d) => !shipped.has(d)).length || a.joinedWeek - b.joinedWeek);
    const leaving = new Set(ranked.slice(0, churnCount).map((customer) => customer.id));
    state.customers = state.customers.filter((customer) => !leaving.has(customer.id));
    state.churnedCustomers += churnCount;
    notes.push(`${churnCount} customer${churnCount === 1 ? "" : "s"} left. The weakest-fit accounts went first.`);
  }
  state.mrr = state.customers.reduce((sum, customer) => sum + customer.mrr, 0);

  const burn = weeklyBurn(state);
  const financingDrag = state.outsideCapital > 0 && state.mrr > 0 ? Math.min(state.mrr / 13, weeklyRevenue * .16) : 0;
  const emergencyInterest = state.emergencyLoanBalance * EMERGENCY_LOAN_WEEKLY_RATE;
  const cashDelta = weeklyRevenue - burn - financingDrag - emergencyInterest;
  state.cash += cashDelta;

  state.evidenceScore = evidenceScoreFor(state);
  state.conviction = Math.max(0, Math.min(100, state.conviction - BALANCE.convictionDecayWeekly + (newCustomers > 0 ? Math.min(6, newCustomers) : 0)));
  state.overclaim = Math.max(0, state.overclaim + overclaimDelta(state.conviction, state.evidenceScore));
  state.quietCorrectWeeks = state.evidenceScore - state.conviction > 25 ? state.quietCorrectWeeks + 1 : 0;
  const churnReputationHit = churnCount >= 3 && churnCount > newCustomers ? 2 : churnCount >= 8 ? 1 : 0;
  state.reputation = Math.max(0, Math.min(100, state.reputation + Math.min(3, newCustomers) - churnReputationHit));
  state.valuation = valuation(state);
  if (state.pivotWeeksRemaining > 0) state.pivotWeeksRemaining -= 1;
  if (state.allNighterCooldown > 0) state.allNighterCooldown -= 1;
  updatePeople(state);

  const quitters = state.people.filter((person) => person.drift > 82 && person.morale < 28);
  if (quitters.length) {
    state.people = state.people.filter((person) => !quitters.some((quitter) => quitter.id === person.id));
    state.formerPeople.push(...quitters.map((person) => person.name));
    if (quitters.some((person) => person.isCofounder)) { state.focus = Math.max(1, state.focus - 4); state.conviction = Math.floor(state.conviction / 2); state.people.forEach((person) => { person.morale = Math.max(0, person.morale - 30); }); }
    notes.push(`${quitters.map((person) => person.name).join(" and ")} left the company.`);
  }

  const count = state.people.length + 1;
  state.headcountHistory.push(count);
  state.workspace = workspaceFor(count, state.workspaceCap);
  const events = evaluateEvents(state);
  state.pendingEvents.push(...events);
  state.firedEvents.push(...events.map((event) => event.id));
  if (events.length) notes.push(`${events.length} consequence${events.length === 1 ? "" : "s"} arrived from earlier decisions.`);

  if (emergencyInterest > 0) notes.push(`Emergency loan interest cost $${Math.round(emergencyInterest).toLocaleString()}.`);
  state.weeklyReports.push({ week: state.week, cashDelta, revenue: weeklyRevenue, burn: burn + financingDrag + emergencyInterest, newCustomers, churned: churnCount, notes });
  state.history.push({ week: state.week, cash: state.cash, mrr: state.mrr });
  const quarter = closeQuarter(state);
  if (quarter) {
    state.quarterReports.push(quarter);
    state.officeBeat += 1;
    const entry = { id: `quarter-${quarter.year}-${quarter.quarter}`, week: state.week, kind: "quarter" as const, title: quarter.title, body: quarter.body, icon: quarter.officeBeat === "plant" ? "🪴" : quarter.officeBeat === "paint" ? "🖌️" : "📦" };
    state.companyHistory.push(entry);
    state.cards.push({ ...entry, kind: "quarter" });
  }
  const milestone = fireNextMilestone(state);
  if (milestone) {
    state.companyHistory.push(milestone);
    state.cards.push({ ...milestone, kind: "milestone" });
  }
  const crisisResult = processCrisis(state);
  if (crisisResult !== state) return crisisResult;
  state.week += 1;
  state.day = 1;
  return state;
}
