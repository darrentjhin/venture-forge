import { describe, expect, it } from "vitest";
import { newRun } from "../engine/init";
import { advanceWeek } from "../engine/week";
import { migrateGameState } from "../store/migrate";

describe("save migration", () => {
  it("loads a version 3 company without wiping it and continues playing", () => {
    const current = newRun(95);
    const legacy: Record<string, unknown> = { ...current, version: 3 };
    for (const key of ["companyNumber", "companyStartedWeek", "founder", "companyHistory", "firedMilestones", "cards", "crisis", "emergencyLoanBalance", "workspaceCap", "quarterReports", "officeBeat"]) delete legacy[key];
    const migrated = migrateGameState(legacy);
    expect(migrated?.version).toBe(4);
    expect(migrated?.seed).toBe(95);
    expect(migrated?.companyNumber).toBe(1);
    expect(migrated ? advanceWeek(migrated).week : 0).toBe(2);
  });
});
