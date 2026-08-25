import { CUSTOMER_NEEDS, OFFICE_CONFIG, PIPELINE_STAGES, PROSPECT_NAMES } from "./config";
import type { Customer, CustomerNeed, EventEffects, Financials, GameState, HistoryEvent, Opportunity, PendingEvent, ProductFeature, RunwayState, WeekResult } from "./types";

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value);

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

export function featureComplete(feature: ProductFeature) {
  return feature.progress >= feature.pointsRequired;
}

export function canLaunch(state: GameState) {
  return state.productFeatures.filter((feature) => feature.required).every(featureComplete);
}

export function featureByNeed(state: GameState, need: CustomerNeed) {
  const map: Record<CustomerNeed, string> = { Approvals: "approvals", Analytics: "analytics", Security: "security", Mobile: "mobile", Billing: "billing", Reliability: "workspace" };
  return state.productFeatures.find((feature) => feature.id === map[need]);
}

export function productCompletion(state: GameState) {
  const earned = state.productFeatures.reduce((sum, feature) => sum + Math.min(feature.progress, feature.pointsRequired), 0);
  const possible = state.productFeatures.reduce((sum, feature) => sum + feature.pointsRequired, 0);
  return round(earned / possible * 100);
}

export function calculatePriceFit(price: number, segment: Customer["segment"], quality: number) {
  const ideal = segment === "Micro" ? 99 : segment === "SMB" ? 149 : 219;
  const distance = Math.abs(price - ideal);
  let fit = clamp(1 - distance / 220, .28, 1.08);
  if (price >= 219 && quality < 68) fit *= .62;
  if (price <= 99 && segment === "Mid-market") fit *= .55;
  return fit;
}

export function runwayStateFor(months: number): RunwayState {
  if (months >= 6 || months === Infinity) return "Healthy";
  if (months >= 3) return "Watch";
  if (months >= 1) return "Danger";
  return "Critical";
}

export function calculateFinancials(state: GameState): Financials {
  const weeklyRevenue = state.productLaunched ? state.customerAccounts.reduce((sum, customer) => sum + customer.contractValue, 0) : 0;
  const payroll = state.employees.reduce((sum, employee) => sum + employee.weeklySalary, 0);
  const officeCost = state.companyFormed ? OFFICE_CONFIG[state.office].weeklyCost : 0;
  const baseOperations = state.companyFormed ? 190 : 0;
  const customerCosts = state.productLaunched ? state.customerAccounts.reduce((sum, customer) => sum + (customer.contractValue <= 99 ? 28 : customer.contractValue >= 219 ? 24 : 18), 0) : 0;
  const adjustable = officeCost + baseOperations + customerCosts;
  const totalExpenses = payroll + (state.background === "Business" ? round(adjustable * .88) : adjustable);
  const weeklyProfit = weeklyRevenue - totalExpenses;
  const weeklyBurn = Math.max(0, -weeklyProfit);
  const monthlyBurn = weeklyBurn * 4.33;
  const runwayMonths = weeklyBurn === 0 ? Infinity : Math.max(0, state.companyCash / weeklyBurn / 4.33);
  const grossMargin = weeklyRevenue === 0 ? 0 : round((weeklyRevenue - customerCosts) / weeklyRevenue * 100);
  return { weeklyRevenue, monthlyRecurringRevenue: round(weeklyRevenue * 4.33), annualRecurringRevenue: round(weeklyRevenue * 52), payroll, officeCost, baseOperations, customerCosts, totalExpenses, weeklyProfit, weeklyBurn, monthlyBurn, grossMargin, runwayMonths, runwayState: runwayStateFor(runwayMonths) };
}

export function calculateRunway(state: GameState) {
  return calculateFinancials(state).runwayMonths;
}

function needFit(state: GameState, need: CustomerNeed) {
  const feature = featureByNeed(state, need);
  if (!feature) return .65;
  return featureComplete(feature) ? 1.12 : .56 + (feature.progress / feature.pointsRequired) * .42;
}

function opportunityProbability(state: GameState, opportunity: Opportunity) {
  const quality = state.productQuality;
  const priceFit = calculatePriceFit(state.price, opportunity.segment, quality);
  const productFit = needFit(state, opportunity.need);
  const salesSkill = Math.max(0, ...state.employees.map((employee) => employee.skills.sales));
  const founderEdge = state.background === "Sales" ? 14 : state.background === "Design" ? 4 : 0;
  const relationshipEffort = opportunity.founderEffort * .32;
  return clamp(round(18 + priceFit * 27 + productFit * 22 + salesSkill * .18 + founderEdge + relationshipEffort), 8, 92);
}

