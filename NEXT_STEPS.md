# What to add next

A design review of the game as it stands, and what it needs to become something
people play for pleasure rather than survive. Written after playing the current
build and reading the balance data.

---

## 0. The one number that matters

The 2,000-run simulation reports **17.5% of runs succeed**. Split by strategy:
research-led play wins 52%, revenue-chasing play wins **0%**.

That means the game currently has one correct opening, and any player who has
not yet worked out what it is loses. Combine it with the opening position —
$2,000 in the bank against $770 a week of burn, which is **2.6 weeks of
runway** — and week one is not "running a company". It is defusing a bomb
while reading the manual.

Everything in section 1 exists to fix that without making the game soft.

---

## 1. Difficulty: make it fair before making it easy

### 1.1 Give the opening room to breathe

Raise the starting position to roughly **eight to ten weeks of runway**. Either
lift `startingCash` to about $6,000, or drop `founderWeeklyLiving` for the first
quarter and let it rise as the company grows.

The pressure should arrive in month two, once the player understands what the
buttons do. Right now the pressure arrives before the understanding, and that
reads as unfair rather than tense.

### 1.2 Three named difficulties, not a slider

Ship them as fantasies, not numbers:

| Mode | Who it is for | What changes |
| --- | --- | --- |
| **Steady** | People who want to build a company | ~2× starting runway, softer churn, investors more forgiving, no permanent company loss |
| **Standard** | The default | Today's systems, retuned to the target below |
| **Brutal** | People who want the knife | Today's numbers, plus tighter investor bars |

Choose at company creation, changeable from Settings, shown on the save card.

### 1.3 The target curve

Standard should land near **55–65% of runs reaching year two**, not 17%. An
endless game should not gate on survival — it should gate on *how far you get*.
Losing a company must stay possible, but it should be the consequence of a
choice you can point at, not of not knowing the meta on turn one.

Retune until revenue-chasing play wins **20–30%** rather than 0%. A strategy
should be worse, not void.

### 1.4 A floor under failure

Add **consulting work**: always available, trades Focus for cash at a poor
rate. It is never the best move, and it means a player can always dig out of a
hole by spending time instead of dying. This removes the unwinnable state
without removing pressure.

### 1.5 Never lose to something you could not see

Every crisis needs two to three weeks of visible warning. Runway moves through
**Healthy → Watch → Danger → Critical**, and the room says so before the
spreadsheet does: lights dim, the team stops getting coffee, someone starts
staying late. If a player is surprised by bankruptcy, that is a bug.

---

## 2. Flow: the first ten minutes

### 2.1 A cold open, in fiction

No tutorial box. The cofounder walks to your desk and says one thing:

> "We've got eight weeks of money. What do we do first?"

The phone lifts slightly, the Tasks app opens, and the first task is already
highlighted. One sentence, one gesture, no reading.

### 2.2 Always show the next action

A single **Now** line in the HUD: *Put someone on a task* → *End the week* →
*Read what the market said*. It updates as the player acts and disappears once
they stop needing it — track "has ended three weeks without help" and retire it.

### 2.3 Make ending a week a beat, not a click

Right now it is instant. It should be a two-second sequence: the room speeds
up, people move, money ticks, then the summary lands. This is where the game
gets its rhythm, and it costs almost nothing to build.

### 2.4 One card stack, never a wall of modals

Milestones, completions, crises and events all queue into one corner stack,
one at a time, dismissible, never blocking the office.

### 2.5 Let the player leave and come back

A **"story so far"** screen: the company history as a scrapbook — founding,
first customer, first hire, the week you nearly died. The data already exists.
Surfacing it is what makes a save worth returning to.

---

## 3. Graphics: the next pass

The room now has depth, density and a company name on the wall. What it does
not have is **change over time**.

### 3.1 Time of day and season

The week should look different on Monday morning than Friday night: window
light, lamp warmth and shadow length all shift across the five days. Seasons
change the weather through the glass — rain, snow, low winter sun. This single
system does more for atmosphere than any amount of extra furniture.

