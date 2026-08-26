import { ACTIONS } from "../data/actionDefs";
import { CHANNELS, type ChannelId } from "../data/channels";
import { CHURN_DRIVERS } from "../data/churnDrivers";
import { FEATURES } from "../data/features";
import { SEGMENTS } from "../data/segments";
import { createHire } from "./people";
import { cloneGameState } from "./clone";
import { choose, randomInt } from "./rng";
import type { ActionId, BeliefKey, EvidenceCard, GameState, PendingAction, Workspace } from "./types";

export function getAction(id: ActionId) { return ACTIONS.find((action) => action.id === id); }

export function queueAction(state: GameState, actionId: ActionId, target?: string): GameState {
  const definition = getAction(actionId);
  if (!definition || state.crisis.choiceRequired || !definition.availability(state) || state.focus < definition.focusCost || state.cash < definition.cashCost) return state;
  const next = { ...state, queuedActions: [...state.queuedActions], decisionLog: [...state.decisionLog] };
  next.focus -= definition.focusCost;
  next.day = Math.min(5, next.day + 1);
  if (actionId === "allNighter") next.focus += 3;
  const pending: PendingAction = { id: `action-${next.week}-${next.decisionLog.length}`, actionId, target, label: definition.name, focusCost: definition.focusCost, cashCost: definition.cashCost };
  next.queuedActions.push(pending);
  next.decisionLog.push({ id: pending.id, week: next.week, type: actionId, detail: definition.name, refId: target ?? actionId, impact: definition.focusCost + definition.cashCost / 500, alternate: `Skip ${definition.name.toLowerCase()}` });
  return next;
}

function truthValue(state: GameState, key: BeliefKey): string {
  if (key === "buyer") return state.truth.buyer;
  if (key === "price") return String(Math.round(state.truth.willingnessToPay / 25) * 25);
  if (key === "wedge") return state.truth.wedgeFeature;
  if (key === "churnCause") return state.truth.churnDriver;
  return state.truth.channel;
}

function wrongValue(state: GameState, key: BeliefKey): string {
  if (key === "buyer") return SEGMENTS[(SEGMENTS.indexOf(state.truth.buyer) + 1 + state.week) % SEGMENTS.length];
  if (key === "price") return String(Math.max(25, Math.round(state.truth.willingnessToPay * (state.week % 2 ? .45 : 1.65) / 25) * 25));
  if (key === "wedge") return FEATURES[(FEATURES.indexOf(state.truth.wedgeFeature) + 2 + state.week) % FEATURES.length];
  if (key === "churnCause") return CHURN_DRIVERS[(CHURN_DRIVERS.indexOf(state.truth.churnDriver) + 1 + state.week) % CHURN_DRIVERS.length];
  return CHANNELS[(CHANNELS.indexOf(state.truth.channel) + 1 + state.week) % CHANNELS.length];
}

const SOURCES = ["Dana R., an ops lead", "Micah T., a technical founder", "June K., an agency owner", "Ravi P., an IT director", "Nina W., an independent developer"];
const QUOTES: Record<BeliefKey, string> = {
  buyer: "The budget belongs to the person cleaning up the handoffs.", price: "Cheap is not the same as easy to approve.", wedge: "If this one thing worked, the rest could wait.", churnCause: "We did not leave because of the roadmap. We left because Tuesday was unreliable.", channel: "I ignore ads. I asked someone I trust what they use.",
};

function addEvidence(state: GameState, dimension: BeliefKey, strength: number, misleadingRate: number): void {
  const misleadingRoll = randomInt(state.rngState, 1, 100); state.rngState = misleadingRoll.state;
  const sourceRoll = randomInt(state.rngState, 0, SOURCES.length - 1); state.rngState = sourceRoll.state;
  const misleading = misleadingRoll.value <= misleadingRate;
  state.evidence.push({ id: `evidence-${state.week}-${state.evidence.length}`, week: state.week, source: `Interview with ${SOURCES[sourceRoll.value]}`, dimension, suggests: misleading ? wrongValue(state, dimension) : truthValue(state, dimension), strength, isMisleading: misleading, quote: QUOTES[dimension], read: false });
}