export function generateOpportunities(state: GameState, count = 2): Opportunity[] {
  const existing = new Set(state.opportunities.map((opportunity) => opportunity.name));
  const opportunities: Opportunity[] = [];
  for (let i = 0; i < PROSPECT_NAMES.length && opportunities.length < count; i += 1) {
    const name = PROSPECT_NAMES[(state.week + i * 3 + state.opportunities.length) % PROSPECT_NAMES.length];
    if (existing.has(name)) continue;
    const roll = seeded(`${state.saveId}:prospect:${state.week}:${i}`);
    const segment: Customer["segment"] = roll > .78 ? "Mid-market" : roll > .28 ? "SMB" : "Micro";
    const need = CUSTOMER_NEEDS[Math.floor(seeded(`${name}:need`) * CUSTOMER_NEEDS.length)];
    const employees = segment === "Micro" ? 7 + Math.floor(roll * 8) : segment === "SMB" ? 18 + Math.floor(roll * 34) : 55 + Math.floor(roll * 80);
    const potentialValue = segment === "Micro" ? 99 : segment === "SMB" ? state.price : Math.max(219, state.price);
    const draft: Opportunity = { id: `opp-${state.week}-${i}-${name.replace(/\W/g, "").toLowerCase()}`, name, segment, employees, stage: state.background === "Sales" ? "Contacted" : "Lead", potentialValue, need, fit: "Medium", probability: 35, decisionWeek: state.week + (segment === "Mid-market" ? 5 : 3), founderEffort: state.background === "Sales" ? 12 : 0, createdWeek: state.week };
    draft.probability = opportunityProbability(state, draft);
    draft.fit = draft.probability >= 68 ? "High" : draft.probability >= 42 ? "Medium" : "Low";
    opportunities.push(draft);
  }
  return opportunities;
}

function createCustomer(state: GameState, opportunity: Opportunity): Customer {
  const satisfaction = clamp(round(50 + needFit(state, opportunity.need) * 22 + (state.background === "Design" ? 10 : 0) - (state.price >= 219 && state.productQuality < 70 ? 12 : 0)), 28, 94);
  return { id: `customer-${opportunity.id}`, name: opportunity.name, segment: opportunity.segment, employees: opportunity.employees, contractValue: opportunity.potentialValue, need: opportunity.need, satisfaction, health: satisfaction, relationship: clamp(48 + opportunity.founderEffort, 30, 95), renewalWeek: state.week + (opportunity.segment === "Mid-market" ? 13 : 8), risk: satisfaction >= 72 ? "Low" : satisfaction >= 52 ? "Medium" : "High", startedWeek: state.week };
}

type EventDefinition = Omit<PendingEvent, "id"> & { key: string; minWeek: number; cooldown: number; when: (state: GameState, financials: Financials) => boolean };

const event = (key: string, category: PendingEvent["category"], minWeek: number, cooldown: number, title: string, body: string, choices: PendingEvent["choices"], when: EventDefinition["when"]): EventDefinition => ({ key, category, minWeek, cooldown, eyebrow: category, title, body, choices, when });

