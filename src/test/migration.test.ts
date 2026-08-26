import { describe, expect, it } from "vitest";
import { newRun } from "../engine/init";
import { advanceWeek } from "../engine/week";
import { migrateGameState } from "../store/migrate";

describe("save migration", () => {
  it("loads a version 3 company without wiping it and continues playing", () => {
    const current = newRun(95);
    const legacy: Record<string, unknown> = { ...current, version: 3 };
    for (const key of ["companyNumber", "companyStartedWeek", "founder", "companyHistory", "firedMilestones", "cards", "crisis", "emergencyLoanBalance", "workspaceCap", "quarterReports", "officeBeat", "tasks", "completedTasks", "taskSerial", "taskMrr", "findings", "workloads", "unlockedApps"]) delete legacy[key];
    const migrated = migrateGameState(legacy);
    expect(migrated?.version).toBe(8);
    expect(migrated?.seed).toBe(95);
    expect(migrated?.companyNumber).toBe(1);
    expect(migrated?.tasks).toHaveLength(4);
    expect(migrated ? advanceWeek(migrated).week : 0).toBe(2);
  });

  it("adds the task layer to a version 4 save", () => {
    const current = newRun(96);
    const legacy: Record<string, unknown> = { ...current, version: 4 };
    for (const key of ["tasks", "completedTasks", "taskSerial", "taskMrr", "findings", "workloads", "unlockedApps"]) delete legacy[key];
    const migrated = migrateGameState(legacy);
    expect(migrated?.version).toBe(8);
    expect(migrated?.tasks.map((task) => task.title)).toContain("Interview five customers");
  });

  it("adds the founder day to a version 5 save", () => {
    const current = newRun(97);
    const founder = { ...current.founder } as Record<string, unknown>;
    delete founder.coffeeDay;
    delete founder.coffeeToday;
    delete founder.jittery;
    const migrated = migrateGameState({ ...current, version: 5, founder });
    expect(migrated?.version).toBe(8);
    expect(migrated?.founder.coffeeToday).toBe(0);
    expect(migrated?.founder.jittery).toBe(false);
  });

  it("adds investors and a ten-million-share cap table to a version 6 save", () => {
    const current = newRun(98);
    const legacy: Record<string, unknown> = { ...current, version: 6 };
    for (const key of ["investors", "rounds", "capTable", "activeRoundId"]) delete legacy[key];
    const migrated = migrateGameState(legacy);
    expect(migrated?.version).toBe(8);
    expect(migrated?.investors).toHaveLength(40);
    expect(migrated?.capTable.reduce((sum, entry) => sum + entry.shares, 0)).toBe(10_000_000);
  });

  it("adds the growth layer to a version 7 save", () => {
    const current = newRun(99);
    const legacy: Record<string, unknown> = { ...current, version: 7 };
    for (const key of ["officeMove", "productLines", "productSerial", "portfolio", "holdingDividends"]) delete legacy[key];
    const migrated = migrateGameState(legacy);
    expect(migrated?.version).toBe(8);
    expect(migrated?.officeMove).toBeNull();
    expect(migrated?.productLines).toEqual([]);
    expect(migrated?.portfolio).toEqual([]);
    expect(migrated?.holdingDividends).toBe(0);
  });
});
