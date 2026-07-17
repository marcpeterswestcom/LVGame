# Vegas Strip Survivor — Neon Redux (Redesign Spec)

Date: 2026-07-16
Status: Approved by Marc

## Goal

Full rebuild of `vegas-strip-survivor.html`. The pseudo-3D version looked bad
(code-primitive stick figures, wonky perspective). Replace it with a polished
neon 2D side-scroller built around the drink/food/water balance mechanic.
Old file is kept untouched as reference; new game is a new single HTML file:
`vegas-neon-redux.html`.

## View & Movement

- Side view. Player walks right along the Strip sidewalk, Mandalay Bay →
  Stratosphere. World auto-scrolls.
- 3 sidewalk depth rows (near / middle / far). Up/Down (or W/S) hops rows
  with smooth interpolation. Right/D = sprint, Left/A = slow.
- Total distance ~3000 units, divided into 11 landmark zones (Mandalay Bay,
  Luxor, Excalibur, MGM Grand, Bellagio, Caesars, Venetian, Treasure Island,
  Wynn, Circus Circus, Stratosphere).

## Core Loop — the Balance Triangle

- **Drinks** (collectible, variety of ~12 types): +points, +Drunk,
  −Hydration. Higher-point drinks are boozier.
- **Food** (tacos, pizza, shrimp cocktail, buffet plate): −Drunk, small
  +points.
- **Water**: +Hydration, small +points.
- Meters: Drunk 0–100 (starts 0), Hydration 0–100 (starts 100). Hydration
  also drains slowly over time (desert!); Drunk metabolizes down slowly.
- **Sick mode**: Drunk > 80 OR Hydration < 20 → green tint, control wobble,
  reduced speed, score drains ~5/sec. Exits when both back in range.
- **Game over**: Drunk = 100 (blackout) or Hydration = 0 (collapse).
- **Win**: reach the Stratosphere. Sobriety bonus if Drunk < 30 at finish.

## Hazards

Vegas characters walk left toward the player in the rows: flyer guy,
showgirl, costumed character, drunk tourist, street performer. Collision =
stagger animation, point loss, and a forced shot (+Drunk). Brief
invulnerability after a hit. Spawn rate and speed scale with distance.

## Graphics (the main fix)

Five parallax layers, all drawn in code, neon-noir palette:

1. Night-sky gradient + stars + moon.
2. Distant landmark silhouettes that change per zone (Luxor pyramid + sky
   beam, Bellagio fountains, Eiffel tower, Strat tower, etc.).
3. Mid-ground buildings with animated/flickering neon signs.
4. Sidewalk + street with wet-asphalt neon reflections.
5. Foreground palms, lampposts, fire hydrants.

Characters: properly proportioned vector-style canvas art with walk-cycle
animation (limbs swing, bob). Neon glow via shadowBlur used deliberately.
Landmark name card animates in when entering each zone.

## HUD

Styled neon HUD: Drunk meter (green→amber→red), Hydration meter (blue),
score, strip progress bar with landmark ticks, sick-mode warning. HTML
overlay like before. Start screen with instructions; end screens for
blackout / collapse / victory with score breakdown.

## Revision 2 (same day) — agency over luck

Playtest feedback: auto-pickup made survival pure luck ("I literally grab
all the items and it's just luck if water comes up"). Changes:

1. **Space-to-grab** — collectibles no longer auto-consume; SPACE grabs the
   nearest item in range (prompt pill shows over it). Hazards still collide.
2. **Director spawner** — pity timers + meter-urgency guarantees: water is
   forced to spawn when hydration runs low or after long droughts, food
   likewise for the drunk meter. ~40% of forced rescues are guarded by a
   stationary street performer.
3. **Economy** — start $50; drinks earn comp cash (~pts/10); vendor carts
   sell water $20 / food $35; slot machines outside every casino run a
   $25/pull mini-game (777 = $500 jackpot, ~80% RTP) during which hydration
   keeps draining. Cash and slots net shown in end stats.

## Revision 3 (same day) — sober and bladder pressure

Feedback: nothing punished staying sober, and water-chugging was free.

1. **Buzzkill** — drunk < 12 for 14 straight seconds → "TOO SOBER — THIS IS
   VEGAS" banner, score drains 4/s, walk speed ×0.85, grey-blue wash. Clears
   the moment you drink. The drunk meter now has a floor and a ceiling.
2. **Bladder meter** (third HUD bar, gold) — drinks +12, water +25. Above 85
   you waddle (speed ×0.92) with a FIND A SPOT! warning; at 100 you wet
   yourself: −150 points, stagger, bladder resets, "accident" counted.
   Tap E (needs ≥25 bladder) for a voluntary 2.5s pee break: you stand
   still and vulnerable — a hazard bump mid-stream cancels it. Pee breaks
   and accidents both appear in the end-screen stats.

## Revision 4 (same day) — texture pass

All suggestions from the design review, approved wholesale:

1. **Distinct hazards** — flyer stuffs your hands (no grabbing 3s); showgirl
   dazzles (reversed controls 2.5s); mascot charges a $10 photo fee; drunk
   tourist shoves you a lane and spills on you (+8 drunk); robot keeps the
   classic block; every hit resets the combo.
2. **LVPD cop** — new hazard; bumping him costs 20. If he's anywhere on
   screen during a pee break: $75 public-urination fine, −100 points,
   pee canceled. Cop frequency rises along the Strip.
3. **Combo multiplier** — consecutive drinks without a hit multiply points
   ×2…×5. Best combo shown in end stats.
4. **Last call** — 1000-point bonus ticking down 3.4/s, awarded only on a
   win. Sprint finally has a purpose.
5. **Zone difficulty** — per-zone hazard density (`haz` 0.75→1.5), Circus
   Circus is the gauntlet.
6. **High score** — localStorage, start screen + end screen with NEW! flag.
7. **Music** — self-contained WebAudio step sequencer, 112 BPM synthwave
   loop (kick, offbeat hats, minor-key bass, arp every 4th bar).
8. **Touch controls** — swipe lanes, tap grab, double-tap pee, hold sprint.

## Revision 5 (same day) — the law takes drunkenness seriously + the clock

1. **Drunk & disorderly** — bumping a cop while drunk ≥ 60 is an ARREST:
   fourth game-over ending with its own flavor lines. Below 60 it stays a
   −20 bump.
2. **Indecent exposure** — wetting yourself with a cop on screen stacks a
   $75 citation and −100 points on top of the −150 accident.
3. **Cops hunt the hammered** — above 80 drunk, on-screen cops flash a "!"
   , walk ×1.6 faster and shift into your lane. Being sick-drunk near the
   law is now an emergency.
4. **Last call clock** — the bonus displays as a live mm:ss countdown
   (≈5:00) in the HUD, a one-minute warning pops mid-screen, run TIME shows
   in end stats, and finishing after last call means your friends left.

Repo note: moved out of ProjectManagement into its own repository
(marcpeterswestcom/VegasGame).

## Tech

Single self-contained HTML file, vanilla JS + Canvas, no dependencies,
fullscreen responsive, playable by double-clicking. 60fps target via
requestAnimationFrame with delta-time updates.
