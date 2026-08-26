import { SEGMENT_LABELS } from "../data/segments";
import { cloneGameState } from "./clone";
import { randomInt } from "./rng";
import type { CapEntry, GameEvent, GameState, Investor, InvestorKind, MeetingOutcome, PassReason, Round, TermSheet } from "./types";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export const PASS_LINES: Record<PassReason, [string, string, string]> = {
  tooEarly: ["Come back when the monthly revenue clears our bar.", "The company is interesting, but the numbers need another turn.", "Show me a little more revenue and I will take another meeting."],
  notOurThesis: ["We do not invest in this customer category.", "This sits outside the people our fund is built to back.", "The buyer is not a match for our fund."],
  churnConcern: ["Too many customers are leaving for us to lean in.", "Retention is the number I cannot get past.", "Find the leak in the bucket before adding more water."],
  marketTooSmall: ["I cannot see a market large enough for our fund.", "The current price and customer make the ceiling feel low.", "Show me how this becomes a much bigger company."],
  teamGap: ["I need to see a senior operator around the missing function.", "The company is one experienced leader short.", "Who owns the part of the business your team does not cover?"],
  valuationTooHigh: ["The price is ahead of the company.", "I like the business, not at this valuation.", "Bring the price down and there may be a deal."],
  needLead: ["We would follow a strong lead, but we will not set the terms.", "Find a lead and call me the same day.", "We can join the round once someone else leads it."],
  numbersDidNotMatch: ["The source numbers did not match the story in the room.", "Diligence found a gap we cannot explain away.", "We are out. The claims and the records were too far apart."],
  timing: ["Our fund is between vehicles. The timing is not yours to fix.", "We cannot write a new check this quarter.", "This is a fund-timing pass, not a company pass."],
};

export interface PitchInputs {
  traction: number; fit: number; team: number; story: number; relationship: number; integrity: number;
  churnConcern: boolean; askTooHigh: boolean; marketTooSmall: boolean; numbersMismatch: boolean; timing: boolean; needsLead: boolean;
}

export function passReasonFor(inputs: PitchInputs): PassReason {
  if (inputs.numbersMismatch) return "numbersDidNotMatch";
  if (inputs.timing) return "timing";
  if (inputs.needsLead) return "needLead";
  if (inputs.askTooHigh) return "valuationTooHigh";
  if (inputs.churnConcern) return "churnConcern";
  if (inputs.marketTooSmall) return "marketTooSmall";
  const ranked: [PassReason, number][] = [["tooEarly", inputs.traction], ["notOurThesis", inputs.fit], ["teamGap", inputs.team]];
  ranked.sort((a, b) => a[1] - b[1]);
  return ranked[0][0];
}

export type ScoreBand = "hardPass" | "softPass" | "secondMeeting" | "diligence" | "termSheet";
const BANDS: ScoreBand[] = ["hardPass", "softPass", "secondMeeting", "diligence", "termSheet"];

export function outcomeBand(score: number, temperament: Investor["temperament"], firstPitch: boolean): ScoreBand {
  let index = score < 35 ? 0 : score < 55 ? 1 : score < 70 ? 2 : score < 85 ? 3 : 4;
  if (temperament === "fast") index = Math.min(4, index + 1);
  if (temperament === "tyreKicker" && firstPitch) index = Math.min(2, index);
  return BANDS[index];
}

