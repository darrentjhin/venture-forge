import type { GameState } from "./types";

export interface CoffeeResult {
  state: GameState;
  restored: boolean;
  message: string;
}

/** Coffee is a small, intentionally tempting in-person action. */
export function drinkCoffee(input: GameState): CoffeeResult {
  const state = structuredClone(input);
  if (state.founder.coffeeDay !== state.day) {
    state.founder.coffeeDay = state.day;
    state.founder.coffeeToday = 0;
    state.founder.jittery = false;
  }

  state.cash -= 4;
  state.founder.coffeeToday += 1;
  const restored = state.founder.coffeeToday <= 2;
  if (restored) {
    state.focus += 1;
    return { state, restored, message: `Coffee ${state.founder.coffeeToday}/2: +1 Focus · $4` };
  }

  state.founder.jittery = true;
  return { state, restored, message: "That was one cup too many. No Focus gained · $4" };
}
