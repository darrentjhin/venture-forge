import type { GameState } from "./types";

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    truth: { ...state.truth, decoyFeatures: [...state.truth.decoyFeatures] },
    beliefs: {
      buyer: { ...state.beliefs.buyer }, price: { ...state.beliefs.price }, wedge: { ...state.beliefs.wedge }, churnCause: { ...state.beliefs.churnCause }, channel: { ...state.beliefs.channel },
    },
    evidence: state.evidence.map((card) => ({ ...card })),
    customers: state.customers.map((customer) => ({ ...customer, demands: [...customer.demands] })),
    shippedFeatures: [...state.shippedFeatures],
    people: state.people.map((person) => ({ ...person, beliefs: { ...person.beliefs }, appearance: { ...person.appearance } })),
    formerPeople: [...state.formerPeople], headcountHistory: [...state.headcountHistory], queuedActions: state.queuedActions.map((action) => ({ ...action })), decisionLog: state.decisionLog.map((decision) => ({ ...decision })), firedEvents: [...state.firedEvents],
    pendingEvents: [...state.pendingEvents], eventHistory: [...state.eventHistory], weeklyReports: state.weeklyReports.map((report) => ({ ...report, notes: [...report.notes] })), history: state.history.map((point) => ({ ...point })), postMortem: state.postMortem ? { ...state.postMortem } : null,
    founder: { ...state.founder, relationships: { ...state.founder.relationships }, history: state.founder.history.map((company) => ({ ...company, history: company.history.map((entry) => ({ ...entry })) })) },
    companyHistory: state.companyHistory.map((entry) => ({ ...entry })), firedMilestones: [...state.firedMilestones], cards: state.cards.map((card) => ({ ...card })), crisis: { ...state.crisis }, quarterReports: state.quarterReports.map((report) => ({ ...report })),
    tasks: state.tasks.map((task) => ({ ...task, assigned: [...task.assigned], reward: { ...task.reward } })), completedTasks: [...state.completedTasks], findings: state.findings.map((finding) => ({ ...finding })), workloads: Object.fromEntries(Object.entries(state.workloads).map(([id, workload]) => [id, { ...workload }])), unlockedApps: [...state.unlockedApps],
  };
}
