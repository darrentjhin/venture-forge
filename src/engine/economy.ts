import { BALANCE } from "../data/balance";
import { CHANNEL_BASE } from "../data/channels";
import { alignmentFor, priceFit } from "./beliefs";
import type { GameState } from "./types";

export function conversionRate(state: Pick<GameState, "beliefs" | "truth" | "price" | "reputation">, alignmentOverride?: number): number {
  const alignment = alignmentOverride ?? alignmentFor(state.beliefs, state.truth);
  return CHANNEL_BASE[state.beliefs.channel.value] * (.2 + 1.8 * alignment) * priceFit(state.price, state.truth.willingnessToPay) * (.7 + state.reputation / 300);
}

export function churnRate(state: Pick<GameState, "beliefs" | "truth" | "techDebt" | "customers">, alignmentOverride?: number): number {
  const alignment = alignmentOverride ?? alignmentFor(state.beliefs, state.truth);
  const shipped = new Set((state as GameState).shippedFeatures ?? []);
  const unserved = state.customers.reduce((sum, customer) => sum + customer.demands.filter((demand) => !shipped.has(demand)).length, 0);
  return BALANCE.baseChurnWeekly * (2 - alignment) * (1 + unserved * .10 / Math.max(1, state.customers.length)) * (1 + state.techDebt / 200);
}

export function weeklyBurn(state: Pick<GameState, "people" | "customers" | "workspace">): number {
  return BALANCE.founderWeeklyLiving + BALANCE.toolingWeekly + state.people.reduce((sum, person) => sum + person.salaryWeekly, 0) + BALANCE.workspaceWeekly[state.workspace] + state.people.length * BALANCE.seatCostWeekly + state.customers.length * BALANCE.infraPerCustomerWeekly;
}

export function runwayWeeks(cash: number, revenue: number, burn: number): number {
  const netBurn = burn - revenue;
  return netBurn <= 0 ? Number.POSITIVE_INFINITY : Math.max(0, cash / netBurn);
}

export function pivotCost(state: Pick<GameState, "mrr" | "customers" | "people">): number {
  return 3 + Math.floor(state.mrr / 1000) + Math.floor(state.customers.length / 5) + Math.floor(state.people.length / 3);
}

export function valuation(state: Pick<GameState, "mrr" | "conviction" | "reputation">): number {
  return Math.round(Math.max(400_000, state.mrr * 12 * (6 + state.conviction / 5 + state.reputation / 20)));
}

export function overclaimDelta(conviction: number, evidence: number): number { return Math.max(0, (conviction - evidence - 15) / 10); }
