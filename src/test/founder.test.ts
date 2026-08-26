import { describe, expect, it } from "vitest";
import { drinkCoffee } from "../engine/founder";
import { newRun } from "../engine/init";

describe("founder day", () => {
  it("restores Focus for two coffees, then only makes the founder jittery", () => {
    const start = newRun(303);
    const first = drinkCoffee(start);
    const second = drinkCoffee(first.state);
    const third = drinkCoffee(second.state);
    expect(first.state.focus).toBe(start.focus + 1);
    expect(second.state.focus).toBe(start.focus + 2);
    expect(third.state.focus).toBe(second.state.focus);
    expect(third.state.cash).toBe(start.cash - 12);
    expect(third.state.founder.jittery).toBe(true);
  });

  it("starts a fresh coffee count on a new day", () => {
    let state = drinkCoffee(drinkCoffee(newRun(304)).state).state;
    state = { ...state, day: 2 };
    const nextDay = drinkCoffee(state).state;
    expect(nextDay.founder.coffeeDay).toBe(2);
    expect(nextDay.founder.coffeeToday).toBe(1);
    expect(nextDay.founder.jittery).toBe(false);
  });
});
