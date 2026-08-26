import type { ArchetypeId } from "../data/archetypes";
import type { ChannelId } from "../data/channels";
import type { ChurnDriverId } from "../data/churnDrivers";
import type { FeatureId } from "../data/features";
import type { SegmentId } from "../data/segments";

export type BeliefKey = "buyer" | "price" | "wedge" | "churnCause" | "channel";
export type Role = "Cofounder" | "Engineer" | "Designer" | "Sales" | "Customer success" | "Operations";
export type Workspace = "apartment" | "kitchen" | "coworking" | "office" | "floor" | "hq";
export type RoomStage = Workspace | "downsized";
export type PersonMotion = "typing" | "thinking" | "talking" | "walking" | "meeting" | "coffee" | "struggling" | "leaving";
export type PanelId = "metrics" | "notebook" | "inbox" | "roadmap" | "team" | "capital";
export type EndingId = "alive" | "acquisition" | "series-a" | "built-to-last" | "cash" | "team" | "reputation" | "searching";
export type CrisisChoiceId = "layoff" | "loan" | "sellOffice";
export type CompanyHistoryKind = "milestone" | "quarter" | "crisis" | "restart";
export type Skill = "engineering" | "design" | "sales" | "support" | "ops" | "research";
export type PhoneAppId = "tasks" | "inbox" | "team" | "bank" | "stats";
export type InvestorKind = "angel" | "preseed" | "seed" | "seriesA" | "growth";
export type PassReason = "tooEarly" | "notOurThesis" | "churnConcern" | "marketTooSmall" | "teamGap" | "valuationTooHigh" | "needLead" | "numbersDidNotMatch" | "timing";

