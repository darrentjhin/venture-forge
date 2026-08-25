import { EVENT_DEFS } from "../data/eventDefs";
import { cloneGameState } from "./clone";
import type { GameEvent, GameState } from "./types";

export function evaluateEvents(state: GameState): GameEvent[] {
  return EVENT_DEFS
    .filter((definition) => !state.firedEvents.includes(definition.id) && definition.trigger(state))
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
    .slice(0, 2)
    .map((definition) => {
      const decision = [...state.decisionLog].reverse().find((item) => item.type === definition.causeType);
      return { id: definition.id, causeRef: decision?.id ?? "origin", cause: definition.cause(state), headline: definition.headline, body: definition.body, choices: definition.choices };
    });
}

export function canChooseEvent(state: GameState, event: GameEvent, choiceId: string): boolean {
  const choice = event.choices.find((item) => item.id === choiceId);
  return Boolean(choice);
}

export function resolveEvent(state: GameState, eventId: string, choiceId: string): GameState {
  const event = state.pendingEvents.find((item) => item.id === eventId);
  const choice = event?.choices.find((item) => item.id === choiceId);
  if (!event || !choice || !canChooseEvent(state, event, choiceId)) return state;
  const next = cloneGameState(state);
  const focusShortfall = Math.max(0, choice.focusCost - next.focus);
  next.focus = Math.max(0, next.focus - choice.focusCost);
  next.nextFocusBonus -= focusShortfall;
  next.cash -= choice.cashCost;
  const effect = choice.effect;
  next.cash += effect.cash ?? 0;
  next.reputation = clamp(next.reputation + (effect.reputation ?? 0), 0, 100);
  next.conviction = clamp(next.conviction + (effect.conviction ?? 0), 0, 100);
  next.techDebt = Math.max(0, next.techDebt + (effect.techDebt ?? 0));
  next.overclaim = Math.max(0, next.overclaim + (effect.overclaim ?? 0));
  next.pipeline = Math.max(0, next.pipeline + (effect.pipeline ?? 0));
  next.people.forEach((person) => { person.morale = clamp(person.morale + (effect.morale ?? 0), 0, 100); person.drift = clamp(person.drift + (effect.drift ?? 0), 0, 100); });
  if (effect.acceptEnding === "acquisition") next.acceptedAcquisition = true;
  next.pendingEvents = next.pendingEvents.filter((item) => item.id !== eventId);
  next.eventHistory.push(event);
  next.decisionLog.push({ id: `event-choice-${next.week}-${next.decisionLog.length}`, week: next.week, type: `event:${event.id}`, detail: `${event.headline} — ${choice.label}`, refId: event.causeRef, impact: choice.focusCost + choice.cashCost / 500 + Math.abs(effect.reputation ?? 0), alternate: event.choices.find((item) => item.id !== choice.id)?.label });
  return next;
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
