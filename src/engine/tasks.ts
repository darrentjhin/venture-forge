import { FEATURE_LABELS } from "../data/features";
import { SEGMENT_LABELS } from "../data/segments";
import { TASK_TEMPLATES, type TaskTemplate } from "../data/taskTemplates";
import { cloneGameState } from "./clone";
import type { BeliefKey, Finding, GameState, Person, Skill, Task, TaskReward } from "./types";

const ROLE_SKILLS: Record<Person["role"], Skill[]> = {
  Cofounder: ["ops", "research"], Engineer: ["engineering"], Designer: ["design", "research"], Sales: ["sales", "research"], "Customer success": ["support", "research"], Operations: ["ops", "support"],
};

export function skillValue(person: Person, skill: Skill): number {
  const match = ROLE_SKILLS[person.role].includes(skill);
  return person.skill * (match ? 1 : person.isCofounder ? .72 : .42);
}

function rewardFor(template: TaskTemplate, state: GameState): TaskReward {
  if (template.skill === "engineering") return { techDebt: -6, fit: template.id === "integration" ? 12 : undefined, shipsFeature: template.id === "integration" ? state.selectedFeature : undefined };
  if (template.skill === "design") return { reputation: 1, fit: 4 };
  if (template.skill === "sales") return { cash: 800, mrr: 180, reputation: 2 };
  if (template.skill === "support") return { reputation: 2, fit: 5 };
  if (template.skill === "ops") return { cash: 450, techDebt: -2 };
  return { unlocksTask: "finding" };
}

function instantiate(state: GameState, template: TaskTemplate): Task {
  const id = `task-${state.taskSerial}-${template.id}`;
  state.taskSerial += 1;
  return { id, title: template.title, detail: template.detail, skill: template.skill, effort: template.effort, progress: 0, assigned: [], source: template.source, reward: rewardFor(template, state), expiresWeek: null, createdWeek: state.week };
}

export function seedTasks(state: GameState): void {
  for (const id of ["interview-five", "export-bug", "call-leads", "invoice-cleanup"]) {
    const template = TASK_TEMPLATES.find((item) => item.id === id);
    if (template) state.tasks.push(instantiate(state, template));
  }
}

export function assignTask(input: GameState, taskId: string, personId: string): GameState {
  const task = input.tasks.find((item) => item.id === taskId);
  if (!task || !input.people.some((person) => person.id === personId) || task.assigned.includes(personId) || task.assigned.length >= 3) return input;
  const state = cloneGameState(input);
  const target = state.tasks.find((item) => item.id === taskId);
  if (target) target.assigned.push(personId);
  return state;
}

export function unassignTask(input: GameState, taskId: string, personId: string): GameState {
  const state = cloneGameState(input);
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return input;
  task.assigned = task.assigned.filter((id) => id !== personId);
  return state;
}

function findingFor(state: GameState, task: Task): Finding {
  const index = state.findings.length % 5;
  const texts = [
    `The people approving purchases keep coming from ${SEGMENT_LABELS[state.truth.buyer]}.`,
    `Four customers returned to ${FEATURE_LABELS[state.truth.wedgeFeature]} without being prompted.`,
    `Most buyers stayed comfortable near $${Math.round(state.truth.willingnessToPay).toLocaleString()} a month.`,
    `The warmest conversations arrived through ${state.truth.channel.replace(/-/g, " ")}.`,
    `Customers who left kept describing ${state.truth.churnDriver.replace(/-/g, " ")}.`,
  ];
  return { id: `finding-${state.week}-${state.findings.length}`, week: state.week, from: task.title, text: texts[index], actedOn: false };
}

