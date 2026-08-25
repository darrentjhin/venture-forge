import { ARCHETYPES, type ArchetypeId } from "../data/archetypes";
import { NAMES } from "../data/nameBank";
import { hashString, randomInt } from "./rng";
import type { BeliefKey, GameState, Person, Role } from "./types";

const ROLES: Role[] = ["Engineer", "Designer", "Sales", "Customer success", "Operations"];
const ARCHETYPE_IDS = Object.keys(ARCHETYPES) as ArchetypeId[];

export function appearanceFromId(id: string): Person["appearance"] {
  const hash = hashString(id);
  return { head: hash % 3, hair: (hash >>> 3) % 8, skin: (hash >>> 7) % 8, shirt: (hash >>> 11) % 6, glasses: Boolean((hash >>> 15) % 2) };
}

export function createCofounder(seed: number): Person {
  const name = NAMES[seed % NAMES.length];
  return { id: `cofounder-${seed}`, name, role: "Cofounder", archetype: "cofounder", salaryWeekly: 0, skill: 70 + seed % 16, morale: 78, beliefs: {}, drift: 8, quirk: ARCHETYPES.cofounder.quirk, hiredWeek: 1, seat: 1, appearance: appearanceFromId(`cofounder-${seed}`), motion: "typing", isCofounder: true };
}

export function createHire(state: GameState): { person: Person; rngState: number } {
  let rngState = state.rngState;
  const available = NAMES.filter((name) => !state.people.some((person) => person.name === name));
  const nameRoll = randomInt(rngState, 0, available.length - 1); rngState = nameRoll.state;
  const roleRoll = randomInt(rngState, 0, ROLES.length - 1); rngState = roleRoll.state;
  const archetypeRoll = randomInt(rngState, 0, ARCHETYPE_IDS.length - 2); rngState = archetypeRoll.state;
  const skillRoll = randomInt(rngState, 38, 92); rngState = skillRoll.state;
  const salary = skillRoll.value < 58 ? 900 + skillRoll.value * 7 : skillRoll.value < 78 ? 1200 + skillRoll.value * 11 : 1600 + skillRoll.value * 15;
  const id = `person-${state.week}-${state.people.length}-${nameRoll.value}`;
  const key: BeliefKey = ["buyer", "price", "wedge", "churnCause", "channel"][roleRoll.value] as BeliefKey;
  const belief = key === "price" ? String(state.price) : key === "buyer" ? state.beliefs.buyer.value : key === "wedge" ? state.beliefs.wedge.value : key === "churnCause" ? state.beliefs.churnCause.value : state.beliefs.channel.value;
  const archetype = ARCHETYPE_IDS[archetypeRoll.value];
  return { person: { id, name: available[nameRoll.value], role: ROLES[roleRoll.value], archetype, salaryWeekly: Math.round(salary), skill: skillRoll.value, morale: 72, beliefs: { [key]: belief }, drift: 12, quirk: ARCHETYPES[archetype].quirk, hiredWeek: state.week, seat: state.people.length + 1, appearance: appearanceFromId(id), motion: "typing", isCofounder: false }, rngState };
}

export function computeFocus(state: GameState): number {
  const team = state.people.reduce((sum, person) => sum + (2 + Math.floor(person.skill / 33)) * person.morale / 100, 0);
  const managementTax = Math.floor(state.people.length / 4);
  const supportTax = Math.floor(state.customers.length / 12) + Math.floor(state.customers.filter((customer) => customer.segment !== state.beliefs.buyer.value).length / 12);
  const pivotPenalty = state.pivotWeeksRemaining > 0 ? .5 : 1;
  return Math.max(1, Math.floor((5 + team - managementTax - supportTax + state.nextFocusBonus) * pivotPenalty));
}

export function updatePeople(state: GameState): void {
  for (const person of state.people) {
    const disagreements = Object.entries(person.beliefs).filter(([key, value]) => String(state.beliefs[key as BeliefKey].value) !== value).length;
    const sensitivity = ARCHETYPES[person.archetype].driftSensitivity;
    person.drift = Math.min(100, person.drift + disagreements * sensitivity + Math.max(0, state.overclaim - 10) / 18 - person.morale / 100);
    person.morale = Math.max(0, Math.min(100, person.morale + (state.mrr > state.previousMrr ? 2 : -1) - (state.pivotWeeksRemaining > 0 ? 3 : 0)));
    person.motion = person.morale < 35 ? "struggling" : person.drift > 55 ? "thinking" : person.motion;
  }
}
