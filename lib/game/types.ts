export type Background = "Engineering" | "Sales" | "Design" | "Business";
export type OfficeTier = "Apartment" | "Coworking" | "Studio";
export type GameView = "overview" | "office" | "product" | "growth" | "team" | "finance" | "history";

export type Employee = {
  id: string;
  name: string;
  role: string;
  skill: number;
  morale: number;
  weeklySalary: number;
  color: string;
};

export type Snapshot = {
  week: number;
  cash: number;
  revenue: number;
  expenses: number;
  customers: number;
};

export type HistoryEvent = {
  id: string;
  week: number;
  category: "Founder" | "Product" | "Finance" | "Team" | "Milestone" | "Crisis";
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

export type PendingEvent = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  choices: Array<{
    label: string;
    detail: string;
    cash: number;
    morale: number;
    quality: number;
  }>;
};

export type GameState = {
  version: 1;
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
  founderEnergy: number;
  ideaResearch: number;
  ideaName: string;
  companyFormed: boolean;
  companyName: string;
  companyCash: number;
  productProgress: number;
  productQuality: number;
  productLaunched: boolean;
  price: number;
  customers: number;
  salesPipeline: number;
  marketing: number;
  morale: number;
  office: OfficeTier;
  employees: Employee[];
  snapshots: Snapshot[];
  history: HistoryEvent[];
  ledger: LedgerEntry[];
  pendingEvent: PendingEvent | null;
  distressWeeks: number;
  gameOver: boolean;
  selectedEmployeeId: string | null;
};

export type WeekResult = {
  state: GameState;
  summary: {
    revenue: number;
    expenses: number;
    net: number;
    newCustomers: number;
    churned: number;
    productGain: number;
  };
};