export interface MarketTruth { buyer: SegmentId; secondaryBuyer: SegmentId; willingnessToPay: number; wedgeFeature: FeatureId; supportFeature: FeatureId; decoyFeatures: FeatureId[]; churnDriver: ChurnDriverId; channel: ChannelId; demandInflectionWeek: number; competitorAggression: number; }
export interface Hypothesis<T> { value: T; confidence: number; committedWeek: number; }
export interface Beliefs { buyer: Hypothesis<SegmentId>; price: Hypothesis<number>; wedge: Hypothesis<FeatureId>; churnCause: Hypothesis<ChurnDriverId>; channel: Hypothesis<ChannelId>; }
export interface EvidenceCard { id: string; week: number; source: string; dimension: BeliefKey; suggests: string; strength: number; isMisleading: boolean; quote: string; read: boolean; }
export interface PersonAppearance { head: number; hair: number; skin: number; shirt: number; glasses: boolean; }
export interface Person { id: string; name: string; role: Role; archetype: ArchetypeId; salaryWeekly: number; skill: number; morale: number; beliefs: Partial<Record<BeliefKey, string>>; drift: number; quirk: string; hiredWeek: number; seat: number; appearance: PersonAppearance; motion: PersonMotion; isCofounder: boolean; }
export interface Customer { id: string; name: string; segment: SegmentId; mrr: number; demands: FeatureId[]; joinedWeek: number; champion: boolean; }
export interface Decision { id: string; week: number; type: string; detail: string; refId: string; impact: number; alternate?: string; }
export interface EventChoice { id: string; label: string; detail: string; focusCost: number; cashCost: number; effect: EventEffect; }
export interface EventEffect { cash?: number; reputation?: number; morale?: number; conviction?: number; techDebt?: number; drift?: number; pipeline?: number; overclaim?: number; acceptEnding?: EndingId; }
export interface GameEvent { id: string; causeRef: string; cause: string; sender: string; headline: string; body: string; choices: EventChoice[]; }
export interface PendingAction { id: string; actionId: ActionId; target?: string; label: string; focusCost: number; cashCost: number; }
export interface HistoryPoint { week: number; cash: number; mrr: number; }
export interface WeekReport { week: number; cashDelta: number; revenue: number; burn: number; newCustomers: number; churned: number; notes: string[]; }
export interface PostMortem { ending: EndingId; title: string; grade: string; feedback: string; couldKnowWeek: number | null; couldKnowText: string; counterfactual: string; shareText: string; }
export interface CompanyHistoryEntry { id: string; week: number; kind: CompanyHistoryKind; title: string; body: string; icon: string; }
export interface ClosedCompany { companyNumber: number; startedWeek: number; closedWeek: number; finalCash: number; finalMrr: number; customers: number; peakHeadcount: number; history: CompanyHistoryEntry[]; }
export interface FounderLegacy { cash: number; reputation: number; network: number; relationships: Record<string, number>; history: ClosedCompany[]; coffeeDay: number; coffeeToday: number; jittery: boolean; }
export interface CrisisState { active: boolean; choiceRequired: boolean; consecutiveNegativeWeeks: number; enteredWeek: number | null; crisesSurvived: number; }
export interface GameCard { id: string; kind: "milestone" | "quarter" | "restart"; week: number; title: string; body: string; icon: string; }
export interface QuarterReport { year: number; quarter: number; week: number; grade: "A" | "B" | "C" | "D"; title: string; body: string; officeBeat: "plant" | "paint" | "delivery"; }
export interface TaskReward { cash?: number; mrr?: number; reputation?: number; fit?: number; techDebt?: number; shipsFeature?: FeatureId; unlocksTask?: string; }
export interface Task { id: string; title: string; detail: string; skill: Skill; effort: number; progress: number; assigned: string[]; source: "backlog" | "event" | "customer" | "investor" | "milestone"; reward: TaskReward; expiresWeek: number | null; createdWeek: number; }
export interface Finding { id: string; week: number; from: string; text: string; actedOn: boolean; }
export interface Workload { overworkWeeks: number; burnout: number; }
export interface TermSheet { investorId: string; amount: number; preMoney: number; boardSeat: boolean; liquidationPreference: 1 | 1.5 | 2; poolTopUp: number; expiresWeek: number; }
export type MeetingOutcome = { kind: "pass"; reason: PassReason; soft: boolean } | { kind: "secondMeeting" } | { kind: "diligence" } | { kind: "termSheet"; sheet: TermSheet };
export interface Investor { id: string; name: string; firm: string; kind: InvestorKind; checkMin: number; checkMax: number; leadsRounds: boolean; temperament: "fast" | "thorough" | "tyreKicker" | "cutthroat"; demandsBoardSeat: boolean; thesisSegments: SegmentId[]; minMonthlyRevenue: number; maxTechDebt: number; portfolio: string[]; discovered: boolean; researched: boolean; relationship: number; lastContactWeek: number | null; passes: { week: number; reason: PassReason }[]; }
export interface Round { id: string; stage: InvestorKind; targetAmount: number; askPreMoney: number; openedWeek: number; leadInvestorId: string | null; commitments: { investorId: string; amount: number; week: number }[]; meetings: { investorId: string; week: number; outcome: MeetingOutcome }[]; poolTopUp: number; status: "open" | "closed" | "cold" | "abandoned"; }
export interface CapEntry { id: string; holder: string; kind: "founder" | "cofounder" | "optionPool" | "investor"; shares: number; roundId: string | null; sinceWeek: number; }
export interface GameState {
  version: 7; seed: number; rngState: number; week: number; day: number; cash: number; focus: number; nextFocusBonus: number;
  truth: MarketTruth; beliefs: Beliefs; evidence: EvidenceCard[]; conviction: number; evidenceScore: number; overclaim: number; quietCorrectWeeks: number;
  pipeline: number; customers: Customer[]; churnPressure: number; churnedCustomers: number; closedDeals: number; mrr: number; previousMrr: number; price: number; reputation: number;
  shippedFeatures: FeatureId[]; selectedFeature: FeatureId; techDebt: number; onboardingQuality: number; people: Person[]; formerPeople: string[]; workspace: Workspace; headcountHistory: number[];
  queuedActions: PendingAction[]; decisionLog: Decision[]; firedEvents: string[]; pendingEvents: GameEvent[]; eventHistory: GameEvent[];
  pivotWeeksRemaining: number; allNighterCooldown: number; outsideCapital: number; valuation: number; raisedSeriesA: boolean; acceptedAcquisition: boolean;
  totalCustomersWon: number; weeklyReports: WeekReport[]; history: HistoryPoint[]; ending: EndingId | null; postMortem: PostMortem | null;
  companyNumber: number; companyStartedWeek: number; founder: FounderLegacy; companyHistory: CompanyHistoryEntry[]; firedMilestones: string[]; cards: GameCard[];
  crisis: CrisisState; emergencyLoanBalance: number; workspaceCap: Workspace | null; quarterReports: QuarterReport[]; officeBeat: number;
  tasks: Task[]; completedTasks: string[]; taskSerial: number; taskMrr: number; findings: Finding[]; workloads: Record<string, Workload>; unlockedApps: PhoneAppId[];
  investors: Investor[]; rounds: Round[]; capTable: CapEntry[]; activeRoundId: string | null;
}

export type ActionId = "interview" | "interviewSprint" | "landingPage" | "churnAutopsy" | "winLoss" | "teardown" | "ship" | "harden" | "onboarding" | "payDebt" | "spike" | "coldOutreach" | "salesCall" | "communityLaunch" | "content" | "paidAds" | "enterpriseDeal" | "postRole" | "interviewCandidate" | "offer" | "oneOnOne" | "raise" | "letGo" | "bridge" | "revenueFinance" | "cutBurn" | "weekend" | "pivot" | "rewritePitch" | "allNighter";

export interface ActionDef { id: ActionId; group: PanelId; name: string; focusCost: number; cashCost: number; preview: string; availability: (state: GameState) => boolean; }
