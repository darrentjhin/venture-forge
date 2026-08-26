import { describe, expect, it } from "vitest";
import { acceptTermSheet, canRepitchInvestor, closeRound, openRound, outcomeBand, passReasonFor, PASS_LINES, processFundraisingWeek, type PitchInputs } from "../engine/fundraising";
import { newRun } from "../engine/init";
import type { PassReason } from "../engine/types";

const base: PitchInputs = { traction: 50, fit: 50, team: 50, story: 50, relationship: 20, integrity: 0, churnConcern: false, askTooHigh: false, marketTooSmall: false, numbersMismatch: false, timing: false, needsLead: false };

describe("fundraising", () => {
  it("maps pitch scores into every meeting band", () => {
    expect(outcomeBand(34, "thorough", false)).toBe("hardPass");
    expect(outcomeBand(35, "thorough", false)).toBe("softPass");
    expect(outcomeBand(55, "thorough", false)).toBe("secondMeeting");
    expect(outcomeBand(70, "thorough", false)).toBe("diligence");
    expect(outcomeBand(85, "thorough", false)).toBe("termSheet");
    expect(outcomeBand(70, "fast", false)).toBe("termSheet");
    expect(outcomeBand(99, "tyreKicker", true)).toBe("secondMeeting");
  });

  it("can produce every named pass reason and has three lines for each", () => {
    const cases: Record<PassReason, PitchInputs> = {
      tooEarly: { ...base, traction: 1 }, notOurThesis: { ...base, fit: 1 }, teamGap: { ...base, team: 1 },
      churnConcern: { ...base, churnConcern: true }, valuationTooHigh: { ...base, askTooHigh: true }, marketTooSmall: { ...base, marketTooSmall: true },
      numbersDidNotMatch: { ...base, numbersMismatch: true }, timing: { ...base, timing: true }, needLead: { ...base, needsLead: true },
    };
    for (const [reason, inputs] of Object.entries(cases) as [PassReason, PitchInputs][]) {
      expect(passReasonFor(inputs)).toBe(reason);
      expect(new Set(PASS_LINES[reason]).size).toBe(3);
    }
  });

  it("reopens a soft revenue pass when the named bar is met", () => {
    const state = newRun(601);
    const investor = state.investors.find((item) => item.minMonthlyRevenue > 0) ?? state.investors[0];
    investor.passes.push({ week: 1, reason: "tooEarly" });
    state.mrr = Math.max(0, investor.minMonthlyRevenue - 1);
    expect(canRepitchInvestor(state, investor)).toBe(false);
    state.mrr = investor.minMonthlyRevenue;
    expect(canRepitchInvestor(state, investor)).toBe(true);
  });

  it("makes a leadless round cold after eight weeks", () => {
    let state = openRound(newRun(602), "angel", 100_000, 700_000);
    state = { ...state, week: state.week + 8 };
    processFundraisingWeek(state);
    expect(state.rounds[0].status).toBe("cold");
    expect(state.activeRoundId).toBeNull();
  });

  it("kills diligence and spreads the reputation hit when the numbers do not match", () => {
    let state = openRound(newRun(603), "angel", 100_000, 700_000);
    const round = state.rounds[0];
    const investor = state.investors[0];
    state.investors[1].discovered = true;
    state.investors[1].relationship = 40;
    round.meetings.push({ investorId: investor.id, week: 1, outcome: { kind: "diligence" } });
    state.week = 3; state.overclaim = 30;
    processFundraisingWeek(state);
    const result = round.meetings[round.meetings.length - 1].outcome;
    expect(result.kind).toBe("pass");
    expect(result.kind === "pass" ? result.reason : null).toBe("numbersDidNotMatch");
    expect(state.investors[1].relationship).toBe(30);
  });

  it("accepts a lead, closes the round, and wires cash for ownership", () => {
    let state = openRound(newRun(604), "angel", 100_000, 700_000);
    const round = state.rounds[0];
    const investor = state.investors[0];
    round.meetings.push({ investorId: investor.id, week: 1, outcome: { kind: "termSheet", sheet: { investorId: investor.id, amount: 100_000, preMoney: 700_000, boardSeat: false, liquidationPreference: 1, poolTopUp: .08, expiresWeek: 4 } } });
    const cashBefore = state.cash;
    state = acceptTermSheet(state, investor.id);
    expect(state.rounds[0].leadInvestorId).toBe(investor.id);
    state = closeRound(state);
    expect(state.cash).toBe(cashBefore + 100_000);
    expect(state.outsideCapital).toBe(100_000);
    expect(state.capTable.some((entry) => entry.kind === "investor")).toBe(true);
  });
});
