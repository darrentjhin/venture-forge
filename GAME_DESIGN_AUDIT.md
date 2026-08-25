# Venture Forge Core Gameplay Audit

## P0 — Breaks gameplay or creates false decisions

### Early formation economics

The tutorial permits formation at roughly $1,800, then preserves $650 and charges $400. A compliant player can therefore open with only $750 and immediately pay weekly operating costs. This makes the advertised aggressive path functionally unwinnable before the product can launch.

**Fix:** formation becomes a player-authored decision with company name, structure, and capital contribution. The confirmation shows exact post-formation balances, runway, MVP timing, and risk. Viable aggressive, balanced, and conservative capitalizations are all supported. Post-formation consulting offers a costly recovery lever.

### Founder-energy economy

Actions can be repeated before ending the week, so time is not scarce and the strongest play is clicking every available action.

**Fix:** every week starts with 100 founder capacity. Research, consulting, product work, selling, recruiting, and planning consume meaningful chunks. Capacity resets only at week end.

### Runway and financial truth

Runway, UI burn, and week processing duplicate related formulas. Small differences can cause the UI to promise a runway that the simulation does not honor.

**Fix:** one `calculateFinancials` function owns recurring revenue, payroll, rent, support costs, background efficiency, net burn, MRR, ARR, gross margin, and runway. Every screen and week settlement uses it.

### Pricing mechanics

The interface claims conversion tradeoffs, but price barely affects demand and does not change expectations or retention.

**Fix:** pricing has an explicit fit curve. $99 improves small-business conversion but creates support-heavy, low-value accounts; $149 is balanced; $219 attracts larger accounts only when product quality and required features support their expectations.

### Customer and sales abstraction

Aggregate customer and pipeline counters prevent meaningful accounts, explainable wins/losses, renewals, or feature-driven deal outcomes.

**Fix:** customers and sales opportunities become persistent entities with names, segments, needs, stages, probabilities, relationships, health, satisfaction, value, and decision/renewal weeks.

## P1 — Materially reduces fun or depth

### Product development

A single percentage bar makes all product decisions interchangeable and launch timing obvious.

**Fix:** a seven-part roadmap separates required foundations from optional billing, analytics, mobile, and security work. Players assign weekly founder effort and can launch when the three required components are complete; missing optional work creates real acquisition, activation, churn, and security consequences.

### Employee-role effects

One generic skill lets every hire accelerate every system.

**Fix:** employees gain domain skill profiles. Engineering affects feature delivery and reliability, design affects activation, sales affects opportunity movement, customer success affects renewals, and operations affects cost/control.

### Founder specialization

Backgrounds are mostly flat multipliers.

**Fix:** Engineering founders can perform a high-output founder build sprint; Sales founders create warmer opportunities; Design founders add activation and satisfaction; Business founders receive forecast accuracy and operating-efficiency benefits.

### Event repetition

Three fixed events every fourth week repeat quickly and feel disconnected from company state.

**Fix:** a contextual event catalog spans customer, employee, product, finance, competitor, founder, operations, security, and market categories. Eligibility, cooldowns, prior choices, product gaps, runway, customers, and workload determine what can fire.

### Weekly pacing

The week summary is mostly accounting and creates no anticipation.

**Fix:** week close explains what happened, why it happened, what changed, and 2–4 unresolved threads such as feature completion, deal decisions, renewals, workload, and runway thresholds.

### Milestone feedback

Several essential first-company moments are not tracked consistently.

**Fix:** saved-cash, validation, formation, MVP, launch, first lead/customer, MRR, employee, office, profitability, and customer-count milestones produce permanent history entries and restrained milestone cards.

### Failure messaging

Bankruptcy arrives after an opaque counter without enough escalating warnings.

**Fix:** runway moves through Healthy, Watch, Danger, and Critical states. State changes create warnings and options. Insolvency remains possible, but is visibly approaching.

### Office usefulness

The office communicates headcount and morale but not the work causing outcomes.

**Fix:** simulation-facing people receive activity, location, destination, workload, and department state. The room can show selling, building, interviewing, customer visits, late work, and overload without owning simulation outcomes.

## P2 — Polish

- Expand milestone presentation and office reactions.
- Add more visual variation for prospect/customer visits.
- Improve feature dependency visualization.
- Add richer event follow-up copy and sound when the audio direction is defined.
- Add hosted account recovery once the public deployment has an identity provider.

## Final design test

The overhaul is considered successful when the first two minutes force a time/cash decision, early formation is risky but recoverable, price changes customer mix and margins, role-specific hiring solves different bottlenecks, week endings expose clear causal explanations, and at least two competent strategies remain viable through Week 30.
