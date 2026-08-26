export type SfxName = "click" | "commit" | "cash_in" | "cash_out" | "alert" | "week_tick";
let context: AudioContext | null = null;
let master: GainNode | null = null;
let dreadOscillator: OscillatorNode | null = null;
let dreadGain: GainNode | null = null;

function audio(): { context: AudioContext; master: GainNode } | null {
  if (typeof window === "undefined") return null;
  context ??= new AudioContext();
  if (!master) { master = context.createGain(); master.gain.value = .35; master.connect(context.destination); }
  if (context.state === "suspended") void context.resume();
  return { context, master };
}

function tone(frequency: number, end: number, duration: number, type: OscillatorType) {
  const graph = audio(); if (!graph) return;
  const oscillator = graph.context.createOscillator(); const gain = graph.context.createGain();
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, graph.context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), graph.context.currentTime + duration);
  gain.gain.setValueAtTime(.12, graph.context.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, graph.context.currentTime + duration);
  oscillator.connect(gain); gain.connect(graph.master); oscillator.start(); oscillator.stop(graph.context.currentTime + duration);
}

export function playSfx(name: SfxName, muted: boolean) {
  if (muted) return;
  if (name === "click") tone(900, 720, .03, "square");
  if (name === "commit") { tone(440, 660, .12, "triangle"); setTimeout(() => tone(660, 660, .08, "triangle"), 55); }
  if (name === "cash_in") { tone(660, 990, .2, "sine"); setTimeout(() => tone(825, 990, .12, "sine"), 70); }
  if (name === "cash_out") tone(330, 220, .18, "sine");
  if (name === "alert") { tone(220, 220, .08, "square"); setTimeout(() => tone(220, 220, .08, "square"), 130); }
  if (name === "week_tick") tone(180, 80, .06, "sawtooth");
}

export function setDread(level: number, muted: boolean) {
  // Never open an AudioContext here: this runs on mount, before any user
  // gesture, and browsers block (and warn about) autoplay contexts.
  if (!context) return;
  const graph = audio(); if (!graph) return;
  if (!dreadOscillator || !dreadGain) { dreadOscillator = graph.context.createOscillator(); dreadGain = graph.context.createGain(); dreadOscillator.type = "sine"; dreadOscillator.frequency.value = 55; dreadGain.gain.value = 0; dreadOscillator.connect(dreadGain); dreadGain.connect(graph.master); dreadOscillator.start(); }
  dreadGain.gain.cancelScheduledValues(graph.context.currentTime); dreadGain.gain.linearRampToValueAtTime(muted ? 0 : Math.min(.04, level * .01), graph.context.currentTime + .5);
}
