import { CHANNELS } from "../data/channels";
import { CHURN_DRIVERS } from "../data/churnDrivers";
import { FEATURES } from "../data/features";
import { SEGMENTS } from "../data/segments";
import { BALANCE } from "../data/balance";
import { createCofounder } from "./people";
import { hashString } from "./rng";
import { generateMarketTruth } from "./truth";
import type { GameState } from "./types";
import { seedTasks } from "./tasks";
import { createInvestorRoster } from "../data/investors";

export function newRun(seedInput: number | string): GameState {
  const seed = typeof seedInput === "number" ? seedInput >>> 0 : hashString(seedInput);
  const generated = generateMarketTruth(seed || 1);
  const truth = generated.truth;
  const wrongBuyer = SEGMENTS[(SEGMENTS.indexOf(truth.buyer) + 2) % SEGMENTS.length];
  const wrongWedge = FEATURES[(FEATURES.indexOf(truth.wedgeFeature) + 3) % FEATURES.length];
  const wrongChannel = CHANNELS[(CHANNELS.indexOf(truth.channel) + 2) % CHANNELS.length];
  const wrongChurn = CHURN_DRIVERS[(CHURN_DRIVERS.indexOf(truth.churnDriver) + 1) % CHURN_DRIVERS.length];
  const price = Math.max(25, Math.round(truth.willingnessToPay * .42));
  const cofounder = createCofounder(seed);
  const state: GameState = {
    version: 7, seed, rngState: generated.rngState, week: 1, day: 1, cash: BALANCE.startingCash, focus: BALANCE.baseFocus, nextFocusBonus: 0,
    truth, beliefs: { buyer: { value: wrongBuyer, confidence: 42, committedWeek: 1 }, price: { value: price, confidence: 45, committedWeek: 1 }, wedge: { value: wrongWedge, confidence: 48, committedWeek: 1 }, churnCause: { value: wrongChurn, confidence: 38, committedWeek: 1 }, channel: { value: wrongChannel, confidence: 44, committedWeek: 1 } },
    evidence: [], conviction: 48, evidenceScore: 0, overclaim: 0, quietCorrectWeeks: 0, pipeline: 0, customers: [], churnPressure: 0, churnedCustomers: 0, closedDeals: 0, mrr: 0, previousMrr: 0, price, reputation: 38,
    shippedFeatures: [], selectedFeature: wrongWedge, techDebt: 0, onboardingQuality: 45, people: [cofounder], formerPeople: [], workspace: "apartment", headcountHistory: [2], queuedActions: [], decisionLog: [{ id: "origin", week: 1, type: "origin", detail: "Started the company from an apartment with a cofounder.", refId: "origin", impact: 5 }],
    firedEvents: [], pendingEvents: [], eventHistory: [], pivotWeeksRemaining: 0, allNighterCooldown: 0, outsideCapital: 0, valuation: 400000, raisedSeriesA: false, acceptedAcquisition: false, totalCustomersWon: 0, weeklyReports: [], history: [{ week: 1, cash: BALANCE.startingCash, mrr: 0 }], ending: null, postMortem: null,
    companyNumber: 1, companyStartedWeek: 1, founder: { cash: BALANCE.startingCash, reputation: 38, network: 0, relationships: {}, history: [], coffeeDay: 1, coffeeToday: 0, jittery: false }, companyHistory: [], firedMilestones: [], cards: [],
    crisis: { active: false, choiceRequired: false, consecutiveNegativeWeeks: 0, enteredWeek: null, crisesSurvived: 0 }, emergencyLoanBalance: 0, workspaceCap: null, quarterReports: [], officeBeat: 0,
    tasks: [], completedTasks: [], taskSerial: 0, taskMrr: 0, findings: [], workloads: {}, unlockedApps: ["tasks", "inbox", "team", "bank"],
    investors: createInvestorRoster(), rounds: [], capTable: [
      { id: "founder", holder: "You", kind: "founder", shares: 6_000_000, roundId: null, sinceWeek: 1 },
      { id: "cofounder", holder: cofounder.name, kind: "cofounder", shares: 3_000_000, roundId: null, sinceWeek: 1 },
      { id: "option-pool", holder: "Employee option pool", kind: "optionPool", shares: 1_000_000, roundId: null, sinceWeek: 1 },
    ], activeRoundId: null,
  };
  seedTasks(state);
  return state;
}
