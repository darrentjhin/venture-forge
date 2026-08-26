import { describe, expect, it } from "vitest";
import { applyInvestment, isDownRound, ownershipPercent } from "../engine/fundraising";
import type { CapEntry, Round } from "../engine/types";

const initial = (): CapEntry[] => [
  { id: "founder", holder: "You", kind: "founder", shares: 6_000_000, roundId: null, sinceWeek: 1 },
  { id: "cofounder", holder: "Cofounder", kind: "cofounder", shares: 3_000_000, roundId: null, sinceWeek: 1 },
  { id: "pool", holder: "Pool", kind: "optionPool", shares: 1_000_000, roundId: null, sinceWeek: 1 },
];

describe("cap table", () => {
  it("always sums to 100% across a hundred sequences", () => {
    for (let sequence = 0; sequence < 100; sequence += 1) {
      let cap = initial();
      for (let round = 0; round < 5; round += 1) cap = applyInvestment(cap, `Fund ${round}`, 100_000 + sequence * 1_000 + round * 25_000, 800_000 + round * 500_000, round % 2 ? .08 : .12, `r-${sequence}-${round}`, round + 2);
      const sum = (["founder", "cofounder", "optionPool", "investor"] as const).reduce((total, kind) => total + ownershipPercent(cap, kind), 0);
      expect(sum).toBeCloseTo(100, 3);
    }
  });

  it("a pre-money pool top-up dilutes founders but not the incoming investor", () => {
    const noTopUp = applyInvestment(initial(), "Fund", 500_000, 2_000_000, 0, "plain", 2);
    const topUp = applyInvestment(initial(), "Fund", 500_000, 2_000_000, .12, "pool", 2);
    expect(ownershipPercent(topUp, "founder")).toBeLessThan(ownershipPercent(noTopUp, "founder"));
    const incoming = topUp.find((entry) => entry.kind === "investor");
    const total = topUp.reduce((sum, entry) => sum + entry.shares, 0);
    expect(incoming ? incoming.shares / total : 0).toBeCloseTo(500_000 / 2_500_000, 6);
  });

  it("never decreases an existing share count", () => {
    const before = initial();
    const after = applyInvestment(before, "Fund", 600_000, 2_400_000, .1, "r", 2);
    for (const entry of before) expect(after.find((item) => item.id === entry.id)?.shares).toBe(entry.shares);
  });

  it("detects a price below the last post-money as a down round", () => {
    const closed: Round = { id: "seed", stage: "seed", targetAmount: 1_000_000, askPreMoney: 4_000_000, openedWeek: 2, leadInvestorId: "i", commitments: [{ investorId: "i", amount: 1_000_000, week: 3 }], meetings: [], poolTopUp: .1, status: "closed" };
    expect(isDownRound([closed], 4_999_999)).toBe(true);
    expect(isDownRound([closed], 5_000_000)).toBe(false);
  });
});
