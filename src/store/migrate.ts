import { BALANCE } from "../data/balance";
import type { FounderLegacy, GameState } from "../engine/types";
import { seedTasks } from "../engine/tasks";
import { eventSenderFor } from "../engine/events";
import { createInvestorRoster } from "../data/investors";

type UpdateOneKeys =
  "version" | "companyNumber" | "companyStartedWeek" | "founder" | "companyHistory" | "firedMilestones" | "cards" |
  "crisis" | "emergencyLoanBalance" | "workspaceCap" | "quarterReports" | "officeBeat";
type UpdateTwoKeys = "version" | "tasks" | "completedTasks" | "taskSerial" | "taskMrr" | "findings" | "workloads" | "unlockedApps";
type FounderV5 = Omit<FounderLegacy, "coffeeDay" | "coffeeToday" | "jittery">;
type UpdateSixKeys = "version" | "officeMove" | "productLines" | "productSerial" | "portfolio" | "holdingDividends";
type UpdateFourKeys = "version" | "investors" | "rounds" | "capTable" | "activeRoundId";
type LegacyV7 = Omit<GameState, UpdateSixKeys> & { version: 7 };
type LegacyV6 = Omit<LegacyV7, UpdateFourKeys> & { version: 6 };
type LegacyV5 = Omit<LegacyV6, "version" | "founder"> & { version: 5; founder: FounderV5 };
type LegacyV4 = Omit<LegacyV5, UpdateTwoKeys> & { version: 4 };
type LegacyV3 = Omit<LegacyV4, UpdateOneKeys> & { version: 3 };

export function migrateGameState(value: unknown): GameState | null {
  if (!value || typeof value !== "object") return null;
  const version = (value as { version?: unknown }).version;
  if (version === 8) return value as GameState;
  let oldSeven: LegacyV7;
  let needsTaskSeed = false;
  if (version === 7) oldSeven = value as LegacyV7;
  else {
    let oldSix: LegacyV6;
    if (version === 6) oldSix = value as LegacyV6;
    else {
      let oldFive: LegacyV5;
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
      oldSix = {
        ...oldFive,
        version: 6,
        founder: { ...oldFive.founder, coffeeDay: oldFive.day, coffeeToday: 0, jittery: false },
      };
    }
    const cofounder = oldSix.people.find((person) => person.isCofounder);
    oldSeven = {
      ...oldSix,
      version: 7,
      investors: createInvestorRoster(), rounds: [], activeRoundId: null, outsideCapital: 0,
      capTable: [
        { id: "founder", holder: "You", kind: "founder", shares: 6_000_000, roundId: null, sinceWeek: 1 },
        { id: "cofounder", holder: cofounder?.name ?? "Cofounder", kind: "cofounder", shares: 3_000_000, roundId: null, sinceWeek: 1 },
        { id: "option-pool", holder: "Employee option pool", kind: "optionPool", shares: 1_000_000, roundId: null, sinceWeek: 1 },
      ],
    };
  }
  const migrated: GameState = {
    ...oldSeven,
    version: 8,
    officeMove: null, productLines: [], productSerial: 0, portfolio: [], holdingDividends: 0,
  };
  if (needsTaskSeed) seedTasks(migrated);
  return migrated;
}
