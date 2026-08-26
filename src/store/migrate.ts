import { BALANCE } from "../data/balance";
import type { GameState } from "../engine/types";

type LegacyGame = Omit<GameState,
  "version" | "companyNumber" | "companyStartedWeek" | "founder" | "companyHistory" | "firedMilestones" | "cards" |
  "crisis" | "emergencyLoanBalance" | "workspaceCap" | "quarterReports" | "officeBeat"
> & { version: 3 };

export function migrateGameState(value: unknown): GameState | null {
  if (!value || typeof value !== "object") return null;
  const version = (value as { version?: unknown }).version;
  if (version === 4) return value as GameState;
  if (version !== 3) return null;
  const old = value as LegacyGame;
  return {
    ...old, version: 4, ending: null, postMortem: null,
    companyNumber: 1, companyStartedWeek: 1,
    founder: { cash: BALANCE.startingCash, reputation: old.reputation, network: 0, relationships: {}, history: [] },
    companyHistory: [], firedMilestones: [], cards: [],
    crisis: { active: false, choiceRequired: false, consecutiveNegativeWeeks: 0, enteredWeek: null, crisesSurvived: 0 },
    emergencyLoanBalance: 0, workspaceCap: null, quarterReports: [], officeBeat: 0,
  };
}