### 3.2 Read state off the body

An employee's condition should be legible without hovering:

- **Burnt out** — slumped, desaturated, head down, slower walk
- **Thriving** — upright, brighter shirt, quicker step
- **New** — a small "new" tag for their first fortnight
- **Leaving** — packs a box, walks to the door, and is gone

### 3.3 Props that say what someone does

A salesperson wears a headset. An engineer has two monitors. A designer has a
tablet. A researcher has paper everywhere. You should be able to read the shape
of the team by looking at the room.

### 3.4 Moving office is a scene

Today the room swaps instantly. It should be an event: boxes appear, the old
room empties over a week, the new room starts bare and fills. This is the single
most satisfying progression moment in the game and it is currently invisible.

### 3.5 Make the office yours

Let the player spend money on decor — posters, plants, a rug, an arcade machine,
a neon sign. Small morale effects, large attachment effects. People will
screenshot this.

### 3.6 Camera and motion

A gentle push-in when a card opens. Parallax between wall and floor on mouse
move. Both are a few lines and both make a static scene feel alive.

### 3.7 Lock the palette

Extract every colour into one documented 32-entry palette module and forbid hex
literals elsewhere. The art will hold together automatically, and time-of-day
becomes a single transform over one table.

---

## 4. Systems worth adding, in order of payoff

### 4.1 People you actually care about

The strongest stories any management game produces are about people. The bones
exist — names, roles, quirks, morale, drift. Add:

- **Relationships between employees.** Two people who work well together;
  two who do not. Visible in where they stand at lunch.
- **Someone who quits and comes back.** With a line about what they learned.
- **A first hire who becomes your CTO** if you keep them long enough.
- **Small life events.** A work anniversary. A birthday. A wedding they need
  a week off for.

### 4.2 Customers with faces

One named champion per major account, with a logo that goes on the office wall
when they sign and comes down when they churn. Churn stops being a number.

### 4.3 A rival founder

One NPC founder running a competing company on the same market truth. They
raise when you raise, ship when you ship, and appear in the news. Having
somebody to lose to is more motivating than an abstract market share number.

### 4.4 A goals wall

Achievements, but diegetic: a corkboard in the office that fills with pinned
milestones. Progress you can see from your desk.

### 4.5 Seasonality

December is slow. January is hiring season. Enterprise buyers disappear in
August. Real texture, almost free to implement, and it teaches something true.

---

## 5. Feel

Small, cheap, and the difference between a prototype and a game:

- **Sound on every action.** Task assigned, money in, week closed, milestone hit,
  investor passes. The audio engine already exists.
- **Numbers tick, never jump.** Cash counting up is a reward in itself.
- **Weight on impact.** A one-frame shake on a crisis card. Confetti on a
  milestone — sparingly, twice a session at most.
- **Idle chatter.** Occasional speech bubbles over employees: "third coffee",
  "who broke the build?". Three lines per role is enough.
- **A pause between weeks.** Let the player sit in the room. Not everything
  needs to advance.

---

## 6. Suggested order

1. **Difficulty retune and the Steady mode.** Nothing else matters if week one
   is unfair.
2. **Cold open and the Now line.** The first ten minutes decide whether anyone
   sees the rest.
3. **Time of day, and state readable off the body.** Biggest visual return.
4. **The week-end beat and one card stack.** Rhythm.
5. **People systems.** Relationships, life events, returning hires.
6. **Moving office as a scene, and buyable decor.** Progression you can see.
7. **Rival founder, customers with faces, seasonality.**

---

## 7. What not to do

- **Do not add another spreadsheet.** Every new system needs an object in the
  room or an app on the phone, or it does not ship.
- **Do not make the simulation deeper before the first ten minutes are good.**
  The engine is already deeper than the interface can express.
- **Do not remove failure.** Softening the curve is not the same as removing
  consequences. Losing a company should stay possible and stay survivable.
- **Do not let the tutorial become text.** Everything teachable should be
  taught by a person in the room doing something.
