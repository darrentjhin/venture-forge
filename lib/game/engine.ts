import { OFFICE_CONFIG } from "./config";
import type { GameState, HistoryEvent, PendingEvent, WeekResult } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value);

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

function eventForWeek(state: GameState): PendingEvent | null {
  if (!state.companyFormed || state.pendingEvent || state.week < 5 || state.week % 4 !== 0) return null;
  const options: PendingEvent[] = [
    {
      id: `security-${state.week}`,
      eyebrow: "CUSTOMER REQUEST",
      title: "Security review lands on your desk",
      body: "A promising 22-seat customer will sign if you complete a lightweight security review this week.",
      choices: [
        { label: "Do it properly", detail: "Spend $1,200 · quality +4", cash: -1200, morale: -2, quality: 4 },
        { label: "Founder handles it", detail: "Spend $250 · morale -5", cash: -250, morale: -5, quality: 1 },
      ],
    },
    {
      id: `retention-${state.week}`,
      eyebrow: "TEAM SIGNAL",
      title: "Your best work is going unseen",
      body: "The team asks for a demo ritual to celebrate shipped work. It costs time, but could restore momentum.",
      choices: [
        { label: "Start Friday demos", detail: "Morale +8 · quality +2", cash: 0, morale: 8, quality: 2 },
        { label: "Stay focused", detail: "No cost · morale -4", cash: 0, morale: -4, quality: 0 },
      ],
    },
    {
      id: `outage-${state.week}`,
      eyebrow: "INCIDENT",
      title: "A launch-day outage tests the team",
      body: "Customers are locked out. You can absorb the cost of a fast fix or risk trust with a slower recovery.",
      choices: [
        { label: "Bring in specialist", detail: "Spend $1,800 · quality +5", cash: -1800, morale: 2, quality: 5 },
        { label: "Patch internally", detail: "Morale -7 · quality -2", cash: 0, morale: -7, quality: -2 },
      ],
    },
  ];
  return options[Math.floor(seeded(`${state.saveId}-${state.week}`) * options.length)];
}

export function calculateRunway(state: GameState) {
  const payroll = state.employees.reduce((sum, employee) => sum + employee.weeklySalary, 0);
  const fixed = payroll + OFFICE_CONFIG[state.office].weeklyCost + 190;
  const revenue = state.productLaunched ? state.customers * state.price : 0;
  const burn = Math.max(0, fixed - revenue);
  if (burn === 0) return Infinity;
  return state.companyCash / burn / 4.33;
}

export function processWeek(current: GameState): WeekResult {
  const state: GameState = structuredClone(current);
  state.week += 1;
  state.founderEnergy = clamp(state.founderEnergy + 22, 0, 100);

  const teamOutput = state.employees.reduce((sum, employee) => sum + employee.skill * (employee.morale / 100), 0);
  const backgroundProduct = state.background === "Engineering" ? 1.18 : 1;
  const productGain = state.companyFormed && !state.productLaunched
    ? round((5 + teamOutput / 35) * backgroundProduct)
    : state.productLaunched ? round(teamOutput / 95) : 0;
  state.productProgress = clamp(state.productProgress + productGain, 0, 100);

  const demandRoll = seeded(`${state.saveId}:demand:${state.week}`);
  const salesBonus = state.background === "Sales" ? 1.22 : 1;
  const qualityFactor = 0.55 + state.productQuality / 100;
  const demand = state.productLaunched
    ? Math.max(0, round((state.salesPipeline * 0.22 + state.marketing * 0.08 + 1) * qualityFactor * salesBonus * (0.82 + demandRoll * 0.36)))
    : 0;
  const churnRate = clamp(0.055 - state.productQuality / 2500 - state.employees.filter((e) => e.role === "Customer Success").length * 0.012, 0.008, 0.08);
  const churned = state.productLaunched ? Math.min(state.customers, Math.floor(state.customers * churnRate)) : 0;
  state.customers = Math.max(0, state.customers + demand - churned);
  state.salesPipeline = Math.max(0, round(state.salesPipeline * 0.62));
  state.marketing = Math.max(0, round(state.marketing * 0.76));

  const revenue = state.productLaunched ? state.customers * state.price : 0;
  const payroll = state.employees.reduce((sum, employee) => sum + employee.weeklySalary, 0);
  const baseOps = state.companyFormed ? 190 + state.customers * 5 : 0;
  const officeCost = OFFICE_CONFIG[state.office].weeklyCost;
  const rawExpenses = payroll + baseOps + officeCost;
  const expenses = state.background === "Business" ? round(rawExpenses * 0.88) : rawExpenses;

  if (state.companyFormed) {
    state.companyCash += revenue - expenses;
    state.ledger.unshift(
      { id: `rev-${state.week}`, week: state.week, label: "Customer subscriptions", amount: revenue, account: "Company" },
      { id: `ops-${state.week}`, week: state.week, label: "Payroll & operations", amount: -expenses, account: "Company" },
    );
  }

  const workload = state.employees.length >= OFFICE_CONFIG[state.office].capacity ? -5 : 0;
  state.morale = clamp(state.morale + OFFICE_CONFIG[state.office].morale + workload - (state.companyCash < 2500 ? 4 : 0), 25, 100);
  state.employees = state.employees.map((employee) => ({ ...employee, morale: clamp(round((employee.morale + state.morale) / 2), 25, 100) }));

  const net = revenue - expenses;
  state.snapshots.push({ week: state.week, cash: state.companyCash, revenue, expenses, customers: state.customers });
  state.snapshots = state.snapshots.slice(-20);

  if (state.companyFormed && state.companyCash < 0) state.distressWeeks += 1;
  else state.distressWeeks = 0;

  if (state.distressWeeks >= 3 || state.companyCash < -5000) {
    state.gameOver = true;
    state.history.unshift(history(state, "Crisis", "The company ran out of runway", "After three weeks unable to cover obligations, operations ceased."));
  }
  if (state.productProgress >= 100 && !current.productLaunched && !state.productLaunched) {
    state.history.unshift(history(state, "Product", "MVP ready for launch", "The first working release is ready. You decide when it meets the market."));
  }
  if (state.customers >= 10 && current.customers < 10) {
    state.history.unshift(history(state, "Milestone", "First 10 customers", "Relaydesk found its first small pocket of repeatable demand."));
  }
  state.pendingEvent = eventForWeek(state);

  return { state, summary: { revenue, expenses, net, newCustomers: demand, churned, productGain } };
}

export function history(state: GameState, category: HistoryEvent["category"], title: string, detail: string): HistoryEvent {
  return { id: `${category}-${state.week}-${Date.now()}`, week: state.week, category, title, detail };
}
