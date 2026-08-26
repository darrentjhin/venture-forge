import { BALANCE } from "../data/balance";
import { FEATURES, type FeatureId } from "../data/features";
import { cloneGameState } from "./clone";
import { ownershipPercent } from "./fundraising";
import { newRun } from "./init";
import { randomInt } from "./rng";
import type { GameState, ManagedCompany, Workspace } from "./types";

export const WORKSPACE_ORDER: Workspace[] = ["apartment", "kitchen", "coworking", "office", "floor", "hq"];

export function officeMoveCost(target: Workspace): number {
  return Math.max(1_000, BALANCE.workspaceWeekly[target] * 4);
}

export function startOfficeMove(input: GameState, target: Workspace): GameState {
  const current = WORKSPACE_ORDER.indexOf(input.workspace);
  const next = WORKSPACE_ORDER.indexOf(target);
  const deposit = officeMoveCost(target);
  if (input.officeMove || input.focus < 1 || next <= current || input.cash < deposit) return input;
  const state = cloneGameState(input);
  state.focus -= 1; state.cash -= deposit; state.day = Math.min(5, state.day + 1);
  state.officeMove = { target, weeksRemaining: 1, deposit };
  state.decisionLog.push({ id: `office-move-${state.week}-${target}`, week: state.week, type: "office-move", detail: `Committed to move into the ${target}.`, refId: target, impact: deposit / 1_000 + 4 });
  return state;
}

export function finishOfficeMove(state: GameState): void {
  if (!state.officeMove) return;
  state.officeMove.weeksRemaining -= 1;
  if (state.officeMove.weeksRemaining > 0) return;
  const target = state.officeMove.target;
  state.workspace = target; state.workspaceCap = null; state.officeMove = null;
  state.companyHistory.push({ id: `office-${state.week}-${target}`, week: state.week, kind: "milestone", title: `Moved into the ${target}`, body: "The team lost half a week to boxes, cables, and finding the coffee machine.", icon: "📦" });
}

export function startProductLine(input: GameState): GameState {
  if (input.focus < 2 || input.cash < 2_000 || input.productLines.length >= 3) return input;
  const state = cloneGameState(input);
  const serial = state.productSerial + 1;
  state.productSerial = serial; state.focus -= 2; state.cash -= 2_000; state.day = Math.min(5, state.day + 1);
  state.productLines.push({ id: `product-${state.companyNumber}-${serial}`, name: `Product ${serial + 1}`, price: Math.max(49, Math.round(state.price * .7)), selectedFeature: FEATURES[(state.seed + serial) % FEATURES.length], shippedFeatures: [], customers: 0, churned: 0, mrr: 0, startedWeek: state.week });
  state.decisionLog.push({ id: `product-line-${state.week}-${serial}`, week: state.week, type: "product-line", detail: `Started Product ${serial + 1}.`, refId: `product-${serial}`, impact: 12 });
  return state;
}

export function selectProductFeature(input: GameState, lineId: string, feature: FeatureId): GameState {
  const state = cloneGameState(input);
  const line = state.productLines.find((item) => item.id === lineId);
  if (!line || line.shippedFeatures.includes(feature)) return input;
  line.selectedFeature = feature;
  return state;
}

export function shipProductFeature(input: GameState, lineId: string): GameState {
  if (input.focus < 2 || input.cash < 500) return input;
  const state = cloneGameState(input);
  const line = state.productLines.find((item) => item.id === lineId);
  if (!line || line.shippedFeatures.includes(line.selectedFeature)) return input;
  state.focus -= 2; state.cash -= 500; state.day = Math.min(5, state.day + 1); line.shippedFeatures.push(line.selectedFeature);
  state.decisionLog.push({ id: `product-ship-${state.week}-${line.id}-${line.shippedFeatures.length}`, week: state.week, type: "product-ship", detail: `Shipped a ${line.name} feature.`, refId: line.id, impact: 7 });
  return state;
}

