# Venture Forge decisions

## Simulation

- Week 104 is now a year-one benchmark, not a stop. The career calendar derives `year` and `weekOfYear` from the same monotonically increasing week so old deterministic seeds remain reproducible.
- A company closes only after two consecutive negative weeks. Closure archives its full milestone history and starts the next company from a small room; founder reputation, cash reserve, network, and relationships survive.
- Emergency loans provide $20,000 and charge 18% of the outstanding balance every week. The deliberately punitive rate makes them a bridge to immediate growth, not free runway.
- Selling the office creates a workspace cap rather than cutting headcount. This keeps the visible setback in the room until a later office move system replaces the temporary cap.

- The cofounder is part of the company model in week 1, while the opening shot remains the apartment desk for that first week. The kitchen-table scene appears on week 2. This preserves both the specified cofounder sensitivity and the intended opening image.
- Event Focus costs may create next-week Focus debt when a consequence arrives after the player has already spent the week. This prevents an impossible-to-resolve event from soft-locking the run while keeping every choice costly.
- “Growing” at week 104 compares current MRR with MRR thirteen weeks earlier. A one-week comparison made the ending depend on invoice timing rather than company direction.
- Counterfactuals replay the twelve-week economic tail from the highest-impact logged decision. They are deterministic and deliberately bounded so a post-mortem remains instant in the browser.

## Balance tuning

- The 2,000-run suite currently produces a 22.35% overall win rate. Research-heavy play wins 50.60% of runs and greedy-revenue play wins 0%, a 50.60-point research advantage.
- Normal churn only damages reputation when it materially outruns acquisition. Penalizing every individual churn made successful aligned companies collapse at scale even while net retention was healthy.

## Interface

- The title screen accepts a shareable numeric seed and offers a deterministic daily seed. Saves are device-local by design, matching the static-site constraint.
- The six room objects are SVG elements with keyboard semantics and a parallel screen-reader action list. Visual panels originate near their diegetic object while remaining usable as full-height sheets on narrow screens.
