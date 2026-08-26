import { describe, expect, it } from "vitest";
import { calendarLabel, quarterForWeek, weekOfYear, yearForWeek } from "../engine/calendar";
import { processCrisis, resolveCrisis } from "../engine/crisis";
import { newRun } from "../engine/init";
import { MILESTONES, fireNextMilestone } from "../engine/milestones";
import { advanceWeek } from "../engine/week";

describe("endless career", () => {
  it("derives an endless calendar and crosses the old week 104 boundary", () => {
    expect([yearForWeek(66), weekOfYear(66), quarterForWeek(66), calendarLabel(66)]).toEqual([2, 14, 2, "Y2 W14"]);
    const state = newRun(91);
    state.week = 104;
    state.cash = 1_000_000;
    const next = advanceWeek(state);
    expect(next.week).toBe(105);
    expect(next.ending).toBeNull();
  });

  it("offers costly crisis choices instead of ending the run", () => {
    const state = newRun(92);
    state.cash = -50;
    state.crisis = { ...state.crisis, active: true, choiceRequired: true, consecutiveNegativeWeeks: 1, enteredWeek: 1 };
    const loan = resolveCrisis(state, "loan");
    expect(loan.cash).toBeGreaterThan(0);
    expect(loan.emergencyLoanBalance).toBe(20_000);
    expect(loan.reputation).toBe(state.reputation - 8);
    expect(loan.crisis.choiceRequired).toBe(false);
  });

  it("archives a company after two negative weeks and starts the next one", () => {
    const state = newRun(93);
    state.cash = -500;
    state.week = 8;
    state.crisis = { ...state.crisis, active: true, choiceRequired: false, consecutiveNegativeWeeks: 1, enteredWeek: 7 };
    const restarted = processCrisis(state);
    expect(restarted.companyNumber).toBe(2);
    expect(restarted.week).toBe(9);
    expect(restarted.founder.history).toHaveLength(1);
    expect(restarted.ending).toBeNull();
    expect(restarted.cards[0]?.kind).toBe("restart");
  });
});

describe("milestones", () => {
  it("ships at least 24 milestones and fires no more than one at a time", () => {
    expect(MILESTONES.length).toBeGreaterThanOrEqual(24);
    const state = newRun(94);
    state.totalCustomersWon = 100;
    state.mrr = 50_000;
    const first = fireNextMilestone(state);
    expect(first?.id).toBe("first-customer");
    expect(state.firedMilestones).toHaveLength(1);
  });
});