export function pitchInputsFor(state: GameState, investor: Investor, round: Round): PitchInputs {
  const oldMrr = state.history[Math.max(0, state.history.length - 13)]?.mrr ?? 0;
  const growth = oldMrr <= 0 ? (state.mrr > 0 ? 50 : 0) : clamp((state.mrr / oldMrr - 1) * 100 + 35);
  const revenue = investor.minMonthlyRevenue <= 0 ? 65 : clamp(state.mrr / investor.minMonthlyRevenue * 75);
  const retention = state.totalCustomersWon === 0 ? 45 : clamp(100 - state.churnedCustomers / state.totalCustomersWon * 100);
  const traction = clamp(revenue * .55 + growth * .25 + retention * .2);
  const fit = investor.thesisSegments.includes(state.truth.buyer) ? 100 : investor.thesisSegments.includes(state.beliefs.buyer.value) ? 50 : 10;
  const hasSales = state.people.some((person) => person.role === "Sales");
  const hasEngineer = state.people.some((person) => person.role === "Engineer" || person.isCofounder);
  const team = clamp(state.reputation * .65 + state.people.length * 6 + (hasSales && hasEngineer ? 18 : 0));
  const recentWon = state.weeklyReports.slice(-13).reduce((sum, report) => sum + report.newCustomers, 0);
  const recentChurn = state.weeklyReports.slice(-13).reduce((sum, report) => sum + report.churned, 0);
  return {
    traction, fit, team, story: Math.min(state.conviction, state.evidenceScore), relationship: investor.relationship,
    integrity: Math.max(0, state.overclaim - 10) * 2,
    churnConcern: recentWon + recentChurn > 0 && recentChurn / (recentWon + recentChurn) > .22,
    askTooHigh: round.askPreMoney > Math.max(state.valuation * 1.5, investor.checkMax * 12),
    marketTooSmall: state.price < 50 && state.beliefs.buyer.value === "solo",
    numbersMismatch: state.overclaim > 25,
    timing: (state.week + Number(investor.id.replace("investor-", ""))) % 23 === 0,
    needsLead: !investor.leadsRounds && !round.leadInvestorId,
  };
}

export function rawPitchScore(inputs: PitchInputs): number {
  return clamp(.32 * inputs.traction + .24 * inputs.fit + .18 * inputs.team + .16 * inputs.story + .1 * inputs.relationship - inputs.integrity);
}

function latestMeeting(round: Round, investorId: string) {
  return [...round.meetings].reverse().find((meeting) => meeting.investorId === investorId);
}

export function latestTermSheet(round: Round, investorId: string): TermSheet | null {
  const meeting = [...round.meetings].reverse().find((item) => item.investorId === investorId && item.outcome.kind === "termSheet");
  return meeting?.outcome.kind === "termSheet" ? meeting.outcome.sheet : null;
}

function termSheetFor(state: GameState, investor: Investor, round: Round): TermSheet {
  const committed = round.commitments.reduce((sum, item) => sum + item.amount, 0);
  const amount = Math.min(investor.checkMax, Math.max(investor.checkMin, round.targetAmount - committed));
  const cut = investor.temperament === "cutthroat" ? .8 : 1;
  return { investorId: investor.id, amount, preMoney: Math.round(round.askPreMoney * cut), boardSeat: investor.demandsBoardSeat || investor.temperament === "cutthroat", liquidationPreference: investor.temperament === "cutthroat" ? 2 : investor.kind === "angel" ? 1 : 1.5, poolTopUp: round.poolTopUp || (investor.kind === "angel" ? .08 : .12), expiresWeek: state.week + 3 };
}

function investorMessage(state: GameState, investor: Investor, headline: string, body: string): void {
  const message: GameEvent = { id: `investor-message-${state.week}-${state.eventHistory.length}-${investor.id}`, causeRef: investor.id, cause: "Fundraising meeting", sender: investor.name, headline, body, choices: [{ id: "acknowledge", label: "Got it", detail: "Return to the raise plan.", focusCost: 0, cashCost: 0, effect: {} }] };
  state.pendingEvents.push(message);
}

export function openRound(input: GameState, stage: InvestorKind, targetAmount: number, askPreMoney: number): GameState {
  if (input.activeRoundId || targetAmount <= 0 || askPreMoney <= 0) return input;
  const state = cloneGameState(input);
  const downRound = isDownRound(state.rounds, askPreMoney);
  if (downRound) {
    state.reputation = Math.max(0, state.reputation - 12);
    state.people.forEach((person) => { person.morale = Math.max(0, person.morale - 10); });
  }
  const round: Round = { id: `round-${state.companyNumber}-${state.week}-${state.rounds.length + 1}`, stage, targetAmount, askPreMoney, openedWeek: state.week, leadInvestorId: null, commitments: [], meetings: [], poolTopUp: stage === "angel" ? .08 : .12, status: "open" };
  state.rounds.push(round);
  state.activeRoundId = round.id;
  state.decisionLog.push({ id: `${round.id}-opened`, week: state.week, type: "round-opened", detail: `Opened a ${investorStageLabel(stage)} round targeting $${targetAmount.toLocaleString()}.`, refId: round.id, impact: 10 });
  return state;
}

