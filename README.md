# Venture Forge

Venture Forge is a 25–40 minute deterministic founder simulation. Every seed contains a hidden market truth. The player spends Focus to collect noisy evidence, commits beliefs about the buyer, price, wedge, churn cause, and channel, then builds a company around those bets for up to 104 weeks.

The game is a completely static Vite application. It has no backend, runtime network calls, binary art, or audio files. The office and every character are drawn with inline SVG; sound is synthesized with the Web Audio API; saves stay in localStorage.

## Run locally

Requires Node.js 20 or newer.

```bash
npm ci
npm run dev
```

The local URL includes the GitHub Pages base path: `http://localhost:5173/venture-forge/`.

## Validate

```bash
npm test
npm run build
npm run preview
```

The test suite includes deterministic replay, economy invariants, and 2,000 complete seeded simulations across random, greedy-revenue, and research-heavy policies.

## Tune the simulation

Starting constants live in `src/data/balance.ts`. Action costs and availability live in `src/data/actionDefs.ts`; consequence copy and triggers live in `src/data/eventDefs.ts`. The required week-tick order is isolated in `src/engine/week.ts`.

Balance decisions and the latest mass-simulation result are recorded in `DECISIONS.md`.
