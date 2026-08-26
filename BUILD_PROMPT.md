# BUILD PROMPT — Desk & Company

You are continuing an existing game. Read this whole document before writing code.
Work in the order given. Every update ends with something playable.

---

## 0. Read this first

The repository currently contains a game called Venture Forge: a deterministic
104-week founder simulation. The simulation engine is good and is **not** the
problem. The layer the player touches is the problem.

Three things make it feel like homework rather than a game:

1. Every verb is abstract. "Commit a hypothesis about your churn cause" is not
   something a person wants to do.
2. Nothing on screen tells a new player what to do next.
3. It stops at week 104 and gives you a letter grade.

Your job is to keep the simulation and replace the layer on top of it, so that
the game is **concrete, tactile and endless**.

**Keep**: `src/engine/*`, `src/data/*`, the balance tuning, and all existing
tests. The 2,000-run balance simulation must keep passing after every update.

**Replace**: the belief-commitment UI, the ending system, and the abstract
vocabulary anywhere a player can see it.

---

## 1. What exists today

- **Stack**: Vite + React 18 + TypeScript (strict) + Zustand. Static site, no
  backend, deployed to GitHub Pages at `/venture-forge/`.
- **Engine** (`src/engine/`): `week.ts` runs a deterministic weekly tick;
  `economy.ts` holds conversion, churn, burn and valuation; `beliefs.ts` holds
  the hidden-truth model; `endings.ts` grades the run; `people.ts` generates
  employees; `rng.ts` is a seeded PRNG — **all randomness must go through it**.
- **Scene** (`src/scene/`): a top-down pixel office rendered to canvas.
  `room/geometry.ts` (32px tiles), `room/sprites.ts` (all drawing),
  `room/plans.ts` (per-stage layouts), `room/agents.ts` (BFS pathing +
  behaviour), `OfficeView.tsx` (canvas, rAF loop, hit-testing).
- **UI** (`src/ui/`): Title, Hud, a six-panel sheet, week report, post-mortem.
- **Tests** (`src/test/`): determinism, economy invariants, content contracts,
  room/agent behaviour, and a 2,000-run balance simulation.

---

## 2. What we are building

**Desk & Company.** You are a founder at a desk. The company is the room around
you, and it grows. There is no ending.

Three pillars, in priority order when they conflict:

1. **The desk is the interface.** No abstract menus. Every screen is an object
   in the room — the monitor, the phone, the notebook, the whiteboard, the
   coffee machine, the filing cabinet. If a feature needs UI, it needs a thing.
2. **The office is the progress bar.** A player must be able to tell how the
   company is doing with every number hidden.
3. **It never ends.** Failure costs people, space and momentum. Then you keep
   going. The founder outlives every company they start.

---

## 3. Ground rules (non-negotiable)

- **No jargon in player-facing text.** Banned on screen: wedge, conviction,
  overclaim, evidence score, hypothesis, churn driver, alignment. The
  underlying variables may keep those names in code.
- **Determinism.** Same seed, same run. Never call `Math.random()` in engine
  code — thread `rngState` through `src/engine/rng.ts`. UI-only cosmetics
  (which idle animation plays) may use `Math.random`.
- **Strict TypeScript.** No `any`, no non-null assertions on engine data.
- **Every visible feature works.** No buttons that do nothing. If a system is
  not built, do not show its entry point.
- **Tests before you call it done.** `npm test` must pass, including the
  balance simulation. Add tests for every new system.
- **Saves must survive.** Bump `GameState.version` and write a migration in the
  Zustand `persist` config whenever the shape changes. Never silently wipe a
  player's company.

---

## 4. UPDATE 1 — Remove the ending

**Goal**: the game can be played indefinitely.

### 4.1 Calendar

- Delete `BALANCE.totalWeeks` as a hard stop. Keep it only as the length of
  "year one" for pacing copy.
- Track `year` and `weekOfYear` derived from `week`. Display as `Y2 W14`.
- Every 13 weeks closes a **quarter**: a report card and one office beat
  (a new plant, a repainted wall, a delivery arriving).

### 4.2 Failure becomes a setback

Replace `evaluateEnding()` with `evaluateCrisis()`. When cash goes negative:

