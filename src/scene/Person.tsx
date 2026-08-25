import { motion } from "framer-motion";
import type { Person as PersonData } from "../engine/types";

const SKINS = ["#f2c8a0", "#dca77f", "#bf805e", "#996246", "#764631", "#5c3428", "#e7b98d", "#c98e68"];
const SHIRTS = ["#315b70", "#70475f", "#2f7a5e", "#8a633c", "#4a5259", "#64609b"];
const HAIR = ["#33251f", "#151311", "#6b452e", "#a06a37", "#d2b07b", "#4e4038", "#852f28", "#20262c"];

export function Person({ person, x, y, onHover, onLeave }: { person: PersonData; x: number; y: number; onHover: () => void; onLeave: () => void }) {
  const struggling = person.morale < 35;
  const delay = (person.appearance.hair + person.appearance.head) * .11;
  const motionName = struggling ? "struggling" : person.motion;
  return <motion.g
    className={`person person-${motionName}`}
    initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay }}
    transform={`translate(${x} ${y})`} onMouseEnter={onHover} onMouseLeave={onLeave} role="button" tabIndex={0} aria-label={`${person.name}, ${person.role}`}
  >
    <ellipse cx="0" cy="14" rx="35" ry="8" fill="#22201d" opacity=".12" />
    <g className="person-body" style={{ animationDelay: `${delay}s` }}>
      <path d="M-15 -58 Q0 -72 15 -58 L19 -18 L-19 -18 Z" fill={SHIRTS[person.appearance.shirt]} opacity={struggling ? .55 : 1} />
      <rect x="-12" y="-22" width="9" height="38" rx="4" fill="#4a5259" /><rect x="4" y="-22" width="9" height="38" rx="4" fill="#4a5259" />
      <g className="person-head"><rect x="-5" y="-72" width="10" height="13" fill={SKINS[person.appearance.skin]} /><ellipse cx="0" cy="-88" rx={person.appearance.head === 0 ? 18 : person.appearance.head === 1 ? 16 : 19} ry={person.appearance.head === 2 ? 20 : 18} fill={SKINS[person.appearance.skin]} />
        <path d={person.appearance.hair % 3 === 0 ? "M-17 -92 Q0 -116 18 -93 L15 -102 Q0 -117 -15 -103Z" : person.appearance.hair % 3 === 1 ? "M-16 -96 Q0 -110 17 -96 L12 -108 L-13 -106Z" : "M-18 -94 Q-2 -114 17 -100 L17 -90 Q0 -102 -18 -88Z"} fill={HAIR[person.appearance.hair]} />
        {person.appearance.glasses && <g fill="none" stroke="#22201d" strokeWidth="2"><circle cx="-7" cy="-88" r="5"/><circle cx="7" cy="-88" r="5"/><path d="M-2 -88h4"/></g>}
        <circle className="person-eye" cx="-6" cy="-87" r="1.4" fill="#22201d"/><circle className="person-eye" cx="6" cy="-87" r="1.4" fill="#22201d" />
      </g>
      <g className="person-arms"><path d="M-14 -50 Q-30 -30 -12 -18" fill="none" stroke={SKINS[person.appearance.skin]} strokeWidth="8" strokeLinecap="round"/><path d="M14 -50 Q30 -30 12 -18" fill="none" stroke={SKINS[person.appearance.skin]} strokeWidth="8" strokeLinecap="round"/></g>
    </g>
  </motion.g>;
}