function sellThrough(state: GameState, channel: ChannelId, base: number): void {
  const channelFit = channel === state.truth.channel ? 1.6 : channel === state.beliefs.channel.value ? 1 : .65;
  const inflection = state.week >= state.truth.demandInflectionWeek ? 1.35 : 1;
  state.pipeline += Math.round(base * channelFit * inflection);
}

function downgradeWorkspace(workspace: Workspace): Workspace {
  const order: Workspace[] = ["apartment", "kitchen", "coworking", "office", "floor", "hq"];
  return order[Math.max(0, order.indexOf(workspace) - 1)];
}

export function applyQueuedActions(input: GameState): { state: GameState; notes: string[] } {
  const state = cloneGameState(input);
  const notes: string[] = [];
  for (const pending of state.queuedActions) {
    state.cash -= pending.cashCost;
    const id = pending.actionId;
    if (id === "interview") { const key = choose(state.rngState, ["buyer", "price", "wedge", "churnCause", "channel"] as BeliefKey[]); state.rngState = key.state; addEvidence(state, key.value, randomInt(state.rngState, 1, 2).value, 25); notes.push("One interview added a noisy card to the notebook."); }
    if (id === "interviewSprint") { for (let i = 0; i < 3; i += 1) { const key = choose(state.rngState, ["buyer", "price", "wedge", "churnCause", "channel"] as BeliefKey[]); state.rngState = key.state; addEvidence(state, key.value, 2 + (i % 2), 12); } notes.push("The interview sprint produced three stronger signals."); }
    if (id === "landingPage") { addEvidence(state, "channel", 3, 18); addEvidence(state, "price", 3, 18); notes.push("The landing page exposed price and channel behavior."); }
    if (id === "churnAutopsy") { addEvidence(state, "churnCause", 5, 0); notes.push("A churn autopsy identified a cause without ambiguity."); }
    if (id === "winLoss") { addEvidence(state, "buyer", 3, 10); addEvidence(state, "price", 3, 10); notes.push("Closed deals produced buyer and price evidence."); }
    if (id === "teardown") { addEvidence(state, "wedge", 2, 30); state.conviction += 3; notes.push("The competitor teardown made one roadmap bet feel more plausible."); }
    if (id === "ship" && !state.shippedFeatures.includes(state.selectedFeature)) { state.shippedFeatures.push(state.selectedFeature); state.techDebt += 8; state.reputation += 2; notes.push(`${state.selectedFeature} shipped with new maintenance weight.`); }
    if (id === "harden") { state.techDebt = Math.max(0, state.techDebt - 25); notes.push("Reliability work retired a meaningful block of debt."); }
    if (id === "onboarding") { state.onboardingQuality = Math.min(100, state.onboardingQuality + 22); notes.push("The first-run experience became easier to survive."); }
    if (id === "payDebt") { state.techDebt = Math.max(0, state.techDebt - 38); notes.push("The team paid down old shortcuts instead of adding scope."); }
    if (id === "spike") { addEvidence(state, "wedge", 2, 15); state.techDebt = Math.max(0, state.techDebt - 3); notes.push("The spike produced a technical signal before a full build."); }
    if (id === "coldOutreach") sellThrough(state, "cold", 5);
    if (id === "salesCall") { sellThrough(state, state.beliefs.channel.value, 7); state.conviction += 4; }
    if (id === "communityLaunch") sellThrough(state, "community", 10);
    if (id === "content") { sellThrough(state, "content", 8); state.reputation += 2; }
    if (id === "paidAds") sellThrough(state, "paid", 18);
    if (id === "enterpriseDeal") { state.pipeline += 5; state.price = Math.max(state.price, 900); state.decisionLog.push({ id: `${pending.id}-enterprise`, week: state.week, type: "enterprise", detail: "Promised enterprise readiness to a large prospect.", refId: pending.id, impact: 18, alternate: "Keep the product narrow" }); }
    if (id === "postRole") state.decisionLog.push({ id: `${pending.id}-posted`, week: state.week, type: "role-posted", detail: "Opened a role before the next constraint was fully known.", refId: pending.id, impact: 4 });
    if (id === "interviewCandidate") state.decisionLog.push({ id: `${pending.id}-candidate`, week: state.week, type: "candidate-interviewed", detail: "Interviewed the next person in the hiring pool.", refId: pending.id, impact: 3 });
    if (id === "offer") { const hire = createHire(state); state.rngState = hire.rngState; state.people.push(hire.person); notes.push(`${hire.person.name} joined as ${hire.person.role.toLowerCase()}.`); }
    if (id === "oneOnOne") { const person = state.people.find((item) => item.id === pending.target) ?? [...state.people].sort((a, b) => b.drift - a.drift)[0]; if (person) { person.drift = Math.max(0, person.drift - 20); person.morale = Math.min(100, person.morale + 10); notes.push(`A direct conversation brought ${person.name} closer.`); } }
    if (id === "raise") { const person = [...state.people].sort((a, b) => a.morale - b.morale)[0]; if (person) { person.salaryWeekly += 180; person.morale = Math.min(100, person.morale + 16); } }
    if (id === "letGo") { const person = [...state.people].filter((p) => !p.isCofounder).sort((a, b) => b.salaryWeekly - a.salaryWeekly)[0]; if (person) { state.people = state.people.filter((p) => p.id !== person.id); state.formerPeople.push(person.name); state.people.forEach((p) => { p.morale = Math.max(0, p.morale - 12); }); notes.push(`${person.name} was let go. The empty chair stayed.`); } }
    if (id === "angel" && state.conviction >= 48) { state.cash += 80_000; state.outsideCapital += 80_000; state.valuation = Math.max(state.valuation, 650_000); notes.push("An angel wired $80,000 for 12% of the company."); }
    if (id === "seedFund" && state.conviction >= 62 && state.mrr >= 8000) { const seriesA = state.valuation >= 11_400_000; const amount = seriesA ? 2_000_000 : 600_000; state.cash += amount; state.outsideCapital += amount; state.valuation = Math.max(state.valuation + amount, seriesA ? 12_000_001 : 5_000_000); state.raisedSeriesA = seriesA; notes.push(seriesA ? "A Series A closed above a $12M post-money valuation." : "A seed fund invested $600,000. The board seat came with it."); }
    if (id === "bridge") { state.cash += 50_000; state.outsideCapital += 50_000; state.reputation = Math.max(0, state.reputation - 4); }
    if (id === "revenueFinance") { const amount = state.mrr * 4; state.cash += amount; state.outsideCapital += amount; }
    if (id === "cutBurn") { state.workspace = downgradeWorkspace(state.workspace); state.people.forEach((p) => { p.morale = Math.max(0, p.morale - 9); }); notes.push("The company moved backward to make the runway longer."); }
    if (id === "weekend") { state.nextFocusBonus += 2; state.people.forEach((p) => { p.morale = Math.min(100, p.morale + 5); }); }
    if (id === "pivot") { state.pivotWeeksRemaining = 3 + Math.floor(state.mrr / 1000) + Math.floor(state.customers.length / 5) + Math.floor(state.people.length / 3); state.people.forEach((p) => { p.morale = Math.max(0, p.morale - 15); }); Object.values(state.beliefs).forEach((belief) => { belief.confidence = 20; }); notes.push(`The pivot began. It will constrain ${state.pivotWeeksRemaining} weeks.`); }
    if (id === "rewritePitch") state.conviction = Math.min(100, state.conviction + 12);
    if (id === "allNighter") { state.nextFocusBonus -= 2; state.allNighterCooldown = 5; state.people.forEach((p) => { p.morale = Math.max(0, p.morale - 8); }); notes.push("The all-nighter borrowed attention from the next two weeks."); }
  }
  state.queuedActions = [];
  return { state, notes };
}
