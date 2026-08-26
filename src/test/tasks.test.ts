import { describe, expect, it } from "vitest";
import { TASK_TEMPLATES } from "../data/taskTemplates";
import { newRun } from "../engine/init";
import { assignTask, processTasks } from "../engine/tasks";
import type { GameState, Task } from "../engine/types";

function controlledTask(id: string, effort = 10_000): Task {
  return { id, title: id, detail: "Controlled work", skill: "research", effort, progress: 0, assigned: [], source: "backlog", reward: {}, expiresWeek: null, createdWeek: 1 };
}

function withTasks(count: number): GameState {
  const state = newRun(501);
  state.tasks = Array.from({ length: count }, (_, index) => controlledTask(`task-${String(index).padStart(2, "0")}`));
  const personId = state.people[0]?.id;
  if (personId) state.tasks.forEach((task) => task.assigned.push(personId));
  return state;
}

describe("task work", () => {
  it("ships at least sixty distinct named tasks", () => {
    expect(TASK_TEMPLATES).toHaveLength(60);
    expect(new Set(TASK_TEMPLATES.map((task) => task.title)).size).toBe(60);
  });

  it("assigns people without spending founder focus and caps a task at three people", () => {
    let state = newRun(502);
    const task = state.tasks[0];
    const person = state.people[0];
    expect(task && person).toBeTruthy();
    if (!task || !person) return;
    const focus = state.focus;
    state = assignTask(state, task.id, person.id);
    expect(state.tasks[0]?.assigned).toEqual([person.id]);
    expect(state.focus).toBe(focus);
  });

  it("splits output and applies the fifteen-percent switching loss", () => {
    const solo = withTasks(1);
    processTasks(solo);
    const soloOutput = solo.tasks[0]?.progress ?? 0;
    const split = withTasks(2);
    processTasks(split);
    const splitOutput = split.tasks[0]?.progress ?? 0;
    expect(splitOutput).toBeCloseTo(soloOutput * .85 / 2, 5);
  });

  it("starts burnout after three consecutive weeks on three tasks", () => {
    const state = withTasks(3);
    processTasks(state); processTasks(state); processTasks(state);
    const person = state.people[0];
    expect(person ? state.workloads[person.id]?.overworkWeeks : 0).toBe(3);
    expect(person ? state.workloads[person.id]?.burnout : 0).toBeGreaterThan(0);
  });

  it("completes same-week work in stable id order", () => {
    const state = newRun(503);
    const person = state.people[0];
    if (!person) return;
    const later = controlledTask("task-z", 1); later.title = "Later"; later.assigned = [person.id];
    const earlier = controlledTask("task-a", 1); earlier.title = "Earlier"; earlier.assigned = [person.id];
    state.tasks = [later, earlier];
    expect(processTasks(state)).toEqual(["Earlier finished.", "Later finished."]);
    expect(state.completedTasks).toEqual(["task-a", "task-z"]);
  });
});
