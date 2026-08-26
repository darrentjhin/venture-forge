import type { GameState, QuarterReport } from "./types";

export function yearForWeek(week: number): number { return Math.floor((Math.max(1, week) - 1) / 52) + 1; }
export function weekOfYear(week: number): number { return ((Math.max(1, week) - 1) % 52) + 1; }
export function quarterForWeek(week: number): number { return Math.floor((weekOfYear(week) - 1) / 13) + 1; }
export function calendarLabel(week: number): string { return `Y${yearForWeek(week)} W${weekOfYear(week)}`; }

export function closeQuarter(state: GameState): QuarterReport | null {
  if (state.week % 13 !== 0) return null;
  const recent = state.history.slice(-13);
  const openingMrr = recent[0]?.mrr ?? 0;
  const profitableWeeks = state.weeklyReports.slice(-13).filter((report) => report.cashDelta >= 0).length;
  const grew = state.mrr > openingMrr;
  const grade: QuarterReport["grade"] = profitableWeeks >= 9 && grew ? "A" : profitableWeeks >= 5 || grew ? "B" : state.cash >= 0 ? "C" : "D";
  const officeBeat = (["plant", "paint", "delivery"] as const)[state.quarterReports.length % 3];
  const quarter = quarterForWeek(state.week);
  const year = yearForWeek(state.week);
  return {
    year, quarter, week: state.week, grade, officeBeat,
    title: `Year ${year}, quarter ${quarter}: ${grade}`,
    body: grew ? `Monthly revenue moved from $${Math.round(openingMrr).toLocaleString()} to $${Math.round(state.mrr).toLocaleString()}.` : `The company held at $${Math.round(state.mrr).toLocaleString()} monthly.`,
  };
}