- Do **not** end the run. Enter `crisis` state.
- Force a choice, presented as a message from the cofounder:
  - **Lay people off** — pick who; morale drops hard; payroll falls.
  - **Emergency loan** — cash now, 18% weekly interest, reputation −8.
  - **Sell the office** — drop one workspace tier, refund the deposit.
- If cash is still negative after two consecutive weeks in crisis, the company
  **closes**. This is not game over:
  - Write the whole company to `founder.history` with its final numbers.
  - Keep founder cash, reputation (−20), network, and every relationship.
  - Return the player to a small room to start company two.

### 4.3 Milestones replace endings

Create `src/engine/milestones.ts` with a table of at least **24** milestones,
each `{ id, test(state), title, body, icon }`. Fire at most one per week.

Examples: first paying customer, first hire, first $1k month, first $10k month,
first office, ten customers, first profitable week, first year survived, first
investor, first employee to celebrate a work anniversary.

Each fires a **card** (see 5.4) and writes a permanent line into company
history that the player can scroll back through years later.

### 4.4 Ship criteria

- Play past week 104 with no ending screen.
- Bankrupt a company and still be playing sixty seconds later.
- Company history shows every milestone with its week.

---

## 5. UPDATE 2 — Tasks and the phone

**Goal**: replace "commit a hypothesis" with "assign work to a person".
This is the single most important update. Do it carefully.

### 5.1 The task model

```ts
export type Skill = "engineering" | "design" | "sales" | "support" | "ops" | "research";

export interface Task {
  id: string;
  title: string;              // plain language: "Fix the export bug"
  detail: string;             // one sentence of why it matters
  skill: Skill;
  effort: number;             // skill-points required to finish
  progress: number;           // 0..effort
  assigned: string[];         // person ids, max 3
  source: "backlog" | "event" | "customer" | "investor" | "milestone";
  reward: TaskReward;
  expiresWeek: number | null; // some work goes stale
  createdWeek: number;
}

export interface TaskReward {
  cash?: number;
  mrr?: number;
  reputation?: number;
  fit?: number;               // moves the Fit meter (see 5.3)
  techDebt?: number;
  shipsFeature?: FeatureId;
  unlocksTask?: string;
}
```

### 5.2 How work gets done

- Each person contributes `skillValue(person, task.skill) * moraleFactor *
  focusFactor` points per week to each task they are on.
- A person on more than one task splits their output and loses 15% to
  context-switching. Show this in the UI when it happens.
- Overwork: a person on three tasks for three consecutive weeks gains
  `burnout`. Burned-out people slump at their desk, take more coffee trips,
  and eventually resign. Make this visible in the room before it is fatal.
- Tasks complete during the weekly tick, in `task.createdWeek` order, so the
  same seed always resolves the same way.

### 5.3 The Fit meter replaces the vocabulary test

Keep `MarketTruth` and `alignmentFor()` exactly as they are. Change only how
the player interacts with them:

- Show a single plainly-named **Fit** meter, 0–100, on the monitor.
- Research tasks ("Interview five customers", "Read the support tickets",
  "Sit in on a sales call") raise the player's *knowledge*, which surfaces as
  **plain-language findings** in the notebook: _"Three of five customers
  mentioned the same missing integration."_
- Acting on a finding — shipping the feature, changing the price, switching
  channel — is what actually moves alignment. The player never types the word
  "hypothesis".
- Churn messages name a reason in the customer's own words. That is how the
  player learns they were wrong.

### 5.4 The phone

Build `src/ui/phone/` as a diegetic phone. Grid of apps, each with an optional
badge count. Apps unlock from milestones and **do not render before they are
unlocked**.

| App | Ships in | Contents |
| --- | --- | --- |
| Tasks | Update 2 | Open work, drag-to-assign, progress bars |
| Inbox | Update 2 | Every event as a message from a named person |
| Team | Update 2 | Roster, skills, morale, burnout, hiring |
| Bank | Update 2 | Cash, payroll, expenses, loans |
| Stats | Update 2 | Charts, for players who want them |
| Raise | Update 4 | Investor pipeline, pitches, term sheets, cap table |
| Market | Update 6 | Competitors, industry news |
| Deals | Update 6 | M&A |

