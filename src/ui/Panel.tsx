import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import type { PanelId } from "../engine/types";

const TITLES: Record<PanelId, { object: string; title: string }> = {
  metrics: { object: "LAPTOP", title: "Company metrics" }, notebook: { object: "NOTEBOOK", title: "Beliefs and evidence" }, inbox: { object: "PHONE", title: "Consequences and decisions" }, roadmap: { object: "WHITEBOARD", title: "Product and pricing" }, team: { object: "DOOR", title: "People and drift" }, capital: { object: "FILING CABINET", title: "Capital and burn" },
};

export function Panel({ id, children, onClose }: { id: PanelId | null; children: ReactNode; onClose: () => void }) {
  return <AnimatePresence>{id && <motion.div className="panel-dimmer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.section className={`game-panel panel-${id}`} initial={{ opacity: 0, y: 70, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50 }} transition={{ duration: .26, ease: [0.2, 0.8, 0.2, 1] }} role="dialog" aria-modal="true" aria-label={TITLES[id].title}><header><div><span className="eyebrow">{TITLES[id].object}</span><h2>{TITLES[id].title}</h2></div><button className="panel-close" onClick={onClose} aria-label="Close panel">×</button></header><div className="panel-scroll">{children}</div></motion.section></motion.div>}</AnimatePresence>;
}