function moveOneAnswer(state: GameState): void {
  const order: BeliefKey[] = ["buyer", "wedge", "price", "channel", "churnCause"];
  const key = order.find((item) => item === "buyer" ? state.beliefs.buyer.value !== state.truth.buyer : item === "wedge" ? state.beliefs.wedge.value !== state.truth.wedgeFeature : item === "price" ? Math.abs(state.beliefs.price.value - state.truth.willingnessToPay) > 25 : item === "channel" ? state.beliefs.channel.value !== state.truth.channel : state.beliefs.churnCause.value !== state.truth.churnDriver);
  if (!key) return;
  if (key === "buyer") state.beliefs.buyer = { value: state.truth.buyer, confidence: 72, committedWeek: state.week };
  if (key === "wedge") state.beliefs.wedge = { value: state.truth.wedgeFeature, confidence: 72, committedWeek: state.week };
  if (key === "price") state.beliefs.price = { value: Math.round(state.truth.willingnessToPay / 25) * 25, confidence: 72, committedWeek: state.week };
  if (key === "channel") state.beliefs.channel = { value: state.truth.channel, confidence: 72, committedWeek: state.week };
  if (key === "churnCause") state.beliefs.churnCause = { value: state.truth.churnDriver, confidence: 72, committedWeek: state.week };
  const latest = state.findings.find((item) => !item.actedOn);
  if (latest) latest.actedOn = true;
}

function applyReward(state: GameState, task: Task): void {
  const reward = task.reward;
  state.cash += reward.cash ?? 0;
  state.taskMrr += reward.mrr ?? 0;
  state.reputation = Math.max(0, Math.min(100, state.reputation + (reward.reputation ?? 0)));
  state.techDebt = Math.max(0, state.techDebt + (reward.techDebt ?? 0));
  if (reward.shipsFeature && !state.shippedFeatures.includes(reward.shipsFeature)) state.shippedFeatures.push(reward.shipsFeature);
  if (reward.fit) moveOneAnswer(state);
  if (task.skill === "research") state.findings.push(findingFor(state, task));
}

export function processTasks(state: GameState): string[] {
  const notes: string[] = [];
  const active = [...state.tasks].sort((a, b) => a.createdWeek - b.createdWeek || a.id.localeCompare(b.id));
  const loads = new Map<string, number>();
  active.forEach((task) => task.assigned.forEach((id) => loads.set(id, (loads.get(id) ?? 0) + 1)));
  for (const person of state.people) {
    const load = loads.get(person.id) ?? 0;
    const record = state.workloads[person.id] ?? { overworkWeeks: 0, burnout: 0 };
    record.overworkWeeks = load >= 3 ? record.overworkWeeks + 1 : Math.max(0, record.overworkWeeks - 1);
    if (record.overworkWeeks >= 3) { record.burnout = Math.min(100, record.burnout + 14); person.morale = Math.max(0, person.morale - 4); }
    if (record.burnout >= 70) { person.motion = "struggling"; person.drift = Math.min(100, person.drift + 7); }
    state.workloads[person.id] = record;
  }
  const completed: Task[] = [];
  for (const task of active) {
    let output = 0;
    for (const id of task.assigned) {
      const person = state.people.find((item) => item.id === id);
      if (!person) continue;
      const load = loads.get(id) ?? 1;
      const contextPenalty = load > 1 ? .85 : 1;
      const moraleFactor = .45 + person.morale / 180;
      const focusFactor = state.pivotWeeksRemaining > 0 ? .5 : 1;
      output += skillValue(person, task.skill) * moraleFactor * focusFactor * contextPenalty / load;
    }
    task.progress = Math.min(task.effort, task.progress + output);
    if (task.progress >= task.effort) completed.push(task);
  }
  for (const task of completed) {
    applyReward(state, task);
    state.completedTasks.push(task.id);
    notes.push(`${task.title} finished.`);
  }
  if (completed.length) state.tasks = state.tasks.filter((task) => !completed.some((done) => done.id === task.id));
  return notes;
}

export function addWeeklyTask(state: GameState): void {
  if (state.tasks.length >= 7 || state.week % 2 !== 0) return;
  const template = TASK_TEMPLATES[(state.seed + state.week + state.completedTasks.length) % TASK_TEMPLATES.length];
  state.tasks.push(instantiate(state, template));
}