**Cards**: a small stack of dismissible cards over the room for milestones,
completions and crises. One at a time, never blocking the office.

### 5.5 Retire the old UI

Delete the belief-commitment chips. Move price setting to the monitor. The
notebook becomes the findings journal. Nothing in the room mentions
buyer/wedge/channel/churn-cause by those names.

### 5.6 Ship criteria

- A new player assigns their first task within thirty seconds, no tutorial.
- No banned word appears anywhere on screen.
- Every event arrives as a message from a person with a name.

---

## 6. UPDATE 3 — Your founder and your desk

**Goal**: the player is a character in the room, not a cursor.

- Add the founder as a real agent with their own desk, drawn like everyone else
  but with a distinct outfit and a **YOU** tag.
- Clicking anywhere on the floor walks the founder there. Clicking an object
  walks them to it, then opens it. Walking takes real time — that is the point.
- **Focus** becomes the founder's day: 5 actions, spent by doing things in
  person (running a 1:1, taking a sales call, interviewing a candidate).
  Assigning tasks to other people costs nothing — delegation is free, doing it
  yourself is not.
- **Coffee** restores 1 Focus, costs $4, and can be used twice a day. The third
  cup does nothing and the founder sprite gets jittery.
- The founder's desk holds the six objects. Sitting down is what opens the game.

---

## 7. UPDATE 4 — Fundraising: VCs, rejection and dilution

**Goal**: raising money is a social process with rejection, asymmetric
information and permanent consequences. Not a button that adds cash.

This is the largest new system. Build it in the order below.

### 7.1 What exists now, and what happens to it

The engine currently has `angel`, `seedFund`, `bridge` and `revenueFinance`
actions that add cash if `conviction` clears a threshold. **Delete `angel` and
`seedFund`.** Keep `bridge` and `revenueFinance` as the desperate options.
`outsideCapital` becomes derived from the cap table rather than a running total.

### 7.2 Data model

```ts
export type InvestorKind = "angel" | "preseed" | "seed" | "seriesA" | "growth";

export type PassReason =
  | "tooEarly"            // "come back at $X monthly"
  | "notOurThesis"        // wrong industry or customer
  | "churnConcern"        // your retention scared them
  | "marketTooSmall"
  | "teamGap"             // "who is your head of sales?"
  | "valuationTooHigh"
  | "needLead"            // "we'd follow, we won't lead"
  | "numbersDidNotMatch"  // diligence caught the story running ahead
  | "timing";             // fund is between vehicles

export interface Investor {
  id: string;
  name: string;              // "Dana Reyes"
  firm: string;              // "Ridgeline Capital"
  kind: InvestorKind;
  checkMin: number;
  checkMax: number;
  leadsRounds: boolean;      // some funds only ever follow
  temperament: "fast" | "thorough" | "tyreKicker" | "cutthroat";
  demandsBoardSeat: boolean;
  /** Hidden until researched or revealed by a pass. */
  thesisSegments: SegmentId[];
  minMonthlyRevenue: number;
  maxTechDebt: number;
  /** Fictional portfolio, shown to the player as a thesis hint. */
  portfolio: string[];
  discovered: boolean;
  researched: boolean;
  relationship: number;      // 0..100
  lastContactWeek: number | null;
  passes: { week: number; reason: PassReason }[];
}

export interface Round {
  id: string;
  stage: InvestorKind;
  targetAmount: number;
  askPreMoney: number;
  openedWeek: number;
  leadInvestorId: string | null;
  commitments: { investorId: string; amount: number; week: number }[];
  meetings: { investorId: string; week: number; outcome: MeetingOutcome }[];
  poolTopUp: number;         // fraction of post-money, created pre-money
  status: "open" | "closed" | "cold" | "abandoned";
}

export type MeetingOutcome =
  | { kind: "pass"; reason: PassReason; soft: boolean }
  | { kind: "secondMeeting" }
  | { kind: "diligence" }
  | { kind: "termSheet"; sheet: TermSheet };

export interface TermSheet {
  investorId: string;
  amount: number;
  preMoney: number;
  boardSeat: boolean;
  liquidationPreference: 1 | 1.5 | 2;
  poolTopUp: number;
  expiresWeek: number;
}

export interface CapEntry {
  id: string;
  holder: string;            // "You", "Priya (cofounder)", "Ridgeline Capital"
  kind: "founder" | "cofounder" | "optionPool" | "investor";
  shares: number;
  roundId: string | null;
  sinceWeek: number;
}
```

