export interface RngResult<T> { value: T; state: number; }

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

export function nextRandom(state: number): RngResult<number> {
  let t = (state + 0x6d2b79f5) >>> 0;
  let z = t;
  z = Math.imul(z ^ (z >>> 15), z | 1);
  z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
  return { value: ((z ^ (z >>> 14)) >>> 0) / 4294967296, state: t };
}

export function randomInt(state: number, min: number, max: number): RngResult<number> {
  const next = nextRandom(state);
  return { value: Math.floor(next.value * (max - min + 1)) + min, state: next.state };
}

export function choose<T>(state: number, items: readonly T[]): RngResult<T> {
  const next = randomInt(state, 0, items.length - 1);
  return { value: items[next.value], state: next.state };
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => { const next = nextRandom(state); state = next.state; return next.value; };
}