const EVENTS: EventDefinition[] = [
  event("feature-request", "CUSTOMER", 8, 10, "A customer asks for one more thing", "A healthy account wants its missing core need moved up the roadmap.", [{ label: "Promise the feature", detail: "Relationship +10 · roadmap pressure", effects: { customerHealth: 7, morale: -3, flag: "promised-feature" } }, { label: "Protect the roadmap", detail: "Relationship -8 · team stays focused", effects: { customerHealth: -7, morale: 2 } }], (s) => s.customerAccounts.length > 0),
  event("security-review", "SECURITY", 8, 12, "The deal now needs a security review", "A serious prospect has asked how Relaydesk protects client data.", [{ label: "Commission the review", detail: "$1,100 · security +7 points", effects: { cash: -1100, featureId: "security", featurePoints: 7, reputation: 2 } }, { label: "Answer honestly", detail: "Save cash · deal confidence falls", effects: { reputation: -2, flag: "security-gap-admitted" } }], (s) => s.opportunities.some((o) => o.need === "Security" && ["Demo", "Proposal", "Negotiation"].includes(o.stage))),
  event("renewal-risk", "CUSTOMER", 10, 8, "A renewal is no longer automatic", "A customer has gone quiet while their renewal approaches.", [{ label: "Founder check-in", detail: "20 capacity · account health +12", effects: { capacity: -20, customerHealth: 12 } }, { label: "Let the product speak", detail: "No time cost · account health -6", effects: { customerHealth: -6 } }], (s) => s.customerAccounts.some((c) => c.renewalWeek - s.week <= 2 && c.health < 65)),
  event("customer-referral", "CUSTOMER", 9, 14, "A customer offers an introduction", "A champion will introduce you to another agency if you make time for the relationship.", [{ label: "Take the introduction", detail: "15 capacity · warmer pipeline", effects: { capacity: -15, reputation: 3, flag: "referral-earned" } }, { label: "Stay focused", detail: "No change", effects: {} }], (s) => s.customerAccounts.some((c) => c.relationship > 72)),
  event("founder-fatigue", "FOUNDER", 5, 10, "The pace is becoming visible", "Late nights are buying progress, but judgment is beginning to slip.", [{ label: "Take a slower week", detail: "Morale +9 · capacity -20", effects: { morale: 9, capacity: -20 } }, { label: "Keep pushing", detail: "Morale -8 · product +3", effects: { morale: -8, featurePoints: 3 } }], (s) => s.morale < 62 || s.consultingLoad >= 40),
  event("founder-network", "FOUNDER", 4, 12, "An experienced operator offers an hour", "A former SaaS founder is willing to pressure-test your plan.", [{ label: "Take the meeting", detail: "15 capacity · reputation +4", effects: { capacity: -15, reputation: 4 } }, { label: "Decline politely", detail: "Keep the week clear", effects: {} }], (s) => s.network >= 12),
  event("candidate-counter", "EMPLOYEE", 7, 12, "A candidate wants more certainty", "Your preferred candidate asks for a stronger offer before joining.", [{ label: "Improve the offer", detail: "$500 · team morale +3", effects: { cash: -500, morale: 3, flag: "candidate-won" } }, { label: "Hold the line", detail: "Preserve cash", effects: { reputation: -1 } }], (s) => s.companyFormed && s.employees.length < 3),
  event("overload", "EMPLOYEE", 8, 7, "The workload is not sustainable", "One of your teammates has been carrying too much for too long.", [{ label: "Cut the sprint scope", detail: "Morale +10 · product slows", effects: { morale: 10, featurePoints: -3 } }, { label: "Pay a spot bonus", detail: "$600 · morale +7", effects: { cash: -600, morale: 7 } }], (s) => s.employees.some((e) => e.workload > 76)),
  event("team-demo", "EMPLOYEE", 7, 10, "The team wants a weekly demo ritual", "Celebrating shipped work costs time but could improve alignment.", [{ label: "Start Friday demos", detail: "Morale +8 · quality +2", effects: { morale: 8, quality: 2, flag: "friday-demos" } }, { label: "Stay focused", detail: "Morale -3", effects: { morale: -3 } }], (s) => s.employees.length >= 1),
  event("production-bug", "PRODUCT", 8, 8, "A production bug reaches customers", "A workflow is intermittently losing approval comments.", [{ label: "Stop and fix it", detail: "Product +5 · morale -2", effects: { featureId: "workspace", featurePoints: 5, quality: 3, morale: -2 } }, { label: "Patch around it", detail: "$250 · quality -3", effects: { cash: -250, quality: -3, customerHealth: -5 } }], (s) => s.productLaunched && s.productQuality < 72),
  event("design-debt", "PRODUCT", 6, 12, "New users are missing the main action", "Session notes show that onboarding is not as obvious as the team believed.", [{ label: "Rework onboarding", detail: "Product +4 · quality +5", effects: { featureId: "workspace", featurePoints: 4, quality: 5 } }, { label: "Add help text", detail: "$150 · quality +1", effects: { cash: -150, quality: 1 } }], (s) => s.productLaunched && !s.employees.some((e) => e.skills.design > 70)),
  event("analytics-gap", "PRODUCT", 9, 10, "A buyer cannot prove the ROI", "The prospect likes Relaydesk but needs reporting before finance will approve it.", [{ label: "Pull analytics forward", detail: "Analytics +6 · morale -3", effects: { featureId: "analytics", featurePoints: 6, morale: -3 } }, { label: "Sell the vision", detail: "Reputation at risk", effects: { reputation: -1, flag: "sold-without-analytics" } }], (s) => s.opportunities.some((o) => o.need === "Analytics" && ["Proposal", "Negotiation"].includes(o.stage))),
  event("late-invoice", "FINANCE", 9, 10, "A customer payment is late", "The contract is sound, but cash will land a week later than planned.", [{ label: "Call the owner", detail: "10 capacity · collect $450", effects: { capacity: -10, cash: 450, reputation: 1 } }, { label: "Wait", detail: "Cash timing worsens", effects: { cash: -200 } }], (s) => s.customerAccounts.length >= 3),
  event("runway-plan", "FINANCE", 4, 7, "Runway has entered the danger zone", "You still have options, but waiting will narrow them.", [{ label: "Freeze discretionary spend", detail: "Cash +$300 · morale -3", effects: { cash: 300, morale: -3, flag: "spend-freeze" } }, { label: "Bet on momentum", detail: "Reputation +2 · risk remains", effects: { reputation: 2 } }], (_s, f) => f.runwayState === "Danger" || f.runwayState === "Critical"),
  event("tax-estimate", "FINANCE", 12, 18, "The first tax estimate arrives", "Profit is good news, but some of the cash is not truly available.", [{ label: "Reserve it now", detail: "$700 · operations confidence", effects: { cash: -700, reputation: 2 } }, { label: "Keep cash working", detail: "Short-term cash · future risk", effects: { flag: "tax-deferred" } }], (s) => s.snapshots.some((snapshot) => snapshot.profit > 0)),
  event("competitor-price", "COMPETITOR", 7, 12, "Ledgerly cuts its price", "A visible competitor is now telling the market that client operations software should be cheap.", [{ label: "Hold positioning", detail: "Reputation +3", effects: { reputation: 3 } }, { label: "Match them", detail: "Price moves to $99", effects: { flag: "match-price" } }], (s) => s.productLaunched),
  event("competitor-feature", "COMPETITOR", 10, 14, "A competitor launches analytics", "Prospects will now compare your roadmap against a feature they can already see.", [{ label: "Respond on roadmap", detail: "Analytics +5", effects: { featureId: "analytics", featurePoints: 5 } }, { label: "Differentiate elsewhere", detail: "Reputation +2", effects: { reputation: 2 } }], (s) => s.productLaunched && !featureComplete(s.productFeatures.find((f) => f.id === "analytics")!)),
  event("vendor-outage", "OPERATIONS", 8, 12, "A critical vendor goes down", "The product is available, but notifications are delayed.", [{ label: "Add redundancy", detail: "$900 · quality +4", effects: { cash: -900, quality: 4 } }, { label: "Wait it out", detail: "Customer health -6", effects: { customerHealth: -6 } }], (s) => s.productLaunched),
  event("office-friction", "OPERATIONS", 7, 10, "The apartment is slowing everyone down", "Calls overlap, the kitchen table is full, and focus is becoming scarce.", [{ label: "Trial coworking", detail: "$300 · morale +5", effects: { cash: -300, morale: 5 } }, { label: "Make it work", detail: "Morale -5", effects: { morale: -5 } }], (s) => s.office === "Apartment" && s.employees.length >= 1),
  event("support-spike", "OPERATIONS", 8, 9, "Support volume doubles", "Several small customers need help at the same time.", [{ label: "Founder handles support", detail: "25 capacity · health +8", effects: { capacity: -25, customerHealth: 8 } }, { label: "Write better guides", detail: "$350 · quality +2", effects: { cash: -350, quality: 2 } }], (s) => s.customerAccounts.length >= 4 && !s.employees.some((e) => e.skills.customerSuccess > 70)),
  event("phishing", "SECURITY", 9, 14, "A convincing phishing email reaches the team", "No breach has occurred, but the attempt reveals a process gap.", [{ label: "Train the team", detail: "$400 · morale +2 · security +3", effects: { cash: -400, morale: 2, featureId: "security", featurePoints: 3 } }, { label: "Send a warning", detail: "No cost · reputation risk", effects: { reputation: -1 } }], (s) => s.employees.length >= 2),
  event("market-tailwind", "MARKET", 6, 14, "Agencies are rethinking client operations", "A widely shared report has made your problem category unusually visible.", [{ label: "Ride the moment", detail: "$600 · marketing signal", effects: { cash: -600, reputation: 5, flag: "market-tailwind" } }, { label: "Stay disciplined", detail: "Keep cash", effects: { reputation: 1 } }], (s) => s.productLaunched),
  event("market-slowdown", "MARKET", 12, 16, "Buyers are taking longer to decide", "Budget scrutiny is stretching sales cycles across the market.", [{ label: "Target smaller teams", detail: "Pipeline adapts · reputation -1", effects: { reputation: -1, flag: "downmarket" } }, { label: "Hold the segment", detail: "Longer decisions · positioning holds", effects: { reputation: 2 } }], (s) => s.opportunities.length >= 3),
  event("large-prospect", "MARKET", 10, 16, "A larger prospect appears early", "They could transform revenue, but their expectations exceed the current product.", [{ label: "Pursue the account", detail: "20 capacity · pressure rises", effects: { capacity: -20, morale: -3, flag: "enterprise-pursuit" } }, { label: "Refer them elsewhere", detail: "Reputation +3", effects: { reputation: 3 } }], (s) => s.productLaunched && s.reputation >= 8),
];

