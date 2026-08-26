import { BALANCE } from "../data/balance";
import { cloneGameState } from "./clone";
import { newRun } from "./init";
import { randomInt } from "./rng";
import type { CrisisChoiceId, GameState, Workspace } from "./types";

const WORKSPACES: Workspace[] = ["apartment", "kitchen", "coworking", "office", "floor", "hq"];
export const EMERGENCY_LOAN_AMOUNT = 20_000;
export const EMERGENCY_LOAN_WEEKLY_RATE = .18;

export function lowerWorkspace(workspace: Workspace): Workspace | null {
  const index = WORKSPACES.indexOf(workspace);
  return index > 0 ? WORKSPACES[index - 1] : null;
}

function archiveAndRestart(state: GameState): GameState {
  const closingEntry = {
    id: `company-${state.companyNumber}-closed`, week: state.week, kind: "restart" as const, icon: "🔒",
    title: `Company ${state.companyNumber} closed`, body: `It closed with $${Math.round(state.mrr).toLocaleString()} monthly revenue and ${state.customers.length} customers.`,
  };
  state.companyHistory.push(closingEntry);
  const history = [...state.founder.history, {
    companyNumber: state.companyNumber, startedWeek: state.companyStartedWeek, closedWeek: state.week,
    finalCash: state.cash, finalMrr: state.mrr, customers: state.customers.length,
    peakHeadcount: Math.max(...state.headcountHistory, state.people.length + 1), history: state.companyHistory.map((entry) => ({ ...entry })),
  }];
  const reputation = Math.max(0, state.reputation - 20);
  const roll = randomInt(state.rngState, 1, 2_147_483_647);
  const fresh = newRun(roll.value);
  fresh.week = state.week + 1;
  fresh.companyStartedWeek = fresh.week;
  fresh.companyNumber = state.companyNumber + 1;
  fresh.cash = Math.max(BALANCE.startingCash, state.founder.cash);
  fresh.reputation = reputation;
  fresh.founder = { ...state.founder, reputation, history, relationships: { ...state.founder.relationships } };
  fresh.cards = [{ id: `restart-${fresh.companyNumber}`, kind: "restart", week: fresh.week, icon: "🔁", title: "Back at the desk", body: `Company ${state.companyNumber} is in your history. Company ${fresh.companyNumber} starts now.` }];
  fresh.decisionLog[0] = { ...fresh.decisionLog[0], week: fresh.week, detail: `Started company ${fresh.companyNumber} in a small room.` };
  fresh.history = [{ week: fresh.week, cash: fresh.cash, mrr: 0 }];
  return fresh;
}

export function processCrisis(state: GameState): GameState {
  if (state.cash >= 0) {
    if (state.crisis.active) state.crisis.crisesSurvived += 1;
    state.crisis.active = false;
    state.crisis.choiceRequired = false;
    state.crisis.consecutiveNegativeWeeks = 0;
    state.crisis.enteredWeek = null;
    return state;
  }
  if (!state.crisis.active) {
    state.crisis = { ...state.crisis, active: true, choiceRequired: true, consecutiveNegativeWeeks: 1, enteredWeek: state.week };
    return state;
  }
  state.crisis.consecutiveNegativeWeeks += 1;
  if (state.crisis.consecutiveNegativeWeeks >= 2) return archiveAndRestart(state);
  state.crisis.choiceRequired = true;
  return state;
}

export function resolveCrisis(input: GameState, choice: CrisisChoiceId, personId?: string): GameState {
  if (!input.crisis.choiceRequired) return input;
  const state = cloneGameState(input);
  let body = "";
  if (choice === "layoff") {
    const person = state.people.find((item) => item.id === personId);
    if (!person) return input;
    state.people = state.people.filter((item) => item.id !== person.id);
    state.formerPeople.push(person.name);
    state.people.forEach((item) => { item.morale = Math.max(0, item.morale - 35); });
    body = `${person.name} was let go. Payroll fell and the room went quiet.`;
  } else if (choice === "loan") {
    state.cash += EMERGENCY_LOAN_AMOUNT;
    state.emergencyLoanBalance += EMERGENCY_LOAN_AMOUNT;
    state.reputation = Math.max(0, state.reputation - 8);
    body = `$${EMERGENCY_LOAN_AMOUNT.toLocaleString()} arrived. The loan now costs 18% of its balance every week.`;
  } else {
    const lower = lowerWorkspace(state.workspace);
    if (!lower) return input;
    const refund = Math.max(2_000, BALANCE.workspaceWeekly[state.workspace] * 4);
    state.workspace = lower;
    state.workspaceCap = lower;
    state.cash += refund;
    body = `The office was sold. The company moved down to ${lower} and recovered $${refund.toLocaleString()}.`;
  }
  state.companyHistory.push({ id: `crisis-${state.week}-${choice}`, week: state.week, kind: "crisis", icon: "🧯", title: "The cash crisis", body });
  state.crisis.choiceRequired = false;
  if (state.cash >= 0) {
    state.crisis.active = false;
    state.crisis.consecutiveNegativeWeeks = 0;
    state.crisis.enteredWeek = null;
    state.crisis.crisesSurvived += 1;
  }
  return state;
}
