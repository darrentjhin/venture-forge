# Venture Forge

Venture Forge is a persistent founder and startup simulation. The first-company campaign follows one focused SaaS journey: start with $2,000, find an idea, form a company on your terms, build a deliberate roadmap, launch, sell, hire, manage burn, and survive the consequences of your decisions.

## Playable systems

- Founder onboarding with four meaningful backgrounds
- A 100-point weekly founder capacity economy across work, research, product, sales, and consulting
- Custom company name, legal structure, founder contribution, and a pre-formation risk summary
- A seven-feature roadmap with dependencies, domain-specific work, quality, and launch readiness
- Real prospects, sales stages, customer accounts, renewals, segment fit, and churn reasons
- Role-specific employee skills, payroll, workload, morale, and office progression
- One authoritative finance model for MRR, ARR, costs, profit, burn, runway, and gross margin
- Contextual decisions, milestone moments, unresolved threads, and a rich end-of-week report
- Apartment, coworking, and studio scenes that reflect current company activity
- Automatic local saving with versioned migration for existing careers

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

The Phase 1 balance lives in `lib/game/config.ts`, while the authoritative week calculations are isolated in `lib/game/engine.ts`. Database models and the generated migration are under `db/` and `drizzle/` for a future hosted-save adapter.
