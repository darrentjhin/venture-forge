import { describe, expect, it } from "vitest";
import { EVENT_DEFS } from "../data/eventDefs";
import { buildPostMortem } from "../engine/endings";
import { newRun } from "../engine/init";
import { selectRoomStage } from "../engine/selectors";

describe("content and acceptance contracts", () => {
  it("ships at least forty traceable consequence events with no free choice", () => {
    expect(EVENT_DEFS.length).toBeGreaterThanOrEqual(40);
    for (const event of EVENT_DEFS) {
      expect(event.causeType.length).toBeGreaterThan(0);
      expect(event.choices.length).toBeGreaterThanOrEqual(2);
      event.choices.forEach((choice) => expect(choice.focusCost + choice.cashCost).toBeGreaterThan(0));
    }
  });

  it("selects every room stage and the downsized override from actual headcount history", () => {
    const state = newRun(42);
    expect(selectRoomStage(state)).toBe("apartment");
    state.week = 2; state.workspace = "kitchen"; expect(selectRoomStage(state)).toBe("kitchen");
    const template = state.people[0];
    state.people = Array.from({ length: 4 }, (_, index) => ({ ...template, id: `p-${index}`, isCofounder: index === 0 })); state.workspace = "coworking"; expect(selectRoomStage(state)).toBe("coworking");
    state.people = Array.from({ length: 8 }, (_, index) => ({ ...template, id: `o-${index}`, isCofounder: index === 0 })); state.workspace = "office"; expect(selectRoomStage(state)).toBe("office");
    state.people = Array.from({ length: 15 }, (_, index) => ({ ...template, id: `f-${index}`, isCofounder: index === 0 })); state.workspace = "floor"; expect(selectRoomStage(state)).toBe("floor");
    state.people = Array.from({ length: 26 }, (_, index) => ({ ...template, id: `h-${index}`, isCofounder: index === 0 })); state.workspace = "hq"; expect(selectRoomStage(state)).toBe("hq");
    state.headcountHistory = [28, 27, 22, 18]; state.people = state.people.slice(0, 16); expect(selectRoomStage(state)).toBe("downsized");
  });

  it("names the first week when correct evidence outweighed the committed answer", () => {
    const state = newRun(87);
    state.evidence = [
      { id: "wrong", week: 2, source: "Interview", dimension: "buyer", suggests: state.beliefs.buyer.value, strength: 2, isMisleading: true, quote: "One opinion.", read: true },
      { id: "right-1", week: 4, source: "Interview", dimension: "buyer", suggests: state.truth.buyer, strength: 2, isMisleading: false, quote: "A pattern.", read: true },
      { id: "right-2", week: 7, source: "Win/loss", dimension: "buyer", suggests: state.truth.buyer, strength: 3, isMisleading: false, quote: "The pattern held.", read: true },
    ];
    state.week = 20;
    const postMortem = buildPostMortem(state, "searching");
    expect(postMortem.couldKnowWeek).toBe(7);
    expect(postMortem.couldKnowText).toContain("By week 7");
  });
});
