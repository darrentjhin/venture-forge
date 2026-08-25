import type { Background, CustomerNeed, DomainSkills, Employee, OfficeTier, ProductFeature } from "./types";

export const BACKGROUNDS: Array<{ name: Background; tagline: string; bonus: string }> = [
  { name: "Engineering", tagline: "Build lean, ship early", bonus: "Founder build sprints deliver 50% more engineering" },
  { name: "Sales", tagline: "Open doors before they close", bonus: "Outreach creates warmer, faster-moving opportunities" },
  { name: "Design", tagline: "Make the product feel inevitable", bonus: "Completed features improve activation and satisfaction" },
  { name: "Business", tagline: "Keep options open and cash close", bonus: "More accurate forecasts and 12% operating efficiency" },
];

export const HUSTLES = [
  { name: "Freelance project", detail: "Build a conversion site for a local studio.", pay: 1_250, attention: 40, research: 2, network: 1 },
  { name: "Founder workshop", detail: "Teach agency owners a practical operations workshop.", pay: 720, attention: 30, research: 5, network: 4 },
  { name: "Market audit", detail: "Review a small firm's client workflow and pain points.", pay: 900, attention: 35, research: 10, network: 2 },
];

const skills = (values: Partial<DomainSkills>): DomainSkills => ({ engineering: 5, product: 5, design: 5, sales: 5, marketing: 5, customerSuccess: 5, operations: 5, leadership: 5, ...values });

export const CANDIDATES: Employee[] = [
  { id: "maya", name: "Maya Chen", role: "Product Engineer", skills: skills({ engineering: 88, product: 58, design: 24, operations: 38 }), morale: 86, workload: 42, weeklySalary: 1_350, color: "#f0a982", activity: "Working", location: "Desk", destination: null, department: "Product" },
  { id: "theo", name: "Theo Brooks", role: "Account Executive", skills: skills({ sales: 86, marketing: 48, customerSuccess: 42, leadership: 55 }), morale: 91, workload: 38, weeklySalary: 1_150, color: "#98b8ff", activity: "Selling", location: "Meeting room", destination: null, department: "Sales" },
  { id: "ines", name: "Ines Silva", role: "Product Designer", skills: skills({ design: 88, product: 74, engineering: 18, customerSuccess: 35 }), morale: 88, workload: 40, weeklySalary: 1_200, color: "#d7b2ff", activity: "Working", location: "Desk", destination: null, department: "Product" },
  { id: "omar", name: "Omar Haddad", role: "Customer Success", skills: skills({ customerSuccess: 86, sales: 48, product: 42, operations: 51 }), morale: 94, workload: 35, weeklySalary: 980, color: "#8ed4b3", activity: "Meeting", location: "Meeting room", destination: null, department: "Customer" },
  { id: "nia", name: "Nia Foster", role: "Operations Lead", skills: skills({ operations: 87, leadership: 72, product: 31, customerSuccess: 34 }), morale: 89, workload: 32, weeklySalary: 1_100, color: "#f2cb70", activity: "Working", location: "Desk", destination: null, department: "Operations" },
];

export const PRODUCT_FEATURES: ProductFeature[] = [
  { id: "workspace", name: "Core workspace", required: true, pointsRequired: 32, progress: 0, description: "Shared client workspace, permissions, and project home.", effect: "Required to launch" },
  { id: "projects", name: "Client projects", required: true, pointsRequired: 24, progress: 0, description: "Tasks, owners, deadlines, and client-facing status.", effect: "Required to launch" },
  { id: "approvals", name: "Approval flow", required: true, pointsRequired: 18, progress: 0, description: "Request, review, comment, and approve deliverables.", effect: "Required to launch" },
  { id: "billing", name: "Billing", required: false, pointsRequired: 16, progress: 0, description: "Invoice milestones and payment visibility.", effect: "Improves value for operations-led buyers" },
  { id: "analytics", name: "Analytics", required: false, pointsRequired: 20, progress: 0, description: "Delivery health, utilization, and client reporting.", effect: "Unlocks stronger mid-market deals" },
  { id: "mobile", name: "Mobile experience", required: false, pointsRequired: 25, progress: 0, description: "Responsive review and approval workflows.", effect: "Improves activation and satisfaction" },
  { id: "security", name: "Security hardening", required: false, pointsRequired: 18, progress: 0, description: "Access logs, backups, and security controls.", effect: "Required by security-sensitive prospects" },
];

export const OFFICE_CONFIG: Record<OfficeTier, { capacity: number; weeklyCost: number; morale: number; label: string }> = {
  Apartment: { capacity: 2, weeklyCost: 0, morale: -1, label: "Apartment" },
  Coworking: { capacity: 6, weeklyCost: 425, morale: 3, label: "Cedar Works" },
  Studio: { capacity: 12, weeklyCost: 1_150, morale: 7, label: "Foundry Studio" },
};

export const OFFICE_UPGRADES: Record<Exclude<OfficeTier, "Apartment">, { deposit: number; minTeam: number }> = {
  Coworking: { deposit: 1_250, minTeam: 2 },
  Studio: { deposit: 4_500, minTeam: 4 },
};

export const IDEA = {
  name: "Relaydesk",
  description: "A lightweight client operations workspace for boutique service firms.",
  customer: "10–50 person agencies",
  model: "Per-seat SaaS",
  market: "$420M–$680M",
  competition: "Moderate",
  margin: "78–86%",
};

export const PROSPECT_NAMES = ["Benton Creative", "Northline Studio", "Fieldwork Co.", "Goodwell Agency", "Sable & Pine", "Parallel Works", "Kindred Digital", "Bright Harbor", "Common Thread", "Outline Labs", "June Street", "Afterlight Co."];
export const CUSTOMER_NEEDS: CustomerNeed[] = ["Approvals", "Analytics", "Security", "Mobile", "Billing", "Reliability"];
export const PIPELINE_STAGES = ["Lead", "Contacted", "Discovery", "Demo", "Proposal", "Negotiation"] as const;
