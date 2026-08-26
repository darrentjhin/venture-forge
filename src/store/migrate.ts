import { BALANCE } from "../data/balance";
import type { FounderLegacy, GameState } from "../engine/types";
import { seedTasks } from "../engine/tasks";
import { eventSenderFor } from "../engine/events";

type UpdateOneKeys =
  "version" | "companyNumber" | "companyStartedWeek" | "founder" | "companyHistory" | "firedMilestones" | "cards" |
  "crisis" | "emergencyLoanBalance" | "workspaceCap" | "quarterReports" | "officeBeat";
type UpdateTwoKeys = "version" | "tasks" | "completedTasks" | "taskSerial" | "taskMrr" | "findings" | "workloads" | "unlockedApps";
type FounderV5 = Omit<FounderLegacy, "coffeeDay" | "coffeeToday" | "jittery">;
type LegacyV5 = Omit<GameState, "version" | "founder"> & { version: 5; founder: FounderV5 };
type LegacyV4 = Omit<LegacyV5, UpdateTwoKeys> & { version: 4 };
type LegacyV3 = Omit<LegacyV4, UpdateOneKeys> & { version: 3 };

export function migrateGameState(value: unknown): GameState | null {
  if (!value || typeof value !== "object") return null;
  const version = (value as { version?: unknown }).version;
  if (version === 6) return value as GameState;
  let oldFive: LegacyV5;
  let needsTaskSeed = false;
  if (version === 5) {
    oldFive = value as LegacyV5;
  } else {
    let old: LegacyV4;
    if (version === 4) old = value as LegacyV4;
    else if (version === 3) {
      const v3 = value as LegacyV3;
      old = {
        ...v3, version: 4, ending: null, postMortem: null, companyNumber: 1, companyStartedWeek: 1,
        founder: { cash: BALANCE.startingCash, reputation: v3.reputation, network: 0, relationships: {}, history: [] },
        companyHistory: [], firedMilestones: [], cards: [], crisis: { active: false, choiceRequired: false, consecutiveNegativeWeeks: 0, enteredWeek: null, crisesSurvived: 0 },
        emergencyLoanBalance: 0, workspaceCap: null, quarterReports: [], officeBeat: 0,
      };
    } else return null;
    oldFive = {
      ...old, version: 5,
      pendingEvents: old.pendingEvents.map((event) => ({ ...event, sender: event.sender || eventSenderFor(event.id) })),
      eventHistory: old.eventHistory.map((event) => ({ ...event, sender: event.sender || eventSenderFor(event.id) })),
      tasks: [], completedTasks: [], taskSerial: 0, taskMrr: 0, findings: [], workloads: {}, unlockedApps: ["tasks", "inbox", "team", "bank"],
    };
    needsTaskSeed = true;
  }
  const migrated: GameState = {
    ...oldFive,
    version: 6,
    founder: { ...oldFive.founder, coffeeDay: oldFive.day, coffeeToday: 0, jittery: false },
  };
  if (needsTaskSeed) seedTasks(migrated);
  return migrated;
}
