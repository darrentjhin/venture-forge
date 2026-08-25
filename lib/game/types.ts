export type Background = "Engineering" | "Sales" | "Design" | "Business";
export type OfficeTier = "Apartment" | "Coworking" | "Studio";
export type GameView = "overview" | "office" | "product" | "growth" | "team" | "finance" | "history";
export type RunwayState = "Healthy" | "Watch" | "Danger" | "Critical";
export type OpportunityStage = "Lead" | "Contacted" | "Discovery" | "Demo" | "Proposal" | "Negotiation" | "Won" | "Lost";
export type CustomerNeed = "Approvals" | "Analytics" | "Security" | "Mobile" | "Billing" | "Reliability";

export type DomainSkills = {
  engineering: number;
  product: number;
  design: number;
  sales: number;
  marketing: number;
  customerSuccess: number;
  operations: number;
  leadership: number;
};

export type PersonActivity = "Working" | "Selling" | "Meeting" | "Coffee" | "Interview" | "Customer visit" | "Late work" | "Idle";

export type Employee = {
  id: string;
  name: string;
  role: string;
  skills: DomainSkills;
  morale: number;
  workload: number;
  weeklySalary: number;
  color: string;
  activity: PersonActivity;
  location: "Desk" | "Meeting room" | "Kitchen" | "Reception";
  destination: string | null;
  department: "Founder" | "Product" | "Sales" | "Customer" | "Operations";
};

export type ProductFeature = {
  id: string;
  name: string;
  required: boolean;
  pointsRequired: number;
  progress: number;
  description: string;
  effect: string;
};

export type Customer = {
  id: string;
  name: string;
  segment: "Micro" | "SMB" | "Mid-market";
  employees: number;
  contractValue: number;
  need: CustomerNeed;
  satisfaction: number;
  health: number;
  relationship: number;
  renewalWeek: number;
  risk: "Low" | "Medium" | "High";
  startedWeek: number;
};

export type Opportunity = {
  id: string;
  name: string;
  segment: Customer["segment"];
  employees: number;
  stage: OpportunityStage;
  potentialValue: number;
  need: CustomerNeed;
  fit: "Low" | "Medium" | "High";
  probability: number;
  decisionWeek: number;
  founderEffort: number;
  createdWeek: number;
};

export type Snapshot = {
  week: number;
  cash: number;
  revenue: number;
  expenses: number;
  profit: number;
  mrr: number;
  customers: number;
};

export type HistoryEvent = {
  id: string;
  week: number;
  category: "Founder" | "Product" | "Finance" | "Team" | "Customer" | "Sales" | "Milestone" | "Crisis";
  title: string;
  detail: string;
};

export type LedgerEntry = {
  id: string;
  week: number;
  label: string;
  amount: number;
  account: "Personal" | "Company";
};

export type EventEffects = {
  cash?: number;
  morale?: number;
  quality?: number;
  reputation?: number;
  capacity?: number;
  featureId?: string;
  featurePoints?: number;
  customerHealth?: number;
  flag?: string;
};

export type PendingEvent = {
  id: string;
  category: "CUSTOMER" | "EMPLOYEE" | "PRODUCT" | "FINANCE" | "COMPETITOR" | "FOUNDER" | "OPERATIONS" | "SECURITY" | "MARKET";
  eyebrow: string;
  title: string;
  body: string;
  choices: Array<{ label: string; detail: string; effects: EventEffects }>;
};

export type OfficeState = {
  rooms: string[];
  capacity: number;
  activityEvents: string[];
  visitorType: "Customer" | "Candidate" | null;
};

export type GameState = {
  version: 2;
  saveId: string;
  loggedIn: boolean;
  founderName: string;
  email: string;
  background: Background;
  week: number;
  year: number;
  personalCash: number;
  network: number;
  reputation: number;
  founderCapacity: number;
  ideaResearch: number;
  ideaName: string;
  companyFormed: boolean;
  companyName: string;
  businessStructure: "C-Corporation" | "LLC";
  companyCash: number;
  founderContribution: number;
  consultingLoad: number;
  productFeatures: ProductFeature[];
  selectedFeatureId: string;
  productProgress: number;
  productQuality: number;
  productLaunched: boolean;
  price: number;
  customerAccounts: Customer[];
  opportunities: Opportunity[];
  marketing: number;
  morale: number;
  office: OfficeTier;
  officeState: OfficeState;
  employees: Employee[];
  snapshots: Snapshot[];
  history: HistoryEvent[];
  ledger: LedgerEntry[];
  pendingEvent: PendingEvent | null;
  eventMemory: string[];
  eventCooldowns: Record<string, number>;
  decisionFlags: string[];
  milestones: string[];
  runwayState: RunwayState;
  distressWeeks: number;
  gameOver: boolean;
  selectedEmployeeId: string | null;
};

export type Financials = {
  weeklyRevenue: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  payroll: number;
  officeCost: number;
  baseOperations: number;
  customerCosts: number;
  totalExpenses: number;
  weeklyProfit: number;
  weeklyBurn: number;
  monthlyBurn: number;
  grossMargin: number;
  runwayMonths: number;
  runwayState: RunwayState;
};

export type WeekResult = {
  state: GameState;
  summary: {
    revenue: number;
    expenses: number;
    net: number;
    cash: number;
    newCustomers: number;
    churned: number;
    productGain: number;
    customerChange: number;
    revenueChange: number;
    happenings: string[];
    watchNext: string[];
  };
};
