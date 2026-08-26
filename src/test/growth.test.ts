import { describe, expect, it } from "vitest";
import { newRun } from "../engine/init";
import {
  appointCeoAndStartCompany,
  finishOfficeMove,
  officeMoveCost,
  processPortfolio,
  processProductLines,
  shipProductFeature,
  startOfficeMove,
  startProductLine,
} from "../engine/growth";
import { processTasks } from "../engine/tasks";

describe("multi-company growth", () => {
  it("turns an office upgrade into a one-week move with half output", () => {
    const normal = newRun(801);
    const moving = newRun(801);
    const normalTask = normal.tasks[0];
    const movingTask = moving.tasks[0];
    const person = normal.people[0];
    if (!normalTask || !movingTask || !person) throw new Error("Expected seeded work and a cofounder");
    normalTask.assigned = [person.id];
    movingTask.assigned = [person.id];
    moving.cash = 20_000;
    const started = startOfficeMove(moving, "coworking");
    expect(started.cash).toBe(20_000 - officeMoveCost("coworking"));
    processTasks(normal);
    processTasks(started);
    expect(started.tasks[0]?.progress).toBeCloseTo((normal.tasks[0]?.progress ?? 0) * .5, 5);
    expect(started.workspace).toBe("apartment");
    finishOfficeMove(started);
    expect(started.workspace).toBe("coworking");
    expect(started.officeMove).toBeNull();
  });

  it("gives a second product its own roadmap, customers, churn, and MRR", () => {
    let state = newRun(802);
    state.cash = 20_000;
    state.focus = 10;
    state = startProductLine(state);
    const lineId = state.productLines[0]?.id;
    expect(lineId).toBeTruthy();
    if (!lineId) return;
    state = shipProductFeature(state, lineId);
    for (let week = 2; week <= 40; week += 1) {
      state.week = week;
      processProductLines(state);
    }
    const line = state.productLines[0];
    expect(line.shippedFeatures).toHaveLength(1);
    expect(line.customers).toBeGreaterThan(0);
    expect(line.churned).toBeGreaterThan(0);
    expect(line.mrr).toBe(line.customers * line.price);
  });

  it("appoints a CEO, preserves relationships, and opens company two", () => {
    const state = newRun(803);
    const ceo = state.people[0];
    if (!ceo) throw new Error("Expected a cofounder");
    state.mrr = 12_000;
    state.valuation = 1_440_000;
    state.founder.relationships["investor-1"] = 67;
    const next = appointCeoAndStartCompany(state, ceo.id);
    expect(next.companyNumber).toBe(2);
    expect(next.portfolio).toHaveLength(1);
    expect(next.portfolio[0]?.ceoName).toBe(ceo.name);
    expect(next.portfolio[0]?.workspace).toBe("apartment");
    expect(next.founder.relationships["investor-1"]).toBe(67);
    expect(next.workspace).toBe("apartment");
    expect(next.mrr).toBe(0);
  });

  it("runs the old company at sixty-percent growth and pays founder dividends", () => {
    const state = newRun(804);
    const ceo = state.people[0];
    if (!ceo) throw new Error("Expected a cofounder");
    state.mrr = 100_000;
    state.cash = 100_000;
    const next = appointCeoAndStartCompany(state, ceo.id);
    const oldCompany = next.portfolio[0];
    if (!oldCompany) throw new Error("Expected a managed company");
    const founderCash = next.cash;
    const dividends = processPortfolio(next);
    expect(oldCompany.mrr).toBe(101_200);
    expect(dividends).toBeGreaterThan(0);
    expect(next.cash).toBeGreaterThan(founderCash);
    expect(next.holdingDividends).toBe(dividends);
  });
});