export function discoverInvestors(input: GameState, method: "cold" | "network"): GameState {
  const focusCost = method === "cold" ? 1 : 2;
  const cashCost = method === "cold" ? 0 : 200;
  if (input.focus < focusCost || input.cash < cashCost) return input;
  const state = cloneGameState(input);
  state.focus -= focusCost; state.cash -= cashCost; state.day = Math.min(5, state.day + 1);
  const countRoll = randomInt(state.rngState, method === "cold" ? 1 : 1, method === "cold" ? 1 : 3); state.rngState = countRoll.state;
  for (let count = 0; count < countRoll.value; count += 1) {
    const activeStage = state.rounds.find((round) => round.id === state.activeRoundId)?.stage;
    const stageHidden = state.investors.filter((investor) => !investor.discovered && investor.kind === activeStage);
    const hidden = stageHidden.length ? stageHidden : state.investors.filter((investor) => !investor.discovered);
    if (!hidden.length) break;
    const roll = randomInt(state.rngState, 0, hidden.length - 1); state.rngState = roll.state;
    const investor = hidden[roll.value];
    investor.discovered = true; investor.relationship = method === "cold" ? 5 : 18;
    state.founder.relationships[investor.id] = investor.relationship;
  }
  return state;
}

export function researchInvestor(input: GameState, investorId: string): GameState {
  if (input.focus < 1) return input;
  const state = cloneGameState(input);
  const investor = state.investors.find((item) => item.id === investorId && item.discovered);
  if (!investor || investor.researched || state.decisionLog.some((decision) => decision.type === "investor-research" && decision.refId === investorId)) return input;
  state.focus -= 1; state.day = Math.min(5, state.day + 1); investor.lastContactWeek = state.week;
  state.decisionLog.push({ id: `investor-research-${state.week}-${investor.id}`, week: state.week, type: "investor-research", detail: `Researched ${investor.name} and ${investor.firm}.`, refId: investor.id, impact: 4 });
  return state;
}

export function pitchInvestor(input: GameState, investorId: string): GameState {
  if (input.focus < 2) return input;
  const state = cloneGameState(input);
  const round = state.rounds.find((item) => item.id === state.activeRoundId && item.status === "open");
  const investor = state.investors.find((item) => item.id === investorId && item.discovered);
  if (!round || !investor || investor.kind !== round.stage) return input;
  const previous = latestMeeting(round, investor.id);
  const firstPitch = !previous;
  const inputs = pitchInputsFor(state, investor, round);
  const roll = randomInt(state.rngState, -12, 12); state.rngState = roll.state;
  const coldPenalty = firstPitch && investor.relationship <= 5 ? -15 : 0;
  const secondBonus = previous?.outcome.kind === "secondMeeting" ? 10 : 0;
  const score = clamp(rawPitchScore(inputs) + roll.value + coldPenalty + secondBonus);
  let band = outcomeBand(score, investor.temperament, firstPitch);
  if (inputs.needsLead && band !== "hardPass") band = "softPass";
  let outcome: MeetingOutcome;
  if (band === "hardPass" || band === "softPass") {
    const reason = passReasonFor(inputs);
    const soft = band === "softPass";
    outcome = { kind: "pass", reason, soft };
    investor.passes.push({ week: state.week, reason });
    investor.relationship = clamp(investor.relationship + (soft ? 8 : -5));
    const line = PASS_LINES[reason][(state.week + round.meetings.length) % 3];
    const detail = reason === "tooEarly" ? ` ${investor.name} named a $${Math.round(investor.minMonthlyRevenue).toLocaleString()} monthly bar.` : "";
    investorMessage(state, investor, soft ? "Keep me posted" : "We are going to pass", `${line}${detail}`);
  } else if (band === "secondMeeting") outcome = { kind: "secondMeeting" };
  else if (band === "diligence") outcome = { kind: "diligence" };
  else outcome = { kind: "termSheet", sheet: termSheetFor(state, investor, round) };
  round.meetings.push({ investorId, week: state.week, outcome });
  state.decisionLog.push({ id: `investor-pitch-${state.week}-${round.meetings.length}`, week: state.week, type: "investor-pitch", detail: `Pitched ${investor.name} at ${investor.firm}.`, refId: investor.id, impact: 8 });
  investor.lastContactWeek = state.week;
  state.founder.relationships[investor.id] = investor.relationship;
  state.focus -= 2; state.day = Math.min(5, state.day + 1);
  return state;
}

