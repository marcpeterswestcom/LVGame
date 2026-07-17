# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vegas Strip Survivor** — walk the Las Vegas Strip from Mandalay Bay to the Stratosphere without blacking out or dehydrating.

Two versions exist:

- **`vegas-neon-redux.html`** — CURRENT. 2026-07 full redesign: neon 2D side-scroller with 5-layer parallax, per-zone landmark silhouettes, and the drink/food/water balance mechanic. Design spec: `docs/superpowers/specs/2026-07-16-neon-redux-design.md`. Details below.
- **`vegas-strip-survivor.html`** — LEGACY. Old pseudo-3D OutRun-style version (wallet + drunk meter, code-primitive art). Kept as reference only; don't extend it.

## Running the Game

Open the HTML file directly in a browser. No build step, no dependencies, no server required. Canvas is fullscreen responsive. (Google Fonts load from CDN when online; falls back to system fonts offline.)

## Neon Redux Architecture (`vegas-neon-redux.html`)

Single file, vanilla JS + Canvas, HTML overlay for HUD/screens.

- **Core loop:** Drinks give points + comp cash but raise `drunk` and drain `hyd`; food lowers `drunk`; water restores `hyd`. `drunk > 80` or `hyd < 20` → sick mode (green wash, wobble, score drain, hysteresis exit at 74/26). `drunk = 100` = blackout, `hyd = 0` = collapse. There is no win: `x >= TOTAL` triggers `nextLap()` instead (see Laps).
- **Laps (endless):** finishing the Strip banks `1000 + round(lastCall) (+500 if drunk < 30)` into score, resets `x`/`lastCall`/entities (`buildStrip()` re-places slots+vendors), increments `game.lap`, and shows a "LAP n — EVERYTHING FASTER" card. `lapSpd = 1 + (lap-1)*0.2` multiplies scroll speed and hazard walk; spawn density scales `×(1 + (lap-1)*0.15)` (cap 0.72). Runs end only in blackout/collapse/arrested; end stats show laps finished and cross-lap distance bonus.
- **Rides (player wheels):** `RIDES[]` — skateboard ×1.9/9s, BMX ×2.4/6.5s. Rare grabbable pickup (`kind:'ride'`, min 3500px gap, ~6% roll). While `game.riding > 0`: speed mult forced ≥1 then multiplied, countdown pill over player, distinct riding pose (`drawPlayerRide`). Any hazard hit = wipeout (−25 on top of hazard effect, stagger ≥1.5, ride lost). Pee break hops off; lap rollover clears it.
- **Grabbing (not auto-pickup):** collectibles/vendors/slots are consumed with SPACE via `game.grabTarget` (nearest in range, set each frame in `update()`, prompt pill drawn in `drawEntitiesAndPlayer`). Only hazards collide automatically.
- **Bladder:** drinks +12, water +25 (`game.bladder`). ≥85 slows you; 100 = accident (−150 pts, stagger, reset). E = voluntary pee break (`startPee`, needs ≥25): stands still `PEE_TIME` (2.5s), vulnerable, hazard hit cancels it. Counts in `counts.pees`/`counts.accidents`.
- **Buzzkill:** `drunk < 12` for 14s (`soberT`) → `buzzkill`: score −4/s, speed ×0.85, grey-blue tint + banner, until you drink (drunk ≥ 12 clears).
- **Hazard signatures** (collision switch in `update()`): flyer → `handsFull` 3s (blocks grabs); showgirl → `dazzled` 2.5s (reversed lane input); mascot → $10 photo fee (−60 pts if broke); tourist → shove to random row +8 drunk; robot → classic −40/+12 drunk; scooter → −35 + long stagger (walk 195 base, per-spawn `spd` 0.8–1.35, half spawn with `swerve` and drift into your row). All hits reset combo.
- **The law:** cop bump while drunk < 60 = −20; drunk ≥ 60 = **ARRESTED** (4th game-over kind). Cops on screen ticket public urination during pee breaks AND accidents ($75 fine + −100 pts, `copOnScreen()` helper). At drunk > 80 cops hunt: ×1.6 walk speed, shift toward player's row, pulsing "!" telegraph over their head.
- **Combo:** drinks apply `score += pts × combo` then combo +1 (cap ×5); any hit/accident/ticket resets to ×1. `bestCombo` in end stats.
- **Last call:** `lastCall` starts 1000, −3.4/s; added to total only on a win. Shown in HUD as a live countdown clock (`mmss(lastCall/3.4)`, ≈5 min), one-minute warning popup (`lastCallWarned`), run time (`runTime`) in end stats, and a "friends left" line if you finish after the clock. Makes sprinting a real trade.
- **High score:** localStorage key `vss-best` (`bestScore`), shown on start screen + end stats.
- **Music:** step-sequencer synthwave loop (112 BPM kick/hats/bass/arp) via `startMusic()`/`stopMusic()`; M mutes music + sfx.
- **Touch:** swipe ↑/↓ lanes, tap = grab, double-tap = pee, hold = sprint (`touchstart`/`touchend` on canvas).
- **Zone difficulty:** `ZONES[].haz` multiplies hazard spawn chance (Mandalay 0.75 → Circus Circus 1.5); cop spawn weight also rises with progress.
- **Director spawner:** `spawnAhead()` guarantees water/food via pity timers (`lastWaterX`/`lastFoodX` gaps) and urgency thresholds on current meters; forced rescues are sometimes guarded by a stationary performer. Luck never decides survival.
- **Economy:** start $50 (`game.cash`); drinks tip ~pts/10; vendor carts (row 0, pre-placed in `newGame`) sell water $20 / food $35; slot machines (one per zone boundary, row 0) run the `enterSlots`/`slotPull` mini-game — $25/pull, paytable in `SLOT_PAYOUT`, ~80% RTP, hydration keeps draining in `slotTick()` while playing. `game.slotNet` tracked for end stats.
- **Movement:** 3 sidewalk depth rows (`ROWS[]`, far→near with scale). Up/Down hop rows; Right sprint (drains hydration faster), Left slow. Auto-scroll; player fixed at 30% screen width.
- **Rendering layers** (each with its own parallax factor): sky/stars/moon → far skyline (`FAR_P`, filler towers + `drawLandmark()` hero silhouette per zone) → mid buildings with neon signs (`MID_P`; sign positions cached in `frameSigns` for wet reflections) → street with taxis → sidewalk → entities/player (painter's order by row) → foreground palms/lampposts (`FORE_P` > 1).
- **Scenery determinism:** all procedural placement uses `rnd(seed)` (sin hash), so scenery is stable frame to frame — never `Math.random()` in draw code.
- **Entities:** spawned ahead of camera via `spawnCursor`; hazards walk left (`type.walk` speed). Hazard art in `drawFlyerGuy/Showgirl/Mascot/Tourist/Robot`, drinks in `drawGlass()` by `glass` key.
- **Tuning:** `DRINKS[]`, `FOODS[]`, `HAZARDS[]`, `RIDES[]`, `ZONES[]`, `TOTAL` (30000), `BASE_SPEED`, lap scaling (`lapSpd`/`lapHeat`), meter drain rates at top of `update()`.
- **Audio:** tiny WebAudio synth (`sfx.*`), M mutes. P pauses.

## Architecture

The entire game is a single HTML file containing inline CSS and vanilla JavaScript rendered on a fullscreen HTML5 Canvas with pseudo-3D perspective.

### Key Systems

- **Pseudo-3D projection** — `project(worldX, worldZ)` converts world coordinates to screen position + scale using `CAMERA_DEPTH / worldZ` (OutRun-style vanishing point). Responsive to window size via `getHorizonY()`, `getGroundY()`, `getVanishX()`, `getRoadHalfWidth()`.
- **Lane system** — 5 lanes (`LANE_POSITIONS[]`), player moves discretely between lanes with smooth interpolation. Drunk level affects lane change accuracy and causes random drift.
- **Two failure conditions** — Wallet ($500 start, traps cost money) hits $0 = broke. Drunk meter hits 100 = blackout. Either ends the game.
- **Drink collection** — 15 unique alcoholic drinks (`DRINK_TYPES[]`). Collecting all 15 gives +500 bonus and resets the collection. Risk/reward: drinks give points but increase drunk meter.
- **Obstacle types** — 6 Vegas trap types (`OBSTACLE_TYPES[]`) with behaviors: straight, zigzag, homing, stationary, wander
- **Road rendering** — Horizontal scanline strips from horizon to bottom, with perspective-scaled width, lane markers, center stripe, and curbs
- **Building system** — 300 procedurally generated buildings on both sides with neon outlines, flickering windows, neon sign text, and palm trees
- **Drunk effects** — Camera sway, vignette, purple tint overlay, control wobble (wrong-direction inputs), random lane drift

### Game State

All mutable state lives in the `game` object returned by `createGame()`. Key properties: `player` (lane, worldX, bobble), `camera` (z, speed), `drunkLevel`, `wallet`, `distance`, `score`, `obstacles[]`, `drinks[]`, `powerups[]`, `particles[]`, `buildings[]`, `drinksCollected` (Set), `collectionBonuses`.

### Drawing Functions

Each obstacle type has its own canvas-primitive draw function: `drawShowgirl()`, `drawCostumed()`, `drawFlyerGuy()`, `drawBeggar()`, `drawPerformer()`, `drawDrunkTourist()`. Drinks are drawn by `drawDrink()` with glass shapes based on `glassType`. All receive `(ctx, sx, sy, scale, time)`.

### Input

Left/Right arrow or A/D = lane change (discrete, one press = one lane). Up/W = sprint. Down/S = slow down. Uses `keysJustPressed` for single-fire lane changes.

### UI

HTML overlay (`#ui-overlay`) with drunk meter, strip progress bar, wallet display, score, drink collection tracker (15 emoji icons showing collected/uncollected), landmark popup. Start/end screens are HTML overlays.

## Other Files

- `vegas-strip-survivor-gdd.md` — Original game design document (references older isometric version)
- `vegas-strip-survivor-godot.zip` — Godot project export (not actively developed)

## Key Constants for Tuning

- `DRINK_TYPES[]` — 15 drinks with points/drunk values
- `OBSTACLE_TYPES[]` — 6 trap types with cost/speed/hitbox/behavior
- `LANE_POSITIONS[]` — lateral positions of the 5 lanes
- `TOTAL_DISTANCE` (3000) — strip length
- Difficulty scaling in `update()`: `spawnRate`, `baseSpeed`, sprint multiplier
- Drunk effects thresholds in `update()` and `draw()`