function nextEvent(state: GameState, financials: Financials) {
  if (!state.companyFormed || state.pendingEvent || state.week < 4 || state.week % 2 !== 0) return null;
  const eligible = EVENTS.filter((definition) => definition.minWeek <= state.week && (state.eventCooldowns[definition.key] ?? 0) <= state.week && definition.when(state, financials));
  if (!eligible.length) return null;
  const picked = eligible[Math.floor(seeded(`${state.saveId}:event:${state.week}`) * eligible.length)];
  state.eventCooldowns[picked.key] = state.week + picked.cooldown;
  state.eventMemory.push(picked.key);
  return { id: `${picked.key}-${state.week}`, category: picked.category, eyebrow: picked.eyebrow, title: picked.title, body: picked.body, choices: picked.choices } satisfies PendingEvent;
}

export function resolveEventChoice(current: GameState, choiceIndex: number): GameState {
  if (!current.pendingEvent) return current;
  const state: GameState = structuredClone(current);
  const selectedEvent = state.pendingEvent!;
  const choice = selectedEvent.choices[choiceIndex];
  const effects: EventEffects = choice.effects;
  if (effects.cash) state.companyCash += effects.cash;
  if (effects.morale) state.morale = clamp(state.morale + effects.morale, 20, 100);
  if (effects.quality) state.productQuality = clamp(state.productQuality + effects.quality, 10, 100);
  if (effects.reputation) state.reputation = clamp(state.reputation + effects.reputation, 0, 100);
  if (effects.capacity) state.founderCapacity = clamp(state.founderCapacity + effects.capacity, 0, 100);
  if (effects.featurePoints) {
    const target = state.productFeatures.find((feature) => feature.id === effects.featureId) ?? state.productFeatures.find((feature) => feature.id === state.selectedFeatureId);
    if (target) target.progress = clamp(target.progress + effects.featurePoints, 0, target.pointsRequired);
  }
  if (effects.customerHealth && state.customerAccounts.length) {
    const customer = [...state.customerAccounts].sort((a, b) => a.health - b.health)[0];
    customer.health = clamp(customer.health + effects.customerHealth, 0, 100);
    customer.satisfaction = clamp(customer.satisfaction + round(effects.customerHealth * .6), 0, 100);
  }
  if (effects.flag === "match-price") state.price = 99;
  else if (effects.flag) state.decisionFlags.push(effects.flag);
  if (effects.cash) state.ledger.unshift({ id: `event-${Date.now()}`, week: state.week, label: selectedEvent.title, amount: effects.cash, account: "Company" });
  state.history.unshift(history(state, effects.morale && effects.morale < -4 ? "Crisis" : "Milestone", selectedEvent.title, `Decision: ${choice.label}. ${choice.detail}`));
  state.pendingEvent = null;
  state.productProgress = productCompletion(state);
  return state;
}