Add to `GameState`: `investors: Investor[]`, `rounds: Round[]`,
`capTable: CapEntry[]`, `activeRoundId: string | null`.

Seed the cap table at company formation: founder 6,000,000 shares, cofounder
3,000,000, option pool 1,000,000. Ten million total keeps the arithmetic legible.

### 7.3 Finding investors — you do not get to pitch everyone

An investor is `discovered: false` until unlocked by one of:

- **Warm intro from a person.** Each employee and each existing investor has a
  chance per week to introduce you, scaled by their relationship with you.
- **Network tasks.** "Go to the founder dinner" (2 Focus, $200) discovers 1–3
  investors weighted to your stage.
- **Reputation.** Crossing reputation thresholds surfaces investors who
  approach *you*. These arrive as Inbox messages and feel great.
- **Cold outreach.** Always available, 1 Focus. Discovers one investor but
  starts them at `relationship: 5` and applies a −15 penalty to the first pitch.

The Raise app shows discovered investors as a pipeline: **Researching →
Pitched → Second meeting → Diligence → Committed / Passed.**

### 7.4 Research — the counter to wasted pitches

`researched: false` hides `thesisSegments`, `minMonthlyRevenue` and
`maxTechDebt`. The player sees only name, firm, stage, check range and
portfolio.

A **research task** (1 Focus, one week) reveals them and adds +5 relationship.
Pitching an unresearched investor is allowed and is often a mistake — that is
the lesson.

### 7.5 The pitch

Cost: 2 Focus and one week of calendar. Compute a score in `[0, 100]`:

```
traction   = clamp(0..100) from monthly revenue vs investor.minMonthlyRevenue,
             growth rate over the last 13 weeks, and net retention
fit        = 100 if truth.buyer ∈ thesisSegments
             50  if beliefs.buyer ∈ thesisSegments
             10  otherwise
team       = founder reputation, seniority of the team, whether a named gap
             (no senior sales, no senior engineer) is open
story      = conviction, capped by evidenceScore
integrity  = max(0, overclaim - 10) * 2      // penalty, not a bonus

score = 0.32*traction + 0.24*fit + 0.18*team + 0.16*story
      + 0.10*(relationship) - integrity
      + coldOutreachPenalty
```

Roll once through the seeded RNG, ±12. Then:

| Score | Outcome |
| --- | --- |
| < 35 | **Hard pass.** Reason from the worst-scoring input. Relationship −5. |
| 35–54 | **Soft pass.** "Keep me posted." Relationship +8. They will take a second pitch once their stated bar is met. |
| 55–69 | **Second meeting.** Costs another 2 Focus next week, re-rolled with +10. |
| 70–84 | **Diligence.** See 7.6. |
| ≥ 85 | **Term sheet** immediately. |

`tyreKicker` temperament caps outcomes at Second meeting on the first pitch,
forever. `fast` upgrades one band. `cutthroat` always lowers the pre-money in
the term sheet by 20% and always demands a board seat.

### 7.6 Diligence — where overclaim finally bites

Diligence takes two weeks and asks for real numbers. Compare what the pitch
claimed against what the simulation actually holds:

- If `overclaim > 25`, the deal dies with `numbersDidNotMatch`, relationship
  −25, and **every other investor in the round hears about it**: −10
  relationship across the board. This is the signal-risk mechanic and it should
  hurt.
- If churn over the last quarter exceeds 8% monthly, they re-trade: pre-money
  drops 30% and the player chooses accept or walk.
- Otherwise the term sheet arrives.

### 7.7 Leads and followers

- A round needs a **lead**. Investors with `leadsRounds: false` will commit only
  after a lead has signed. Show this plainly in the Raise app: "Will follow —
  needs a lead."
