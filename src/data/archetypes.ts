export const ARCHETYPES = {
  operator: { label: "Operator", driftSensitivity: .8, quirk: "Keeps a private list of promises the company has made." },
  skeptic: { label: "Skeptic", driftSensitivity: 1.15, quirk: "Asks what would have to be true before agreeing." },
  craftsperson: { label: "Craftsperson", driftSensitivity: .9, quirk: "Renames variables after everyone else has gone home." },
  evangelist: { label: "Evangelist", driftSensitivity: 1, quirk: "Can make a customer feel like the only person in the room." },
  cofounder: { label: "Cofounder", driftSensitivity: 1.4, quirk: "Remembers the version of the company you described on day one." },
} as const;
export type ArchetypeId = keyof typeof ARCHETYPES;
