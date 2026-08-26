import { selectBurn, selectWeeklyRevenue } from "./selectors";
import { FEATURES } from "../data/features";
import type { CompanyHistoryEntry, GameState } from "./types";

export interface MilestoneDef { id: string; test: (state: GameState) => boolean; title: string; body: string; icon: string; }

export const MILESTONES: MilestoneDef[] = [
  { id: "first-customer", test: (s) => s.totalCustomersWon >= 1, title: "Someone paid", body: "The first customer trusted the company with real money.", icon: "💵" },
  { id: "ten-customers", test: (s) => s.totalCustomersWon >= 10, title: "Ten customers", body: "The customer list needs more than one hand to count.", icon: "🔟" },
  { id: "fifty-customers", test: (s) => s.totalCustomersWon >= 50, title: "Fifty customers", body: "Word is travelling beyond the people you know.", icon: "📣" },
  { id: "hundred-customers", test: (s) => s.totalCustomersWon >= 100, title: "One hundred customers", body: "The company has a crowd now.", icon: "💯" },
  { id: "first-hire", test: (s) => s.people.length >= 2, title: "First hire", body: "Someone chose this company over every safer option.", icon: "🪪" },
  { id: "team-five", test: (s) => s.people.length + 1 >= 5, title: "A five-person team", body: "The room sounds different when everyone is working.", icon: "🧑‍💻" },
  { id: "team-ten", test: (s) => s.people.length + 1 >= 10, title: "Double-digit team", body: "You can no longer hear every conversation.", icon: "🏢" },
  { id: "team-twenty-five", test: (s) => s.people.length + 1 >= 25, title: "Twenty-five people", body: "The company has become a place other people shape.", icon: "🏙️" },
  { id: "first-feature", test: (s) => s.shippedFeatures.length >= 1, title: "First feature shipped", body: "The roadmap became something customers can touch.", icon: "📦" },
  { id: "three-features", test: (s) => s.shippedFeatures.length >= 3, title: "A real product", body: "Three shipped pieces now work together.", icon: "🧩" },
  { id: "all-features", test: (s) => s.shippedFeatures.length >= FEATURES.length, title: "The full toolbox", body: "Every planned feature made it into customers’ hands.", icon: "🧰" },
  { id: "one-thousand-mrr", test: (s) => s.mrr >= 1_000, title: "$1,000 a month", body: "Revenue can cover more than a celebratory dinner.", icon: "🌱" },
  { id: "ten-thousand-mrr", test: (s) => s.mrr >= 10_000, title: "$10,000 a month", body: "This is no longer a tiny experiment.", icon: "🚀" },
  { id: "fifty-thousand-mrr", test: (s) => s.mrr >= 50_000, title: "$50,000 a month", body: "The business has weight now.", icon: "🏗️" },
  { id: "profitable-week", test: (s) => s.weeklyReports.some((r) => r.cashDelta > 0), title: "First profitable week", body: "More money came in than went out.", icon: "☀️" },
  { id: "profitable-now", test: (s) => selectWeeklyRevenue(s) > selectBurn(s), title: "The engine pays for itself", body: "Current revenue now covers the weekly bills.", icon: "⚙️" },
  { id: "first-office", test: (s) => ["office", "floor", "hq"].includes(s.workspace), title: "The first office", body: "There is a key, a lease, and a door with your name behind it.", icon: "🔑" },
  { id: "office-floor", test: (s) => ["floor", "hq"].includes(s.workspace), title: "A whole floor", body: "The elevator opens directly into the company.", icon: "🛗" },
  { id: "first-year", test: (s) => s.week - s.companyStartedWeek + 1 >= 52, title: "One year survived", body: "The company lived through every season.", icon: "🎂" },
  { id: "first-investor", test: (s) => s.outsideCapital > 0, title: "First outside money", body: "Someone outside the room put money behind the team.", icon: "🤝" },
  { id: "million-valuation", test: (s) => s.valuation >= 1_000_000, title: "Seven figures", body: "The company is now valued above one million dollars.", icon: "7️⃣" },
  { id: "trusted-name", test: (s) => s.reputation >= 70, title: "A trusted name", body: "People return calls before you have to chase them.", icon: "📞" },
  { id: "work-anniversary", test: (s) => s.people.some((p) => s.week - p.hiredWeek >= 52), title: "First work anniversary", body: "A teammate has been here for a full year.", icon: "🎉" },
  { id: "crisis-survivor", test: (s) => s.crisis.crisesSurvived >= 1, title: "Back from the edge", body: "The bank balance went red. The company kept going.", icon: "🧯" },
  { id: "second-company", test: (s) => s.companyNumber >= 2, title: "Company two", body: "You lost a company, not the career.", icon: "🔁" },
];

export function fireNextMilestone(state: GameState): CompanyHistoryEntry | null {
  const next = MILESTONES.find((item) => !state.firedMilestones.includes(item.id) && item.test(state));
  if (!next) return null;
  state.firedMilestones.push(next.id);
  return { id: next.id, week: state.week, kind: "milestone", title: next.title, body: next.body, icon: next.icon };
}