export function canRepitchInvestor(state: GameState, investor: Investor): boolean {
  const pass = investor.passes[investor.passes.length - 1];
  if (!pass) return true;
  if (pass.reason === "tooEarly") return state.mrr >= investor.minMonthlyRevenue;
  if (pass.reason === "timing") return state.week >= pass.week + 6;
  if (pass.reason === "needLead") return Boolean(state.rounds.find((round) => round.id === state.activeRoundId)?.leadInvestorId);
  return pass.reason !== "numbersDidNotMatch" && pass.reason !== "notOurThesis";
}

export type CounterAxis = "valuation" | "board" | "pool";
export function counterTermSheet(input: GameState, investorId: string, axis: CounterAxis): GameState {
  const state = cloneGameState(input);
  const round = state.rounds.find((item) => item.id === state.activeRoundId && item.status === "open");
  const investor = state.investors.find((item) => item.id === investorId);
  if (!round || !investor || state.focus < 1) return input;
  const sheet = latestTermSheet(round, investorId);
  if (!sheet || sheet.expiresWeek < state.week) return input;
  state.focus -= 1; state.day = Math.min(5, state.day + 1);
  const chance = clamp(68 + round.commitments.length * 10 - (axis === "board" ? 15 : axis === "valuation" ? 22 : 10), 20, 90);
  const roll = randomInt(state.rngState, 1, 100); state.rngState = roll.state;
  if (roll.value <= chance) {
    const revised: TermSheet = { ...sheet, preMoney: axis === "valuation" ? Math.round(sheet.preMoney * 1.25) : sheet.preMoney, boardSeat: axis === "board" ? false : sheet.boardSeat, poolTopUp: axis === "pool" ? .08 : sheet.poolTopUp, expiresWeek: state.week + 3 };
    round.meetings.push({ investorId, week: state.week, outcome: { kind: "termSheet", sheet: revised } });
    investor.relationship = clamp(investor.relationship + 3);
  } else {
    const walk = randomInt(state.rngState, 1, 100); state.rngState = walk.state;
    if (walk.value <= 25) {
      investor.passes.push({ week: state.week, reason: "valuationTooHigh" });
      round.meetings.push({ investorId, week: state.week, outcome: { kind: "pass", reason: "valuationTooHigh", soft: false } });
      investorMessage(state, investor, "We could not get there", "The counter moved the deal beyond what our fund could accept.");
    }
  }
  state.founder.relationships[investor.id] = investor.relationship;
  return state;
}

export function acceptTermSheet(input: GameState, investorId: string): GameState {
  const state = cloneGameState(input);
  const round = state.rounds.find((item) => item.id === state.activeRoundId && item.status === "open");
  const investor = state.investors.find((item) => item.id === investorId);
  if (!round || !investor || round.commitments.some((item) => item.investorId === investorId)) return input;
  const sheet = latestTermSheet(round, investorId);
  if (!sheet || sheet.expiresWeek < state.week || (!investor.leadsRounds && !round.leadInvestorId)) return input;
  round.commitments.push({ investorId, amount: sheet.amount, week: state.week });
  if (!round.leadInvestorId && investor.leadsRounds) {
    round.leadInvestorId = investorId;
    state.investors.filter((item) => item.discovered && !item.leadsRounds).forEach((item) => { item.relationship = clamp(item.relationship + 15); });
  }
  investor.relationship = clamp(investor.relationship + 12);
  state.founder.relationships[investor.id] = investor.relationship;
  return state;
}

export function walkFromTermSheet(input: GameState, investorId: string): GameState {
  const state = cloneGameState(input);
  const round = state.rounds.find((item) => item.id === state.activeRoundId);
  const investor = state.investors.find((item) => item.id === investorId);
  if (!round || !investor || !latestTermSheet(round, investorId)) return input;
  round.meetings.push({ investorId, week: state.week, outcome: { kind: "pass", reason: "valuationTooHigh", soft: true } });
  return state;
}

