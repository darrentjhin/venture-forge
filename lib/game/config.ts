import type { Background, Employee, OfficeTier } from "./types";

export const BACKGROUNDS: Array<{ name: Background; tagline: string; bonus: string }> = [
  { name: "Engineering", tagline: "Build lean, ship early", bonus: "+18% product output" },
  { name: "Sales", tagline: "Open doors before they close", bonus: "+22% sales conversion" },
  { name: "Design", tagline: "Make the product feel inevitable", bonus: "+15 product quality" },
  { name: "Business", tagline: "Keep options open and cash close", bonus: "-12% operating costs" },
];

export const HUSTLES = [
  { name: "Freelance sprint", detail: "Build a landing page for a local studio.", pay: 780, energy: 24, skill: "product" },
  { name: "Founder workshop", detail: "Teach a Saturday no-code workshop.", pay: 460, energy: 16, skill: "network" },
  { name: "Market audit", detail: "Review a small retailer's software stack.", pay: 620, energy: 20, skill: "research" },
];

export const CANDIDATES: Employee[] = [
  { id: "maya", name: "Maya Chen", role: "Product Engineer", skill: 82, morale: 86, weeklySalary: 2_450, color: "#f0a982" },
  { id: "theo", name: "Theo Brooks", role: "Account Executive", skill: 76, morale: 91, weeklySalary: 2_100, color: "#98b8ff" },
  { id: "ines", name: "Ines Silva", role: "Product Designer", skill: 79, morale: 88, weeklySalary: 2_250, color: "#d7b2ff" },
  { id: "omar", name: "Omar Haddad", role: "Customer Success", skill: 73, morale: 94, weeklySalary: 1_850, color: "#8ed4b3" },
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
