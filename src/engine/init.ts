import { CHANNELS } from "../data/channels";
import { CHURN_DRIVERS } from "../data/churnDrivers";
import { FEATURES } from "../data/features";
import { SEGMENTS } from "../data/segments";
import { BALANCE } from "../data/balance";
import { createCofounder } from "./people";
import { hashString } from "./rng";
import { generateMarketTruth } from "./truth";
import type { GameState } from "./types";

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
  return {
    version: 3, seed, rngState: generated.rngState, week: 1, day: 1, cash: BALANCE.startingCash, focus: BALANCE.baseFocus, nextFocusBonus: 0,
    truth, beliefs: { buyer: { value: wrongBuyer, confidence: 42, committedWeek: 1 }, price: { value: price, confidence: 45, committedWeek: 1 }, wedge: { value: wrongWedge, confidence: 48, committedWeek: 1 }, churnCause: { value: wrongChurn, confidence: 38, committedWeek: 1 }, channel: { value: wrongChannel, confidence: 44, committedWeek: 1 } },
    evidence: [], conviction: 48, evidenceScore: 0, overclaim: 0, quietCorrectWeeks: 0, pipeline: 0, customers: [], churnPressure: 0, churnedCustomers: 0, closedDeals: 0, mrr: 0, previousMrr: 0, price, reputation: 38,
    shippedFeatures: [], selectedFeature: wrongWedge, techDebt: 0, onboardingQuality: 45, people: [cofounder], formerPeople: [], workspace: "apartment", headcountHistory: [2], queuedActions: [], decisionLog: [{ id: "origin", week: 1, type: "origin", detail: "Started the company from an apartment with a cofounder.", refId: "origin", impact: 5 }],
    firedEvents: [], pendingEvents: [], eventHistory: [], pivotWeeksRemaining: 0, allNighterCooldown: 0, outsideCapital: 0, valuation: 400000, raisedSeriesA: false, acceptedAcquisition: false, totalCustomersWon: 0, weeklyReports: [], history: [{ week: 1, cash: BALANCE.startingCash, mrr: 0 }], ending: null, postMortem: null,
  };
}