export function applyInvestment(capTable: CapEntry[], holder: string, amount: number, preMoney: number, poolTopUp: number, roundId: string, week: number): CapEntry[] {
  const entries = capTable.map((entry) => ({ ...entry }));
  const existing = entries.reduce((sum, entry) => sum + entry.shares, 0);
  const existingPool = entries.filter((entry) => entry.kind === "optionPool").reduce((sum, entry) => sum + entry.shares, 0);
  const ratio = amount / preMoney;
  const denominator = 1 - poolTopUp * (1 + ratio);
  const topUpShares = poolTopUp > 0 && denominator > 0 ? Math.max(0, (poolTopUp * existing * (1 + ratio) - existingPool) / denominator) : 0;
  if (topUpShares > .001) entries.push({ id: `${roundId}-pool-${entries.length}`, holder: "Option pool top-up", kind: "optionPool", shares: topUpShares, roundId, sinceWeek: week });
  const investorShares = (existing + topUpShares) * ratio;
  entries.push({ id: `${roundId}-investor-${entries.length}`, holder, kind: "investor", shares: investorShares, roundId, sinceWeek: week });
  return entries;
}

export function ownershipPercent(capTable: CapEntry[], kind: CapEntry["kind"]): number {
  const total = capTable.reduce((sum, entry) => sum + entry.shares, 0);
  return total <= 0 ? 0 : capTable.filter((entry) => entry.kind === kind).reduce((sum, entry) => sum + entry.shares, 0) / total * 100;
}

export function isDownRound(rounds: Round[], askPreMoney: number): boolean {
  const lastClosed = [...rounds].reverse().find((round) => round.status === "closed");
  if (!lastClosed) return false;
  const raised = lastClosed.commitments.reduce((sum, item) => sum + item.amount, 0);
  return askPreMoney < lastClosed.askPreMoney + raised;
}

export function outsideCapitalFor(rounds: Round[]): number {
  return rounds.filter((round) => round.status === "closed").flatMap((round) => round.commitments).reduce((sum, item) => sum + item.amount, 0);
}

export function closeRound(input: GameState): GameState {
  const state = cloneGameState(input);
  const round = state.rounds.find((item) => item.id === state.activeRoundId && item.status === "open");
  if (!round || !round.leadInvestorId || !round.commitments.length) return input;
  const founderBefore = ownershipPercent(state.capTable, "founder");
  for (const commitment of round.commitments) {
    const investor = state.investors.find((item) => item.id === commitment.investorId);
    const sheet = latestTermSheet(round, commitment.investorId);
    if (!investor || !sheet) continue;
    state.capTable = applyInvestment(state.capTable, investor.firm, commitment.amount, sheet.preMoney, sheet.poolTopUp, round.id, state.week);
    state.cash += commitment.amount;
  }
  round.status = "closed"; state.activeRoundId = null; state.outsideCapital = outsideCapitalFor(state.rounds);
  const raised = round.commitments.reduce((sum, item) => sum + item.amount, 0);
  state.valuation = round.askPreMoney + raised;
  state.raisedSeriesA = state.raisedSeriesA || round.stage === "seriesA";
  const founderAfter = ownershipPercent(state.capTable, "founder");
  const lead = state.investors.find((item) => item.id === round.leadInvestorId);
  state.companyHistory.push({ id: `${round.id}-closed`, week: state.week, kind: "milestone", icon: "🤝", title: `Raised $${raised.toLocaleString()}`, body: `Raised from ${lead?.firm ?? "the round"} at a $${round.askPreMoney.toLocaleString()} pre-money. You went from ${founderBefore.toFixed(1)}% to ${founderAfter.toFixed(1)}%.` });
  state.decisionLog.push({ id: `${round.id}-decision`, week: state.week, type: "round-closed", detail: `Closed a $${raised.toLocaleString()} ${investorStageLabel(round.stage)} round.`, refId: round.id, impact: 24 });
  return state;
}

