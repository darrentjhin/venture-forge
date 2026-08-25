import { describe, expect, it } from "vitest";
import { conversionRate, churnRate, overclaimDelta, pivotCost, runwayWeeks } from "../engine/economy";
import { newRun } from "../engine/init";

describe("economy invariants", () => {
  it("alignment at 1.0 converts at least four times alignment at zero", () => {
    const state = newRun(10); state.price = state.truth.willingnessToPay;
    expect(conversionRate(state, 1)).toBeGreaterThanOrEqual(conversionRate(state, 0) * 4);
  });

  it("churn strictly decreases as alignment increases", () => {
    const state = newRun(11);
    expect(churnRate(state, .8)).toBeLessThan(churnRate(state, .4));
    expect(churnRate(state, .4)).toBeLessThan(churnRate(state, 0));
  });

  it("pivot cost rises with MRR, customers, and team size", () => {
    const state = newRun(12); const baseline = pivotCost(state);
    state.mrr = 4000; expect(pivotCost(state)).toBeGreaterThan(baseline);
    const withMrr = pivotCost(state); state.customers = Array.from({ length: 6 }, (_, index) => ({ id: String(index), name: "Account", segment: "agency" as const, mrr: 100, demands: [], joinedWeek: 1, champion: false })); expect(pivotCost(state)).toBeGreaterThan(withMrr);
    const withCustomers = pivotCost(state); state.people.push(structuredClone(state.people[0]), structuredClone(state.people[0]), structuredClone(state.people[0])); expect(pivotCost(state)).toBeGreaterThan(withCustomers);
  });

  it("overclaim accrues if and only if conviction exceeds evidence plus fifteen", () => {
    expect(overclaimDelta(70, 55)).toBe(0);
    expect(overclaimDelta(71, 55)).toBeGreaterThan(0);
    expect(overclaimDelta(40, 80)).toBe(0);
  });

  it("runway equals cash over net burn and becomes infinite when profitable", () => {
    expect(runwayWeeks(10000, 500, 1500)).toBe(10);
    expect(runwayWeeks(10000, 1600, 1500)).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(runwayWeeks(10000, 1600, 1500))).toBe(false);
  });
});
