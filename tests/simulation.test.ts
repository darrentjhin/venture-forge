import assert from "node:assert/strict";
import test from "node:test";
import { calculateRunway, processWeek } from "../lib/game/engine";
import { createGame } from "../lib/game/seed";

test("new founder starts with modest personal cash and no company", () => {
  const state = createGame({ name: "Alex Morgan", email: "alex@example.com", background: "Engineering" });
  assert.equal(state.personalCash, 2000);
  assert.equal(state.companyFormed, false);
  assert.equal(state.companyCash, 0);
});

test("weekly processing posts revenue and expenses exactly once", () => {
  const state = createGame({ name: "Alex Morgan", email: "alex@example.com", background: "Sales" });
  Object.assign(state, { companyFormed: true, companyCash: 10_000, productLaunched: true, customers: 10, price: 149 });
  const result = processWeek(state);
  assert.equal(result.summary.revenue, result.state.customers * 149);
  assert.equal(result.state.ledger.filter((entry) => entry.id === `rev-${result.state.week}`).length, 1);
  assert.equal(result.state.companyCash, 10_000 + result.summary.net);
});

test("runway falls when a salary is added", () => {
  const state = createGame({ name: "Alex Morgan", email: "alex@example.com", background: "Design" });
  Object.assign(state, { companyFormed: true, companyCash: 20_000 });
  const solo = calculateRunway(state);
  state.employees.push({ id: "e1", name: "Maya", role: "Engineer", skill: 80, morale: 80, weeklySalary: 2450, color: "#fff" });
  assert.ok(calculateRunway(state) < solo);
});

test("three distressed weeks close the company but preserve founder history", () => {
  let state = createGame({ name: "Alex Morgan", email: "alex@example.com", background: "Business" });
  Object.assign(state, { companyFormed: true, companyCash: -100, distressWeeks: 0 });
  state = processWeek(state).state;
  state = processWeek(state).state;
  state = processWeek(state).state;
  assert.equal(state.gameOver, true);
  assert.ok(state.history.some((entry) => entry.category === "Crisis"));
});