const MILESTONES = [
  { key: "saved-5k", title: "First $5K saved", when: (s: GameState) => !s.companyFormed && s.personalCash >= 5000 },
  { key: "idea-validated", title: "Business idea validated", when: (s: GameState) => s.ideaResearch >= 60 },
  { key: "company-formed", title: "Company formed", when: (s: GameState) => s.companyFormed },
  { key: "mvp-ready", title: "MVP ready", when: (s: GameState) => canLaunch(s) },
  { key: "product-launched", title: "Product launched", when: (s: GameState) => s.productLaunched },
  { key: "first-lead", title: "First lead", when: (s: GameState) => s.opportunities.length > 0 },
  { key: "first-customer", title: "First customer", when: (s: GameState) => s.customerAccounts.length > 0 },
  { key: "first-1k-mrr", title: "First $1K MRR", when: (_s: GameState, f: Financials) => f.monthlyRecurringRevenue >= 1000 },
  { key: "first-employee", title: "First employee", when: (s: GameState) => s.employees.length > 0 },
  { key: "first-office", title: "First office", when: (s: GameState) => s.office !== "Apartment" },
  { key: "profitable-week", title: "First profitable week", when: (s: GameState, f: Financials) => s.productLaunched && f.weeklyProfit > 0 },
  { key: "ten-customers", title: "10 customers", when: (s: GameState) => s.customerAccounts.length >= 10 },
  { key: "twenty-five-customers", title: "25 customers", when: (s: GameState) => s.customerAccounts.length >= 25 },
  { key: "ten-k-mrr", title: "$10K MRR", when: (_s: GameState, f: Financials) => f.monthlyRecurringRevenue >= 10_000 },
];

