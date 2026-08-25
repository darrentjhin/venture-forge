import { BALANCE } from "../data/balance";
import { weeklyBurn, runwayWeeks } from "./economy";
import type { GameState, Person, RoomStage } from "./types";

export function selectWeeklyRevenue(state: GameState): number { return state.mrr / 4.33; }
export function selectBurn(state: GameState): number { return weeklyBurn(state); }
export function selectRunway(state: GameState): number { return runwayWeeks(state.cash, selectWeeklyRevenue(state), selectBurn(state)); }
export function selectRunwayDisplay(state: GameState): string { const runway = selectRunway(state); return Number.isFinite(runway) ? `${Math.floor(runway)} weeks` : "∞ weeks"; }
export function selectRunwayMood(state: GameState): 0 | 1 | 2 | 3 | 4 | 5 {
  const runway = selectRunway(state);
  if (!Number.isFinite(runway) || runway > 20) return 0;
  if (runway >= 16) return 1;
  if (runway >= 12) return 2;
  if (runway >= 8) return 3;
  if (runway >= 3) return 4;
  return 5;
}
export function selectRoomStage(state: GameState): RoomStage {
  const recent = state.headcountHistory.slice(-4);
  const high = recent.length ? Math.max(...recent) : state.people.length + 1;
  if (high >= 4 && state.people.length + 1 <= high * .7) return "downsized";
  const count = state.people.length + 1;
  if (state.week === 1) return "apartment";
  if (count <= 2) return "kitchen";
  if (count <= 5) return "coworking";
  if (count <= 12) return "office";
  if (count <= 25) return "floor";
  return "hq";
}
export function selectMoralePhrase(person: Person): string {
  if (person.morale >= 78 && person.drift < 40) return "in a good rhythm";
  if (person.morale >= 55) return "steady, but watching";
  if (person.morale >= 35) return "getting frustrated";
  return "one foot out the door";
}
export function selectWorkspaceCost(state: GameState): number { return BALANCE.workspaceWeekly[state.workspace]; }
