import type { PanelId } from "../engine/types";

const ITEMS: { id: PanelId; key: string; label: string }[] = [{id:"metrics",key:"1",label:"Laptop"},{id:"notebook",key:"2",label:"Notebook"},{id:"inbox",key:"3",label:"Phone"},{id:"roadmap",key:"4",label:"Whiteboard"},{id:"team",key:"5",label:"Door"},{id:"capital",key:"6",label:"Cabinet"}];
export function ActionBar({ onOpen }: { onOpen: (id: PanelId)=>void }) { return <nav className="action-bar" aria-label="Room objects">{ITEMS.map((item)=><button key={item.id} onClick={()=>onOpen(item.id)}><kbd>{item.key}</kbd><span>{item.label}</span></button>)}</nav>; }
