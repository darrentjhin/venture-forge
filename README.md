# Venture Forge

Venture Forge is a persistent founder and startup simulation. The Phase 1 vertical slice follows the complete first-company loop: start with $2,000, hustle and research an idea, form Northstar Systems, build and launch a SaaS MVP, win customers, hire a team, move offices, manage burn, and survive company events.

## Playable systems

- Founder onboarding with four meaningful backgrounds
- Personal and company money kept in separate ledgers
- Hustles, customer research, formation costs, and founder contribution
- Product progress, quality, pricing, pipeline, marketing, conversion, and churn
- Employee candidates, weekly payroll, morale, capacity, and office progression
- Deterministic weekly processing and persistent company history
- Apartment, coworking, and studio scenes with autonomous clickable people
- Event decisions, cash distress, bankruptcy, and founder continuity
- Instant local recovery plus D1-backed hosted save snapshots

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm test
npx tsc --noEmit
npm run build
```

The Phase 1 balance lives in `lib/game/config.ts`, while the authoritative week calculations are isolated in `lib/game/engine.ts`. Database models and the generated migration are under `db/` and `drizzle/`.
