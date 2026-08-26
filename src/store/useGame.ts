import { create } from "zustand";
import { persist } from "zustand/middleware";
import { queueAction as queueEngineAction } from "../engine/actions";
import { commitBelief as commitEngineBelief } from "../engine/beliefs";
import { resolveEvent as resolveEngineEvent } from "../engine/events";
import { newRun } from "../engine/init";
import { advanceWeek } from "../engine/week";
import { resolveCrisis as resolveEngineCrisis } from "../engine/crisis";
import type { ActionId, BeliefKey, CrisisChoiceId, GameState, PanelId } from "../engine/types";
import { migrateGameState } from "./migrate";
import { assignTask as assignEngineTask, unassignTask as unassignEngineTask } from "../engine/tasks";

interface GameStore {
  game: GameState | null;
  screen: "title" | "game";
  panel: PanelId | null;
  reportOpen: boolean;
  helpOpen: boolean;
  muted: boolean;
  start: (seed: number) => void;
  continueRun: () => void;
  abandon: () => void;
  openPanel: (panel: PanelId | null) => void;
  queueAction: (id: ActionId, target?: string) => void;
  commitBelief: (key: BeliefKey, value: string | number) => void;
  setFeature: (id: GameState["selectedFeature"]) => void;
  setPrice: (price: number) => void;
  markEvidenceRead: () => void;
  endWeek: () => void;
  closeReport: () => void;
  resolveEvent: (eventId: string, choiceId: string) => void;
  resolveCrisis: (choice: CrisisChoiceId, personId?: string) => void;
  dismissCard: () => void;
  assignTask: (taskId: string, personId: string) => void;
  unassignTask: (taskId: string, personId: string) => void;
  toggleHelp: () => void;
  toggleMuted: () => void;
}

export const useGame = create<GameStore>()(persist((set) => ({
  game: null, screen: "title", panel: null, reportOpen: false, helpOpen: false, muted: false,
  start: (seed) => set({ game: newRun(seed), screen: "game", panel: null, reportOpen: false }),
  continueRun: () => set({ screen: "game" }),
  abandon: () => set({ screen: "title", panel: null, reportOpen: false }),
  openPanel: (panel) => set({ panel }),
  queueAction: (id, target) => set((store) => store.game ? { game: queueEngineAction(store.game, id, target) } : {}),
  commitBelief: (key, value) => set((store) => store.game ? { game: commitEngineBelief(store.game, key, value) } : {}),
  setFeature: (id) => set((store) => store.game ? { game: { ...store.game, selectedFeature: id } } : {}),
  setPrice: (price) => set((store) => store.game ? { game: { ...store.game, price, beliefs: { ...store.game.beliefs, price: { ...store.game.beliefs.price, value: price } } } } : {}),
  markEvidenceRead: () => set((store) => store.game ? { game: { ...store.game, evidence: store.game.evidence.map((card) => ({ ...card, read: true })) } } : {}),
  endWeek: () => set((store) => {
    if (!store.game) return {};
    const game = advanceWeek(store.game);
    // Closing the panel keeps the week report from opening behind a sheet.
    return { game, reportOpen: game.weeklyReports.length > store.game.weeklyReports.length, screen: "game", panel: null };
  }),
  closeReport: () => set({ reportOpen: false }),
  resolveEvent: (eventId, choiceId) => set((store) => store.game ? { game: resolveEngineEvent(store.game, eventId, choiceId) } : {}),
  resolveCrisis: (choice, personId) => set((store) => store.game ? { game: resolveEngineCrisis(store.game, choice, personId) } : {}),
  dismissCard: () => set((store) => store.game ? { game: { ...store.game, cards: store.game.cards.slice(1) } } : {}),
  assignTask: (taskId, personId) => set((store) => store.game ? { game: assignEngineTask(store.game, taskId, personId) } : {}),
  unassignTask: (taskId, personId) => set((store) => store.game ? { game: unassignEngineTask(store.game, taskId, personId) } : {}),
  toggleHelp: () => set((store) => ({ helpOpen: !store.helpOpen })),
  toggleMuted: () => set((store) => ({ muted: !store.muted })),
}), {
  name: "venture-forge-v3",
  version: 5,
  migrate: (persisted) => {
    const old = persisted && typeof persisted === "object" ? persisted as { game?: unknown; muted?: boolean } : {};
    return { ...old, game: migrateGameState(old.game) };
  },
  partialize: (store) => ({ game: store.game?.version === 5 ? store.game : null, muted: store.muted }),
}));
