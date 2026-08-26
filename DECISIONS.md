# Venture Forge decisions

## Simulation

- Equity money is derived only from closed round commitments. Bridge notes and revenue financing remain cash tools, but neither silently creates cap-table ownership.
- Investor research spends founder Focus immediately and resolves at the next weekly tick. Pitches can happen before research, preserving the deliberate information disadvantage.
- A pre-money option-pool top-up is solved algebraically before investor shares are issued, so it dilutes existing holders while the incoming investor still receives exactly `amount / post-money`.
- Accepting a term sheet records a commitment; money and shares move only when the player explicitly closes a lead-backed round.
- Delegated tasks cost no founder Focus. Each assignee divides weekly output across their active tasks, and any split applies a 15% switching loss. Three simultaneous tasks for three weeks begins visible burnout.
- Research completion writes a plain-language finding but does not improve Fit by itself. Completing customer-facing product, design, or support work acts on the oldest unused finding and moves one underlying market answer toward truth.
- Revenue earned by repeatable task work is tracked separately from account revenue so the weekly customer recalculation cannot erase it.

- Week 104 is now a year-one benchmark, not a stop. The career calendar derives `year` and `weekOfYear` from the same monotonically increasing week so old deterministic seeds remain reproducible.
- A company closes only after two consecutive negative weeks. Closure archives its full milestone history and starts the next company from a small room; founder reputation, cash reserve, network, and relationships survive.
- Emergency loans provide $20,000 and charge 18% of the outstanding balance every week. The deliberately punitive rate makes them a bridge to immediate growth, not free runway.
- Selling the office creates a workspace cap rather than cutting headcount. This keeps the visible setback in the room until a later office move system replaces the temporary cap.

- The cofounder is part of the company model in week 1, while the opening shot remains the apartment desk for that first week. The kitchen-table scene appears on week 2. This preserves both the specified cofounder sensitivity and the intended opening image.
- Event Focus costs may create next-week Focus debt when a consequence arrives after the player has already spent the week. This prevents an impossible-to-resolve event from soft-locking the run while keeping every choice costly.
- “Growing” at week 104 compares current MRR with MRR thirteen weeks earlier. A one-week comparison made the ending depend on invoice timing rather than company direction.
- Counterfactuals replay the twelve-week economic tail from the highest-impact logged decision. They are deterministic and deliberately bounded so a post-mortem remains instant in the browser.

## Balance tuning

- Bridge notes no longer pretend to be equity in `outsideCapital`, but a bridge-financed company does not qualify for the “built to last” benchmark. A queued bridge can execute only once per week, closing an old duplicate-action loophole while keeping the intended $50,000 lifeline.
- The 2,000-run suite currently produces a 22.35% overall win rate. Research-heavy play wins 50.60% of runs and greedy-revenue play wins 0%, a 50.60-point research advantage.
- Normal churn only damages reputation when it materially outruns acquisition. Penalizing every individual churn made successful aligned companies collapse at scale even while net retention was healthy.

## Interface

- The canvas zoom is the largest whole number that fits the room pane, never a fractional stretch. On panes smaller than the source room it stays at 1× and the room is clipped rather than blurred.
- Room shell and furniture rows are cached to offscreen canvases per room/week. The animation loop now redraws people, screens, coffee steam, and interaction highlights without repainting every static prop.
- The 32-colour pixel source palette stays constant across runway moods; mood changes only the warm/cool lighting overlay. This keeps late-night sprites saturated and legible.
- Home is the live office at golden hour. Music is explicitly opt-in and its audio graph is created only from the settings click, preserving browser autoplay rules.
- The title screen accepts a shareable numeric seed and offers a deterministic daily seed. Saves are device-local by design, matching the static-site constraint.
- The six room objects are painted into the pixel canvas with a parallel screen-reader action list. Clicking one now sends the founder to its nearest open floor tile before the panel appears; number keys remain the accessible shortcut.
- The founder is the only player-controlled room agent. Cosmetic coworker movement cannot overwrite the founder's destination.
- Coffee always costs $4. The first two cups in a founder day restore one Focus each; later cups deliberately produce only the jittery visual consequence.
