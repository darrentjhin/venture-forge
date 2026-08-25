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
export interface GameEvent { id: string; causeRef: string; cause: string; headline: string; body: string; choices: EventChoice[]; }
export interface PendingAction { id: string; actionId: ActionId; target?: string; label: string; focusCost: number; cashCost: number; }
export interface HistoryPoint { week: number; cash: number; mrr: number; }
export interface WeekReport { week: number; cashDelta: number; revenue: number; burn: number; newCustomers: number; churned: number; notes: string[]; }
export interface PostMortem { ending: EndingId; title: string; grade: string; feedback: string; couldKnowWeek: number | null; couldKnowText: string; counterfactual: string; shareText: string; }
export interface GameState {
  version: 3; seed: number; rngState: number; week: number; day: number; cash: number; focus: number; nextFocusBonus: number;
  truth: MarketTruth; beliefs: Beliefs; evidence: EvidenceCard[]; conviction: number; evidenceScore: number; overclaim: number; quietCorrectWeeks: number;
  pipeline: number; customers: Customer[]; churnPressure: number; churnedCustomers: number; closedDeals: number; mrr: number; previousMrr: number; price: number; reputation: number;
  shippedFeatures: FeatureId[]; selectedFeature: FeatureId; techDebt: number; onboardingQuality: number; people: Person[]; formerPeople: string[]; workspace: Workspace; headcountHistory: number[];
  queuedActions: PendingAction[]; decisionLog: Decision[]; firedEvents: string[]; pendingEvents: GameEvent[]; eventHistory: GameEvent[];
  pivotWeeksRemaining: number; allNighterCooldown: number; outsideCapital: number; valuation: number; raisedSeriesA: boolean; acceptedAcquisition: boolean;
  totalCustomersWon: number; weeklyReports: WeekReport[]; history: HistoryPoint[]; ending: EndingId | null; postMortem: PostMortem | null;
}

export type ActionId = "interview" | "interviewSprint" | "landingPage" | "churnAutopsy" | "winLoss" | "teardown" | "ship" | "harden" | "onboarding" | "payDebt" | "spike" | "coldOutreach" | "salesCall" | "communityLaunch" | "content" | "paidAds" | "enterpriseDeal" | "postRole" | "interviewCandidate" | "offer" | "oneOnOne" | "raise" | "letGo" | "angel" | "seedFund" | "bridge" | "revenueFinance" | "cutBurn" | "weekend" | "pivot" | "rewritePitch" | "allNighter";

export interface ActionDef { id: ActionId; group: PanelId; name: string; focusCost: number; cashCost: number; preview: string; availability: (state: GameState) => boolean; }
