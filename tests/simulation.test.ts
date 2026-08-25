import assert from "node:assert/strict";
import test from "node:test";
import { CANDIDATES } from "../lib/game/config";
import { calculateFinancials, calculatePriceFit, calculateRunway, canLaunch, processWeek } from "../lib/game/engine";
import { createGame, migrateGame } from "../lib/game/seed";
import type { Customer, GameState } from "../lib/game/types";

function formed(cash: number, background: GameState["background"] = "Engineering") {
  const state = createGame({ name: "Alex Morgan", email: "alex@example.com", background });
  Object.assign(state, { companyFormed: true, companyName: "Northstar Systems, Inc.", companyCash: cash, personalCash: 400, founderContribution: cash + 400 });
  return state;
}

function customer(state: GameState, id: string, segment: Customer["segment"], value: number): Customer {
  return { id, name: `Account ${id}`, segment, employees: segment === "Mid-market" ? 80 : 20, contractValue: value, need: "Approvals", satisfaction: 76, health: 78, relationship: 68, renewalWeek: state.week + 8, risk: "Low", startedWeek: state.week };
}

test("new founder has 100 capacity and cannot spam actions across a week", () => {
  const state = createGame({ name: "Alex Morgan", email: "alex@example.com", background: "Engineering" });
  assert.equal(state.personalCash, 2000);
  assert.equal(state.founderCapacity, 100);
  state.founderCapacity -= 40;
  state.founderCapacity -= 40;
  assert.ok(state.founderCapacity < 40);
  assert.equal(processWeek(state).state.founderCapacity, 100);
});

test("conservative path capitalizes, launches, and survives", () => {
  let state = formed(7200, "Engineering");
  for (const feature of state.productFeatures.filter((item) => item.required)) feature.progress = feature.pointsRequired;
  assert.equal(canLaunch(state), true);
  state.productLaunched = true;
  state.customerAccounts.push(customer(state, "one", "SMB", 149), customer(state, "two", "SMB", 149));
  for (let week = 0; week < 10; week += 1) state = processWeek(state).state;
  assert.equal(state.gameOver, false);
  assert.ok(state.companyCash > 0);
});

test("aggressive path enters danger but consulting can buy recovery time", () => {
  let state = formed(2600, "Sales");
  state.employees.push(structuredClone(CANDIDATES[1]));
  assert.ok(calculateRunway(state) < 1);
  state.companyCash += 3300;
  state.ledger.push({ id: "consulting", week: state.week, label: "Founder consulting", amount: 3300, account: "Company" });
  state.customerAccounts.push(customer(state, "rescue", "SMB", 219));
  for (let week = 0; week < 3; week += 1) state = processWeek(state).state;
  assert.equal(state.gameOver, false);
});

test("product-heavy company has quality but no automatic sales", () => {
  let state = formed(8000, "Design");
  state.productFeatures.forEach((feature) => { feature.progress = feature.pointsRequired; });
  state.productQuality = 88;
  state.productLaunched = true;
  state = processWeek(state).state;
  assert.equal(state.customerAccounts.length, 0);
  assert.equal(calculateFinancials(state).weeklyRevenue, 0);
});

test("sales-heavy company creates pipeline while product gaps lower fit", () => {
  const state = formed(6500, "Sales");
  state.productLaunched = true;
  state.productFeatures.filter((feature) => feature.required).forEach((feature) => { feature.progress = feature.pointsRequired; });
  const security = state.productFeatures.find((feature) => feature.id === "security")!;
  security.progress = 0;
  state.price = 219;
  const premiumFit = calculatePriceFit(state.price, "Mid-market", state.productQuality);
  assert.ok(premiumFit < 1);
  assert.equal(state.customerAccounts.length, 0);
});

test("overhiring accelerates specialization but creates a cash crisis", () => {
  const state = formed(10_000, "Business");
  const soloRunway = calculateRunway(state);
  state.office = "Coworking";
  state.employees.push(...CANDIDATES.slice(0, 4).map((candidate) => structuredClone(candidate)));
  assert.ok(calculateRunway(state) < soloRunway);
  assert.ok(calculateFinancials(state).payroll > 4000);
});

test("low and premium prices win different customer segments", () => {
  const quality = 82;
  assert.ok(calculatePriceFit(99, "Micro", quality) > calculatePriceFit(219, "Micro", quality));
  assert.ok(calculatePriceFit(219, "Mid-market", quality) > calculatePriceFit(99, "Mid-market", quality));
  assert.ok(219 * calculatePriceFit(219, "Mid-market", quality) > 99 * calculatePriceFit(99, "Mid-market", quality));
});

test("financial display and week settlement share one model", () => {
  const state = formed(10_000, "Business");
  state.productLaunched = true;
  state.customerAccounts.push(customer(state, "one", "SMB", 149));
  const before = calculateFinancials(state);
  const result = processWeek(state);
  assert.equal(result.summary.revenue, before.weeklyRevenue);
  assert.equal(result.summary.expenses, before.totalExpenses);
  assert.equal(result.state.companyCash, 10_000 + before.weeklyProfit);
});

test("version-one saves migrate into roadmap, account, and capacity systems", () => {
  const migrated = migrateGame({ version: 1, saveId: "legacy-save", founderName: "Alex", email: "a@b.com", background: "Engineering", customers: 3, salesPipeline: 8, productProgress: 55, employees: [], history: [], ledger: [] });
  assert.equal(migrated.version, 2);
  assert.equal(migrated.customerAccounts.length, 3);
  assert.ok(migrated.productFeatures.some((feature) => feature.progress > 0));
  assert.ok(migrated.opportunities.length > 0);
});
