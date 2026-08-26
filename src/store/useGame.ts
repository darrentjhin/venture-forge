import { create } from "zustand";
import { persist } from "zustand/middleware";
import { queueAction as queueEngineAction } from "../engine/actions";
import { commitBelief as commitEngineBelief } from "../engine/beliefs";
import { resolveEvent as resolveEngineEvent } from "../engine/events";
import { newRun } from "../engine/init";
import { advanceWeek } from "../engine/week";
import { resolveCrisis as resolveEngineCrisis } from "../engine/crisis";
import type { ActionId, BeliefKey, CrisisChoiceId, GameState, InvestorKind, PanelId, Workspace } from "../engine/types";
import type { FeatureId } from "../data/features";
import { migrateGameState } from "./migrate";
import { assignTask as assignEngineTask, unassignTask as unassignEngineTask } from "../engine/tasks";
import { drinkCoffee as drinkEngineCoffee } from "../engine/founder";
import { acceptTermSheet as acceptEngineTermSheet, closeRound as closeEngineRound, counterTermSheet as counterEngineTermSheet, discoverInvestors as discoverEngineInvestors, openRound as openEngineRound, pitchInvestor as pitchEngineInvestor, researchInvestor as researchEngineInvestor, walkFromTermSheet as walkEngineTermSheet, type CounterAxis } from "../engine/fundraising";
import { appointCeoAndStartCompany as appointEngineCeo, selectProductFeature as selectEngineProductFeature, shipProductFeature as shipEngineProductFeature, startOfficeMove as startEngineOfficeMove, startProductLine as startEngineProductLine } from "../engine/growth";

interface GameStore {
  game: GameState | null;
  screen: "title" | "game";
  panel: PanelId | null;
  reportOpen: boolean;
  helpOpen: boolean;
  muted: boolean;
  musicEnabled: boolean;
  visitedCompanyId: string | null;
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
  drinkCoffee: () => string | null;
  openRound: (stage: InvestorKind, targetAmount: number, askPreMoney: number) => void;
  discoverInvestors: (method: "cold" | "network") => void;
  researchInvestor: (investorId: string) => void;
  pitchInvestor: (investorId: string) => void;
  counterTermSheet: (investorId: string, axis: CounterAxis) => void;
  acceptTermSheet: (investorId: string) => void;
  walkFromTermSheet: (investorId: string) => void;
  closeRound: () => void;
  startOfficeMove: (target: Workspace) => void;
  startProductLine: () => void;
  selectProductFeature: (lineId: string, feature: FeatureId) => void;
  shipProductFeature: (lineId: string) => void;
  appointCeo: (personId: string | null) => void;
  visitCompany: (companyId: string | null) => void;
  toggleHelp: () => void;
  toggleMuted: () => void;
  toggleMusic: () => void;
}

export const useGame = create<GameStore>()(persist((set) => ({
  game: null, screen: "title", panel: null, reportOpen: false, helpOpen: false, muted: false, musicEnabled: false, visitedCompanyId: null,
  start: (seed) => set({ game: newRun(seed), screen: "game", panel: null, reportOpen: false, visitedCompanyId: null }),
  continueRun: () => set({ screen: "game" }),
  abandon: () => set({ screen: "title", panel: null, reportOpen: false, visitedCompanyId: null }),
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
  drinkCoffee: () => {
    let message: string | null = null;
    set((store) => {
      if (!store.game) return {};
      const result = drinkEngineCoffee(store.game);
      message = result.message;
      return { game: result.state };
    });
    return message;
  },
  openRound: (stage, targetAmount, askPreMoney) => set((store) => store.game ? { game: openEngineRound(store.game, stage, targetAmount, askPreMoney) } : {}),
  discoverInvestors: (method) => set((store) => store.game ? { game: discoverEngineInvestors(store.game, method) } : {}),
  researchInvestor: (investorId) => set((store) => store.game ? { game: researchEngineInvestor(store.game, investorId) } : {}),
  pitchInvestor: (investorId) => set((store) => store.game ? { game: pitchEngineInvestor(store.game, investorId) } : {}),
  counterTermSheet: (investorId, axis) => set((store) => store.game ? { game: counterEngineTermSheet(store.game, investorId, axis) } : {}),
  acceptTermSheet: (investorId) => set((store) => store.game ? { game: acceptEngineTermSheet(store.game, investorId) } : {}),
  walkFromTermSheet: (investorId) => set((store) => store.game ? { game: walkEngineTermSheet(store.game, investorId) } : {}),
  closeRound: () => set((store) => store.game ? { game: closeEngineRound(store.game) } : {}),
  startOfficeMove: (target) => set((store) => store.game ? { game: startEngineOfficeMove(store.game, target) } : {}),
  startProductLine: () => set((store) => store.game ? { game: startEngineProductLine(store.game) } : {}),
  selectProductFeature: (lineId, feature) => set((store) => store.game ? { game: selectEngineProductFeature(store.game, lineId, feature) } : {}),
  shipProductFeature: (lineId) => set((store) => store.game ? { game: shipEngineProductFeature(store.game, lineId) } : {}),
  appointCeo: (personId) => set((store) => store.game ? { game: appointEngineCeo(store.game, personId), panel: null, visitedCompanyId: null } : {}),
  visitCompany: (companyId) => set({ visitedCompanyId: companyId, panel: null }),
  toggleHelp: () => set((store) => ({ helpOpen: !store.helpOpen })),
  toggleMuted: () => set((store) => ({ muted: !store.muted })),
  toggleMusic: () => set((store) => ({ musicEnabled: !store.musicEnabled })),
}), {
  name: "venture-forge-v3",
  version: 8,
  migrate: (persisted) => {
    const old = persisted && typeof persisted === "object" ? persisted as { game?: unknown; muted?: boolean; musicEnabled?: boolean } : {};
    return { ...old, game: migrateGameState(old.game) };
  },
  partialize: (store) => ({ game: store.game?.version === 8 ? store.game : null, muted: store.muted, musicEnabled: store.musicEnabled }),
}));