function processMilestones(state: GameState, financials: Financials, happenings: string[]) {
  for (const milestone of MILESTONES) {
    if (!state.milestones.includes(milestone.key) && milestone.when(state, financials)) {
      state.milestones.push(milestone.key);
      state.history.unshift(history(state, "Milestone", milestone.title, `Reached in Week ${state.week}.`));
      happenings.push(`Milestone: ${milestone.title}.`);
    }
  }
}

function processProduct(state: GameState, happenings: string[]) {
  if (!state.companyFormed) return 0;
  const target = state.productFeatures.find((feature) => feature.id === state.selectedFeatureId) ?? state.productFeatures[0];
  if (!target || featureComplete(target)) return 0;
  const engineers = state.employees.reduce((sum, employee) => sum + employee.skills.engineering * (employee.morale / 100) * (1 - employee.workload / 180), 0);
  const productSupport = state.employees.reduce((sum, employee) => sum + employee.skills.product * .18, 0);
  const consultingPenalty = state.consultingLoad > 0 ? .78 : 1;
  const gain = round((engineers * .065 + productSupport * .018) * consultingPenalty);
  if (gain <= 0) return 0;
  const wasComplete = featureComplete(target);
  target.progress = clamp(target.progress + gain, 0, target.pointsRequired);
  if (!wasComplete && featureComplete(target)) {
    happenings.push(`${target.name} shipped.`);
    state.history.unshift(history(state, "Product", `${target.name} shipped`, target.effect));
    state.productQuality = clamp(state.productQuality + (target.required ? 5 : 7) + (state.background === "Design" ? 3 : 0), 10, 100);
  }
  return gain;
}

function processPipeline(state: GameState, happenings: string[]) {
  let won = 0;
  const salesCapacity = state.employees.reduce((sum, employee) => sum + employee.skills.sales, 0);
  const active = state.opportunities.filter((opportunity) => !["Won", "Lost"].includes(opportunity.stage));
  const autoSlots = Math.floor(salesCapacity / 65);
  active.forEach((opportunity, index) => {
    opportunity.probability = opportunityProbability(state, opportunity);
    opportunity.fit = opportunity.probability >= 68 ? "High" : opportunity.probability >= 42 ? "Medium" : "Low";
    const shouldAdvance = opportunity.founderEffort >= 15 || index < autoSlots;
    if (shouldAdvance) {
      const stageIndex = PIPELINE_STAGES.indexOf(opportunity.stage as typeof PIPELINE_STAGES[number]);
      const steps = opportunity.founderEffort >= 35 ? 2 : 1;
      const nextIndex = Math.min(PIPELINE_STAGES.length - 1, Math.max(0, stageIndex) + steps);
      const previous = opportunity.stage;
      opportunity.stage = PIPELINE_STAGES[nextIndex];
      if (opportunity.stage !== previous) happenings.push(`${opportunity.name} moved to ${opportunity.stage.toLowerCase()}.`);
    }
    const readyToDecide = opportunity.stage === "Negotiation" || (opportunity.decisionWeek <= state.week && ["Proposal", "Negotiation"].includes(opportunity.stage));
    if (readyToDecide) {
      const roll = seeded(`${state.saveId}:deal:${opportunity.id}:${state.week}`) * 100;
      if (roll <= opportunity.probability) {
        opportunity.stage = "Won";
        const customer = createCustomer(state, opportunity);
        state.customerAccounts.push(customer);
        won += 1;
        happenings.push(`${opportunity.name} signed at $${customer.contractValue}/week.`);
        state.history.unshift(history(state, "Sales", `${opportunity.name} became a customer`, `${opportunity.segment} account signed for $${customer.contractValue} per week.`));
      } else {
        opportunity.stage = "Lost";
        happenings.push(`${opportunity.name} chose not to buy.`);
      }
    }
    opportunity.founderEffort = 0;
  });
  return won;
}

