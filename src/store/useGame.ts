import { create } from "zustand";
import { persist } from "zustand/middleware";
import { queueAction as queueEngineAction } from "../engine/actions";
import { commitBelief as commitEngineBelief } from "../engine/beliefs";
import { resolveEvent as resolveEngineEvent } from "../engine/events";
import { newRun } from "../engine/init";
import { advanceWeek } from "../engine/week";
import type { ActionId, BeliefKey, GameState, PanelId } from "../engine/types";

interface GameStore {
  game: GameState | null;
  screen: "title" | "game" | "postmortem";
  panel: PanelId | null;
  reportOpen: boolean;
  helpOpen: boolean;
  muted: boolean;
  start: (seed: number) => void;
  continueRun: () => void;
  abandon: () => void;
  runAgain: () => void;
  openPanel: (panel: PanelId | null) => void;
  queueAction: (id: ActionId, target?: string) => void;
  commitBelief: (key: BeliefKey, value: string | number) => void;
  setFeature: (id: GameState["selectedFeature"]) => void;
  setPrice: (price: number) => void;
  markEvidenceRead: () => void;
  endWeek: () => void;
  closeReport: () => void;
  resolveEvent: (eventId: string, choiceId: string) => void;
  toggleHelp: () => void;
  toggleMuted: () => void;
}

export const useGame = create<GameStore>()(persist((set, get) => ({
  game: null, screen: "title", panel: null, reportOpen: false, helpOpen: false, muted: false,
  start: (seed) => set({ game: newRun(seed), screen: "game", panel: null, reportOpen: false }),
  continueRun: () => set((store) => ({ screen: store.game?.ending ? "postmortem" : "game" })),
  abandon: () => set({ screen: "title", panel: null, reportOpen: false }),
  runAgain: () => { const game = get().game; if (game) set({ game: newRun(game.seed), screen: "game", panel: null, reportOpen: false }); },
  openPanel: (panel) => set({ panel }),
  queueAction: (id, target) => set((store) => store.game ? { game: queueEngineAction(store.game, id, target) } : {}),
  commitBelief: (key, value) => set((store) => store.game ? { game: commitEngineBelief(store.game, key, value) } : {}),
  setFeature: (id) => set((store) => store.game ? { game: { ...store.game, selectedFeature: id } } : {}),
  setPrice: (price) => set((store) => store.game ? { game: { ...store.game, price, beliefs: { ...store.game.beliefs, price: { ...store.game.beliefs.price, value: price } } } } : {}),
  markEvidenceRead: () => set((store) => store.game ? { game: { ...store.game, evidence: store.game.evidence.map((card) => ({ ...card, read: true })) } } : {}),
  endWeek: () => set((store) => {
    if (!store.game) return {};
    const game = advanceWeek(store.game);
    return { game, reportOpen: game.weeklyReports.length > store.game.weeklyReports.length, screen: game.ending ? "postmortem" : "game", panel: game.pendingEvents.length ? "inbox" : store.panel };
  }),
  closeReport: () => set({ reportOpen: false }),
  resolveEvent: (eventId, choiceId) => set((store) => store.game ? { game: resolveEngineEvent(store.game, eventId, choiceId) } : {}),
  toggleHelp: () => set((store) => ({ helpOpen: !store.helpOpen })),
  toggleMuted: () => set((store) => ({ muted: !store.muted })),
}), {
  name: "venture-forge-v3",
  partialize: (store) => ({ game: store.game?.version === 3 ? store.game : null, muted: store.muted }),
}));