export function processFundraisingWeek(state: GameState): void {
  for (const investor of state.investors) {
    const research = state.decisionLog.find((decision) => decision.type === "investor-research" && decision.refId === investor.id);
    if (!investor.researched && research && research.week <= state.week) {
      investor.researched = true; investor.relationship = clamp(investor.relationship + 5);
      state.founder.relationships[investor.id] = investor.relationship;
    }
  }
  const round = state.rounds.find((item) => item.id === state.activeRoundId && item.status === "open");
  if (round && !round.leadInvestorId && state.week - round.openedWeek >= 8) {
    round.status = "cold"; state.activeRoundId = null;
  }
  if (round) {
    const due = round.meetings.filter((meeting) => meeting.outcome.kind === "diligence" && state.week - meeting.week >= 2 && latestMeeting(round, meeting.investorId) === meeting);
    for (const meeting of due) {
      const investor = state.investors.find((item) => item.id === meeting.investorId);
      if (!investor) continue;
      if (state.overclaim > 25) {
        investor.relationship = clamp(investor.relationship - 25);
        round.meetings.push({ investorId: investor.id, week: state.week, outcome: { kind: "pass", reason: "numbersDidNotMatch", soft: false } });
        investor.passes.push({ week: state.week, reason: "numbersDidNotMatch" });
        state.investors.forEach((item) => { if (item.id !== investor.id) item.relationship = clamp(item.relationship - 10); });
        investorMessage(state, investor, "The numbers did not match", PASS_LINES.numbersDidNotMatch[state.week % 3]);
      } else {
        const sheet = termSheetFor(state, investor, round);
        const recent = state.weeklyReports.slice(-13);
        const churned = recent.reduce((sum, report) => sum + report.churned, 0);
        const won = recent.reduce((sum, report) => sum + report.newCustomers, 0);
        if (won + churned > 0 && churned / (won + churned) > .22) sheet.preMoney = Math.round(sheet.preMoney * .7);
        round.meetings.push({ investorId: investor.id, week: state.week, outcome: { kind: "termSheet", sheet } });
        investorMessage(state, investor, "Term sheet ready", `We can invest $${sheet.amount.toLocaleString()} at a $${sheet.preMoney.toLocaleString()} pre-money valuation.`);
      }
      state.founder.relationships[investor.id] = investor.relationship;
    }
  }

  const threshold = state.reputation >= 70 ? 4 : state.reputation >= 50 ? 2 : state.reputation >= 35 ? 1 : 0;
  if (state.investors.filter((item) => item.discovered).length < threshold + 1) {
    const next = state.investors.find((item) => !item.discovered);
    if (next) { next.discovered = true; next.relationship = 20; investorMessage(state, next, "I have been following the company", "Your work reached me before your pitch did. I would be glad to hear what you are building."); }
  }

  const activeStage = round?.stage;
  const stageHidden = state.investors.filter((item) => !item.discovered && item.kind === activeStage);
  const hidden = stageHidden.length ? stageHidden : state.investors.filter((item) => !item.discovered);
  if (hidden.length && state.people.length) {
    const chance = clamp(state.people.reduce((sum, person) => sum + Math.max(1, person.morale / 25), 0), 0, 35);
    const roll = randomInt(state.rngState, 1, 100); state.rngState = roll.state;
    if (roll.value <= chance) {
      const pick = randomInt(state.rngState, 0, hidden.length - 1); state.rngState = pick.state;
      const investor = hidden[pick.value];
      const introducer = state.people[(state.week + pick.value) % state.people.length];
      investor.discovered = true; investor.relationship = 25;
      state.founder.relationships[investor.id] = investor.relationship;
      const message: GameEvent = { id: `warm-intro-${state.week}-${investor.id}`, causeRef: introducer.id, cause: "Warm introduction", sender: introducer.name, headline: `I introduced you to ${investor.name}`, body: `${investor.name} at ${investor.firm} is expecting your note. I told them why the company matters.`, choices: [{ id: "acknowledge", label: "Thank them", detail: "The introduction is now in the raise binder.", focusCost: 0, cashCost: 0, effect: {} }] };
      state.pendingEvents.push(message);
    }
  }
}

export function lowestOpenBar(state: GameState): string | null {
  const bars = state.investors.filter((investor) => investor.passes.some((pass) => pass.reason === "tooEarly")).map((investor) => ({ investor, bar: investor.minMonthlyRevenue })).sort((a, b) => a.bar - b.bar);
  return bars[0] ? `${bars[0].investor.name} will reopen at $${Math.round(bars[0].bar).toLocaleString()} monthly revenue.` : null;
}

export function investorStageLabel(kind: InvestorKind): string {
  return kind === "seriesA" ? "Series A" : kind === "preseed" ? "Pre-seed" : kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function investorThesis(investor: Investor): string {
  return investor.thesisSegments.map((segment) => SEGMENT_LABELS[segment]).join(" and ");
}