- Once a lead commits, every discovered follower gets +15 to their next pitch.
  Momentum is real and the player should feel it.
- If a round sits open for eight weeks with no lead, it goes **cold**: all soft
  commitments expire and the player must close it and rebuild traction.

### 7.8 Rejection is content, not a dead end

Every pass carries a reason, and every reason produces something actionable.
Write it as a message from that investor in the Inbox, in their voice.

| Reason | What the player gets |
| --- | --- |
| `tooEarly` | A named bar: "Come back at $12k monthly." Tracked as a goal; the investor auto-reopens when hit. |
| `churnConcern` | Spawns the task "Find out why customers are leaving". |
| `teamGap` | Spawns "Hire a senior <role>" and flags the gap in the Team app. |
| `valuationTooHigh` | Unlocks "Counter at a lower valuation" on that investor. |
| `needLead` | Moves them to a "will follow" list, ready the moment a lead signs. |
| `notOurThesis` | Permanent unless the company pivots. Says so plainly. |
| `marketTooSmall` | Suggests the enterprise segment or a price change. |
| `numbersDidNotMatch` | No follow-up. This one is meant to sting. |
| `timing` | Reopens on its own in 6–12 weeks. |

**Rule: a player must never be stuck.** If every discovered investor has passed
and no lead exists, the Raise app tells them exactly what to do next — the
lowest bar among all outstanding `tooEarly` reasons.

### 7.9 Negotiation

From a term sheet the player can Accept, Counter or Walk.

Counter on one axis per round of negotiation:

- **Valuation** — ask for up to +40% pre-money. Success chance falls as the ask
  rises and rises with the number of other committed investors.
- **Board seat** — refusing costs 15 points of success chance.
- **Option pool** — investors ask for a 10–15% post-money pool created
  *pre-money*, which dilutes founders only. Negotiating it down to 8% is one of
  the most valuable things a player can learn.

A failed counter has a 25% chance of the investor walking. Show that risk as a
number before the player commits.

### 7.10 Dilution — make it visible and make it hurt

On close, in this exact order:

1. **Option pool top-up, pre-money.** Created before the investment, so it
   dilutes existing holders only:
   `poolShares = poolTopUp * (existing + investorShares) / (1 - poolTopUp)`
2. **Investor shares**: `investorShares = existingShares * amount / preMoney`,
   which gives them `amount / (preMoney + amount)` of the post-money company.
3. Append `CapEntry` rows. Never mutate existing share counts — dilution is a
   change in *percentage*, not in shares owned. Players must be able to see
   that they still own the same number of shares and less of the company.

**UI requirements:**

- The cap table is a stacked horizontal bar, one segment per holder, animating
  from the old split to the new one when a round closes. Hold it on screen for
  a beat.
- The founder's ownership percentage is permanently visible in the Raise app.
- Show the "what this is worth" line: `ownership × valuation`, so dilution has
  a number attached to it.
- Company history records: _"Raised $600,000 from Ridgeline Capital at a $5.4M
  pre-money. You went from 58% to 47%."_

### 7.11 Down rounds and bridges

- If a raise opens at a pre-money below the last post-money, mark it a **down
  round**: reputation −12, morale −10 across the team, and any investor with
  a liquidation preference above 1 takes their multiple first at exit.
- `bridge` stays as the desperate option: fast cash, converts at a 20% discount
  to the next round, no negotiation.

### 7.12 Ship criteria

- A player can run a full raise: discover, research, pitch, get passed on for a
  named reason, act on that reason, re-pitch, get a term sheet, negotiate, and
  close.
- Rejection is the common case and never leaves the player without a next step.
- The cap table is always arithmetically correct: percentages sum to 100.
- Closing a round visibly changes the ownership bar.

---

## 8. UPDATE 5 — Art pass and home screen

### 8.1 The bug making pixels look unclear

The canvas currently scales by whatever fraction fits the pane. **Fractional
scaling is why the art looks smeared.** Fix first:

- Compute `scale = Math.max(1, Math.floor(min(paneW / viewW, paneH / viewH)))`.
- Set the canvas CSS size to `viewW * scale` by `viewH * scale` exactly.
- Centre it and letterbox the remainder. Never stretch.
- Re-measure on resize.