function processCustomers(state: GameState, happenings: string[]) {
  const before = state.customerAccounts.length;
  const csSkill = state.employees.reduce((sum, employee) => sum + employee.skills.customerSuccess, 0);
  state.customerAccounts = state.customerAccounts.filter((customer) => {
    const fit = needFit(state, customer.need);
    const support = csSkill ? Math.min(9, csSkill / 32) : 0;
    customer.satisfaction = clamp(round(customer.satisfaction + (fit - .82) * 6 + support - (customer.contractValue >= 219 && state.productQuality < 68 ? 4 : 0)), 12, 98);
    customer.health = clamp(round(customer.health * .72 + customer.satisfaction * .28), 10, 98);
    customer.risk = customer.health >= 70 ? "Low" : customer.health >= 48 ? "Medium" : "High";
    if (customer.renewalWeek <= state.week) {
      const renewalChance = clamp(customer.health + customer.relationship * .18 + (state.background === "Design" ? 5 : 0), 18, 96);
      if (seeded(`${state.saveId}:renew:${customer.id}:${state.week}`) * 100 > renewalChance) {
        happenings.push(`${customer.name} churned at renewal.`);
        state.history.unshift(history(state, "Customer", `${customer.name} did not renew`, `${customer.need} remained their primary concern.`));
        return false;
      }
      customer.renewalWeek += customer.segment === "Mid-market" ? 13 : 8;
      customer.relationship = clamp(customer.relationship + 3, 0, 100);
      happenings.push(`${customer.name} renewed.`);
    }
    return true;
  });
  return before - state.customerAccounts.length;
}

function unresolvedThreads(state: GameState, financials: Financials) {
  const threads: string[] = [];
  const feature = state.productFeatures.find((item) => item.id === state.selectedFeatureId);
  if (feature && !featureComplete(feature)) threads.push(`${feature.name} needs ${feature.pointsRequired - feature.progress} more engineering points.`);
  const decision = state.opportunities.filter((o) => !["Won", "Lost"].includes(o.stage)).sort((a, b) => a.decisionWeek - b.decisionWeek)[0];
  if (decision) threads.push(`${decision.name} expects a decision by Week ${decision.decisionWeek}.`);
  const renewal = state.customerAccounts.slice().sort((a, b) => a.renewalWeek - b.renewalWeek)[0];
  if (renewal && renewal.renewalWeek - state.week <= 3) threads.push(`${renewal.name} renews in ${renewal.renewalWeek - state.week} week${renewal.renewalWeek - state.week === 1 ? "" : "s"}.`);
  if (financials.runwayState !== "Healthy") threads.push(`Runway is ${financials.runwayState.toLowerCase()} at ${financials.runwayMonths.toFixed(1)} months.`);
  if (state.employees.some((employee) => employee.workload > 72)) threads.push("At least one teammate is carrying an unsustainable workload.");
  return threads.slice(0, 4);
}

