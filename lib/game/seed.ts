import { CANDIDATES, PRODUCT_FEATURES } from "./config";
import { generateOpportunities, productCompletion } from "./engine";
import type { Background, Customer, GameState } from "./types";

const cloneFeatures = () => PRODUCT_FEATURES.map((feature) => ({ ...feature }));

export function createGame(input: { name: string; email: string; background: Background }): GameState {
  return {
    version: 2,
    saveId: crypto.randomUUID(),
    loggedIn: true,
    founderName: input.name,
    email: input.email,
    background: input.background,
    week: 1,
    year: 2027,
    personalCash: 2000,
    network: 8,
    reputation: 4,
    founderCapacity: 100,
    ideaResearch: 0,
    ideaName: "Relaydesk",
    companyFormed: false,
    companyName: "",
    businessStructure: "C-Corporation",
    companyCash: 0,
    founderContribution: 0,
    consultingLoad: 0,
    productFeatures: cloneFeatures(),
    selectedFeatureId: "workspace",
    productProgress: 0,
    productQuality: input.background === "Design" ? 45 : 32,
    productLaunched: false,
    price: 149,
    customerAccounts: [],
    opportunities: [],
    marketing: 0,
    morale: 82,
    office: "Apartment",
    officeState: { rooms: ["Founder desk", "Kitchen"], capacity: 2, activityEvents: [], visitorType: null },
    employees: [],
    snapshots: [],
    history: [{ id: "career-start", week: 1, category: "Founder", title: "A new founder career begins", detail: `${input.name} starts with $2,000, one laptop, and 100 points of attention per week.` }],
    ledger: [],
    pendingEvent: null,
    eventMemory: [],
    eventCooldowns: {},
    decisionFlags: [],
    milestones: [],
    runwayState: "Healthy",
    distressWeeks: 0,
    gameOver: false,
    selectedEmployeeId: null,
  };
}

export function migrateGame(raw: unknown): GameState {
  const legacy = raw as Record<string, unknown>;
  const background = (["Engineering", "Sales", "Design", "Business"].includes(String(legacy.background)) ? legacy.background : "Engineering") as Background;
  const base = createGame({ name: String(legacy.founderName ?? "Founder"), email: String(legacy.email ?? "founder@example.com"), background });
  if (legacy.version === 2) {
    const restored = { ...base, ...legacy } as GameState;
    restored.productFeatures = Array.isArray(legacy.productFeatures) ? legacy.productFeatures as GameState["productFeatures"] : base.productFeatures;
    restored.customerAccounts = Array.isArray(legacy.customerAccounts) ? legacy.customerAccounts as Customer[] : [];
    restored.opportunities = Array.isArray(legacy.opportunities) ? legacy.opportunities as GameState["opportunities"] : [];
    restored.employees = Array.isArray(legacy.employees) ? legacy.employees as GameState["employees"] : [];
    return restored;
  }

  const state: GameState = {
    ...base,
    saveId: String(legacy.saveId ?? base.saveId),
    loggedIn: Boolean(legacy.loggedIn ?? true),
    week: Number(legacy.week ?? 1),
    year: Number(legacy.year ?? 2027),
    personalCash: Number(legacy.personalCash ?? 2000),
    network: Number(legacy.network ?? 8),
    reputation: Number(legacy.reputation ?? 4),
    founderCapacity: Number(legacy.founderEnergy ?? 100),
    ideaResearch: Number(legacy.ideaResearch ?? 0),
    companyFormed: Boolean(legacy.companyFormed),
    companyName: String(legacy.companyName ?? ""),
    companyCash: Number(legacy.companyCash ?? 0),
    productQuality: Number(legacy.productQuality ?? base.productQuality),
    productLaunched: Boolean(legacy.productLaunched),
    price: Number(legacy.price ?? 149),
    marketing: Number(legacy.marketing ?? 0),
    morale: Number(legacy.morale ?? 82),
    office: (legacy.office ?? "Apartment") as GameState["office"],
    snapshots: Array.isArray(legacy.snapshots) ? (legacy.snapshots as Array<Record<string, number>>).map((snapshot) => ({ week: snapshot.week, cash: snapshot.cash, revenue: snapshot.revenue, expenses: snapshot.expenses, profit: snapshot.revenue - snapshot.expenses, mrr: snapshot.revenue * 4.33, customers: snapshot.customers })) : [],
    history: Array.isArray(legacy.history) ? legacy.history as GameState["history"] : base.history,
    ledger: Array.isArray(legacy.ledger) ? legacy.ledger as GameState["ledger"] : [],
    distressWeeks: Number(legacy.distressWeeks ?? 0),
    gameOver: Boolean(legacy.gameOver),
  };

  const legacyProgress = Number(legacy.productProgress ?? 0);
  let pointsToAssign = Math.round(legacyProgress / 100 * state.productFeatures.reduce((sum, feature) => sum + feature.pointsRequired, 0));
  for (const feature of state.productFeatures) {
    const assigned = Math.min(pointsToAssign, feature.pointsRequired);
    feature.progress = assigned;
    pointsToAssign -= assigned;
  }
  state.productProgress = productCompletion(state);

  const legacyEmployees = Array.isArray(legacy.employees) ? legacy.employees as Array<Record<string, unknown>> : [];
  state.employees = legacyEmployees.map((employee, index) => {
    const template = CANDIDATES.find((candidate) => candidate.id === employee.id || candidate.role === employee.role) ?? CANDIDATES[index % CANDIDATES.length];
    return { ...template, id: String(employee.id ?? template.id), name: String(employee.name ?? template.name), role: String(employee.role ?? template.role), morale: Number(employee.morale ?? template.morale), weeklySalary: Number(employee.weeklySalary ?? template.weeklySalary), color: String(employee.color ?? template.color) };
  });

  const legacyCustomerCount = Number(legacy.customers ?? 0);
  state.customerAccounts = Array.from({ length: legacyCustomerCount }, (_, index): Customer => ({ id: `migrated-customer-${index}`, name: `Legacy Account ${index + 1}`, segment: "SMB", employees: 18 + index, contractValue: state.price, need: index % 2 ? "Analytics" : "Approvals", satisfaction: 68, health: 70, relationship: 62, renewalWeek: state.week + 4 + index % 5, risk: "Low", startedWeek: Math.max(1, state.week - 4) }));
  const legacyPipeline = Number(legacy.salesPipeline ?? 0);
  if (legacyPipeline > 0) state.opportunities = generateOpportunities(state, Math.min(4, Math.max(1, Math.round(legacyPipeline / 4))));
  state.officeState.capacity = state.office === "Apartment" ? 2 : state.office === "Coworking" ? 6 : 12;
  return state;
}