### 8.2 Palette discipline

- Extract every colour used anywhere into one 32-entry palette module. No hex
  literals outside it.
- Mood and time of day adjust a **lighting layer only**. Never desaturate base
  colours — that is what made the night office look grey.

### 8.3 Sprites

- Every sprite: 1px near-black outline, minimum three tones (base, shadow,
  highlight), one light source top-left across the whole game.
- Characters at 32×36, four directions, four-frame walk at 6fps, plus
  idle-breathe, typing, drinking, talking and a slumped burnout pose.
- Silhouette test: two employees must be tellable apart at 25% zoom.
- Everything the player looks at often gets at least two frames of life.

### 8.4 Home screen

Not a menu over a screenshot:

- Full-bleed office at golden hour, gently animated — steam off a mug, a
  monitor blinking, somebody crossing the room behind the logo.
- Logo in chunky pixel type.
- **Continue** as a save card: company name, `Y2 W14`, monthly revenue,
  headcount. One click back in.
- **New company** and **Settings** below it, quieter.
- A warm music loop, off by default until the player has interacted once.

### 8.5 Performance

60fps with 40 agents on a five-year-old laptop. Pre-render static furniture to
an offscreen canvas once per room change; per frame, redraw only people, lit
screens and anything animating.

---

## 9. UPDATE 6 — Growth without end

- **Office tiers** as real decisions: bigger rooms cost more per week and take
  a week to move into, during which output halves.
- **Product lines**: a second product with its own roadmap, customers and churn.
- **Appoint a CEO**: pick from the senior team or hire outside. The company runs
  at 60% growth without you and pays a dividend. Its office stays visitable.
- **Company two**: start again in a small room, keeping founder cash,
  reputation, network and every investor relationship.
- **Holding company**: owns stakes in both. Portfolio view. This is where the
  game goes long.

---

## 10. Content quotas

Do not ship a system with three examples in it.

| Content | Minimum |
| --- | --- |
| Investors | 40, across all five stages, with distinct firms and portfolios |
| Named tasks | 60, spread across all six skills |
| Inbox events | 50, each traceable to a decision the player made |
| Milestones | 24 |
| Rejection lines | 3 distinct phrasings per pass reason, so repeats are rare |
| First names / surnames | 80 / 60, generating employees and investors |
| Firm names | 40 |

All names fictional. No real firms, no real investors.

---

## 11. Testing requirements

Add to `src/test/`:

- `tasks.test.ts` — assignment, split output, context-switch penalty, burnout
  onset, deterministic completion order.
- `fundraising.test.ts` — pitch scoring bands, every pass reason reachable,
  soft passes reopen at the stated bar, a round goes cold after eight weeks
  with no lead, diligence kills a deal when overclaim is high.
- `captable.test.ts` — **the important one.** Percentages always sum to 100
  (±0.001) across a hundred randomised sequences of rounds; pre-money pool
  top-up dilutes founders and not the incoming investor; share counts never
  decrease; a down round is detected correctly.
- `migration.test.ts` — a saved game from the previous version loads and plays.
- Extend `office.test.ts` for the founder agent and click-to-walk.

The 2,000-run balance simulation must keep passing. If a change moves the win
rate, retune `src/data/balance.ts` deliberately and record why in `DECISIONS.md`.

---

## 12. Quality gates

An update is not done until all seven pass:

1. Someone who has never seen the game knows what to do within thirty seconds,
   with no tutorial text.
2. No banned vocabulary appears anywhere on screen.
3. You can tell how the company is doing with every number hidden.
4. Four hours of play still adds things rather than repeating them.
5. Failing is survivable and the run continues.
6. A screenshot at 25% is still readable.
7. 60fps with a full office on a modest laptop.

---

## 13. How to work

- Branch per update: `update-1-endless`, `update-2-tasks`, and so on.
- Small commits with real messages. Say what changed and why, not "updates".
- Run `npm test` and `npm run build` before every commit.
- Record balance and design decisions in `DECISIONS.md` as you go.
- If a spec here is wrong once you are in the code, say so and propose the fix.
  Do not silently build something different.
- Do not add dependencies without a reason that survives a sentence of scrutiny.