export function processWeek(current: GameState): WeekResult {
  const state: GameState = structuredClone(current);
  const previousFinancials = calculateFinancials(state);
  const previousCustomers = state.customerAccounts.length;
  const previousRevenue = previousFinancials.weeklyRevenue;
  const happenings: string[] = [];
  state.week += 1;

  if (!state.companyFormed) {
    state.personalCash = Math.max(0, state.personalCash - 220);
    state.ledger.unshift({ id: `living-${state.week}`, week: state.week, label: "Personal living costs", amount: -220, account: "Personal" });
    happenings.push("Personal living costs used $220.");
  }

  const productGain = processProduct(state, happenings);
  const newCustomers = state.productLaunched ? processPipeline(state, happenings) : 0;
  const churned = state.productLaunched ? processCustomers(state, happenings) : 0;
  const financials = calculateFinancials(state);

  if (state.companyFormed) {
    state.companyCash += financials.weeklyProfit;
    state.ledger.unshift(
      { id: `rev-${state.week}`, week: state.week, label: "Customer subscriptions", amount: financials.weeklyRevenue, account: "Company" },
      { id: `ops-${state.week}`, week: state.week, label: "Payroll & operating costs", amount: -financials.totalExpenses, account: "Company" },
    );
  }

  const overcrowded = state.employees.length + 1 >= OFFICE_CONFIG[state.office].capacity;
  state.morale = clamp(state.morale + OFFICE_CONFIG[state.office].morale - (overcrowded ? 5 : 0) - (financials.runwayState === "Critical" ? 5 : 0) + (state.decisionFlags.includes("friday-demos") ? 2 : 0), 20, 100);
  const activeDeals = state.opportunities.filter((o) => !["Won", "Lost"].includes(o.stage)).length;
  state.employees = state.employees.map((employee, index) => {
    const baseWorkload = employee.department === "Sales" ? 36 + activeDeals * 7 : employee.department === "Customer" ? 34 + state.customerAccounts.length * 4 : 42 + (state.productLaunched ? 8 : 14);
    const workload = clamp(baseWorkload - (state.employees.length > 3 ? 5 : 0), 20, 96);
    const activity = workload > 78 ? "Late work" : employee.department === "Sales" ? "Selling" : employee.department === "Customer" ? "Meeting" : index % 4 === state.week % 4 ? "Coffee" : "Working";
    return { ...employee, workload, morale: clamp(round((employee.morale + state.morale) / 2 - (workload > 80 ? 3 : 0)), 20, 100), activity, location: activity === "Coffee" ? "Kitchen" : activity === "Meeting" || activity === "Selling" ? "Meeting room" : "Desk", destination: null };
  });

  state.productProgress = productCompletion(state);
  if (canLaunch(state) && !current.milestones.includes("mvp-ready") && !state.productLaunched) happenings.push("The required MVP scope is ready to launch.");

  const settledFinancials = calculateFinancials(state);
  state.runwayState = settledFinancials.runwayState;
  state.snapshots.push({ week: state.week, cash: state.companyCash, revenue: settledFinancials.weeklyRevenue, expenses: settledFinancials.totalExpenses, profit: settledFinancials.weeklyProfit, mrr: settledFinancials.monthlyRecurringRevenue, customers: state.customerAccounts.length });
  state.snapshots = state.snapshots.slice(-40);

  if (state.companyFormed && settledFinancials.runwayState !== current.runwayState) {
    happenings.push(`Runway moved to ${settledFinancials.runwayState}.`);
    if (["Danger", "Critical"].includes(settledFinancials.runwayState)) state.history.unshift(history(state, "Crisis", `${settledFinancials.runwayState} runway`, `Runway is now ${settledFinancials.runwayMonths.toFixed(1)} months. Options remain, but time is narrowing.`));
  }
  if (state.companyFormed && state.companyCash < 0) state.distressWeeks += 1;
  else state.distressWeeks = 0;
  if (state.distressWeeks >= 3 || state.companyCash < -5000) {
    state.gameOver = true;
    state.history.unshift(history(state, "Crisis", "The company ran out of runway", "Three weeks of unmet obligations forced operations to cease."));
  }

  processMilestones(state, settledFinancials, happenings);
  state.pendingEvent = nextEvent(state, settledFinancials);
  state.officeState = {
    rooms: state.office === "Apartment" ? ["Founder desk", "Kitchen"] : state.office === "Coworking" ? ["Work area", "Meeting room", "Kitchen"] : ["Product studio", "Sales room", "Meeting room", "Kitchen"],
    capacity: OFFICE_CONFIG[state.office].capacity,
    activityEvents: happenings.filter((item) => /signed|shipped|renewed|workload/i.test(item)).slice(0, 3),
    visitorType: state.opportunities.some((o) => ["Demo", "Proposal"].includes(o.stage)) ? "Customer" : null,
  };
  state.founderCapacity = 100;
  state.consultingLoad = 0;

  const watchNext = unresolvedThreads(state, settledFinancials);
  const customerChange = state.customerAccounts.length - previousCustomers;
  const revenueChange = previousRevenue === 0 ? (settledFinancials.weeklyRevenue > 0 ? 100 : 0) : round((settledFinancials.weeklyRevenue - previousRevenue) / previousRevenue * 100);
  if (!happenings.length) happenings.push("A quiet execution week moved the company forward.");
  return { state, summary: { revenue: settledFinancials.weeklyRevenue, expenses: settledFinancials.totalExpenses, net: settledFinancials.weeklyProfit, cash: state.companyCash, newCustomers, churned, productGain, customerChange, revenueChange, happenings: happenings.slice(0, 5), watchNext } };
}

export function history(state: GameState, category: HistoryEvent["category"], title: string, detail: string): HistoryEvent {
  return { id: `${category}-${state.week}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, week: state.week, category, title, detail };
}