export function processProductLines(state: GameState): void {
  for (const line of state.productLines) {
    if (!line.shippedFeatures.length) { line.mrr = 0; continue; }
    const serial = Number(line.id.split("-").pop()) || 1;
    const cadence = Math.max(2, 5 - Math.min(3, line.shippedFeatures.length));
    if ((state.week + state.seed + serial) % cadence === 0) line.customers += 1 + Math.floor(line.shippedFeatures.length / 3);
    const churnCadence = Math.max(6, 11 - line.shippedFeatures.length);
    if (line.customers > 1 && (state.week + serial) % churnCadence === 0) { line.customers -= 1; line.churned += 1; }
    line.mrr = line.customers * line.price;
  }
}

export function processPortfolio(state: GameState): number {
  let dividends = 0;
  for (const company of state.portfolio) {
    const previous = company.mrr;
    company.mrr = Math.round(company.mrr * 1.012 + (company.mrr === 0 && state.week % 8 === 0 ? 100 : 0));
    if (company.mrr > previous && state.week % 4 === 0) company.customers += 1;
    company.valuation = Math.max(company.valuation, company.mrr * 120);
    const burn = company.people.reduce((sum, person) => sum + person.salaryWeekly, 0) + BALANCE.workspaceWeekly[company.workspace] + 650;
    const profit = company.mrr / 4.33 - burn;
    company.cash += profit;
    const dividend = Math.max(0, profit * company.founderOwnership * .25);
    company.cash -= dividend; company.dividendsPaid += dividend; dividends += dividend;
  }
  if (dividends > 0) { state.cash += dividends; state.founder.cash += dividends; state.holdingDividends += dividends; }
  return dividends;
}

export function appointCeoAndStartCompany(input: GameState, personId: string | null): GameState {
  const selected = personId ? input.people.find((person) => person.id === personId) : null;
  const outsideFee = personId ? 0 : 20_000;
  if ((personId && !selected) || input.cash < outsideFee) return input;
  const state = cloneGameState(input);
  const ownership = ownershipPercent(state.capTable, "founder") / 100;
  const company: ManagedCompany = {
    id: `managed-company-${state.companyNumber}`, companyNumber: state.companyNumber, name: `Company ${state.companyNumber}`,
    ceoName: selected?.name ?? "Morgan Vale", founderOwnership: ownership, mrr: state.mrr, cash: state.cash - outsideFee,
    customers: state.customers.length + state.productLines.reduce((sum, line) => sum + line.customers, 0), valuation: state.valuation,
    workspace: state.workspace, people: state.people.map((person) => ({ ...person, beliefs: { ...person.beliefs }, appearance: { ...person.appearance } })),
    dividendsPaid: 0, startedWeek: state.companyStartedWeek, appointedWeek: state.week,
  };
  const roll = randomInt(state.rngState, 1, 2_147_483_647);
  const fresh = newRun(roll.value);
  fresh.week = state.week + 1; fresh.companyStartedWeek = fresh.week; fresh.companyNumber = state.companyNumber + 1;
  fresh.cash = Math.max(BALANCE.startingCash, state.founder.cash); fresh.reputation = state.reputation;
  fresh.founder = { ...state.founder, reputation: state.reputation, relationships: { ...state.founder.relationships }, history: state.founder.history.map((item) => ({ ...item, history: item.history.map((entry) => ({ ...entry })) })) };
  fresh.portfolio = [...state.portfolio, company]; fresh.holdingDividends = state.holdingDividends;
  fresh.investors.forEach((investor) => { const relationship = fresh.founder.relationships[investor.id]; if (relationship !== undefined) { investor.relationship = relationship; investor.discovered = true; } });
  fresh.cards = [{ id: `ceo-${company.id}`, kind: "restart", week: fresh.week, icon: "🏢", title: `${company.ceoName} is running ${company.name}`, body: `You still own ${(ownership * 100).toFixed(1)}%. Company ${fresh.companyNumber} starts at a new desk while the old office keeps working.` }];
  fresh.decisionLog[0] = { ...fresh.decisionLog[0], week: fresh.week, detail: `Started company ${fresh.companyNumber} while ${company.name} runs under ${company.ceoName}.` };
  fresh.history = [{ week: fresh.week, cash: fresh.cash, mrr: 0 }];
  return fresh;
}
