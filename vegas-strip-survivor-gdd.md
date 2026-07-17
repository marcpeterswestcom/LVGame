# 🎰 Vegas Strip Survivor — Game Design Document

## Concept
An isometric arcade dodging game where the player must traverse the Las Vegas Strip from Mandalay Bay to the Stratosphere without getting too drunk. Dodge incoming drinks, party people, and temptations while collecting water, coffee, and food to stay sober enough to finish the journey.

---

## Core Mechanics

### Movement
- **Isometric perspective** — classic SimCity-style diamond grid
- Player moves in 8 directions using WASD/Arrow keys
- **Auto-scroll**: The strip scrolls forward automatically at increasing speed
- **Drunk wobble**: As drunk level rises, player input becomes increasingly unreliable with random drift

### Drunk Meter (0–100)
| Level | Range | Effects |
|-------|-------|---------|
| Sober | 0–20 | Clean controls, clear vision |
| Tipsy | 21–40 | Slight wobble on movement |
| Buzzed | 41–60 | Screen sway, drift on input, 💫 appear |
| Hammered | 61–80 | Heavy wobble, vignette, blurry edges |
| Blackout | 81–99 | Extreme drift, vision tunneling, inverted controls? |
| 100 | GAME OVER | You blacked out! |

- Drunk level **slowly decreases** over time (~1.5/sec) — your body metabolizes
- Getting hit by drinks **increases** it sharply

### Obstacles (Things to Dodge)
| Obstacle | Emoji | Drunk+ | Behavior |
|----------|-------|--------|----------|
| Cocktail | 🍸 | +12 | Straight line, fast |
| Beer | 🍺 | +8 | Slow, wide hitbox |
| Shots | 🥃 | +20 | Very fast, small |
| Champagne | 🍾 | +15 | Medium speed, large |
| Party Guy | 🥳 | +10 | Homing — follows you! |

**Movement Patterns:**
- `straight` — moves in a line
- `zigzag` — sine wave path
- `diagonal` — angled approach
- `homing` — slowly tracks player position

### Power-ups (Things to Grab)
| Power-up | Emoji | Drunk- | Effect |
|----------|-------|--------|--------|
| Water | 💧 | -15 | Sobers you up fast |
| Coffee | ☕ | -10 | Moderate sobering |
| Food (Taco) | 🌮 | -8 | Absorbs the booze |
| Pizza | 🍕 | -12 | Vegas pizza saves lives |

### Scoring
- **+10 pts** per obstacle successfully dodged
- **+15–25 pts** per power-up collected
- **-3 to -10 pts** per drink hit
- **Distance bonus** at end based on landmarks reached
- **Sobriety bonus** if you finish under 30% drunk

---

## World Design

### The Strip (Linear Path)
The strip is divided into landmark zones. As you pass each one, the name flashes on screen:

1. **Mandalay Bay** (Start) — Easy warmup, few obstacles
2. **Luxor** — Pyramid-themed obstacles appear
3. **Excalibur** — Medieval drink wenches with mead 🍺
4. **MGM Grand** — Party density increases
5. **Bellagio** (Midpoint) — Fountain show = champagne spray zone
6. **Caesars Palace** — Toga party guys with homing drinks
7. **The Venetian** — Gondola-themed wave patterns
8. **Treasure Island** — Pirate rum barrage 🥃
9. **Wynn** — High-roller zone, premium cocktails
10. **Circus Circus** — Chaotic everything everywhere
11. **Stratosphere** (Finish!) — You made it!

### Difficulty Scaling
- Obstacle spawn rate increases with distance
- More homing enemies appear later
- Auto-scroll speed gradually increases
- Power-ups become slightly rarer in later zones

---

## Visual Style

### Isometric Grid
- Diamond-shaped tiles (64×32 px base)
- Road surface: dark asphalt with yellow center stripe
- Sidewalks on edges

### Buildings
- Procedurally placed along both sides of the strip
- Varying heights, neon glow outlines
- Lit windows that flicker
- Each landmark zone has a signature color palette

### Atmosphere
- Night sky with twinkling stars
- Neon glow effects on everything
- Screen effects scale with drunkenness (wobble, vignette, blur, color shift)
- Particle effects on collisions

### Audio (Godot Implementation)
- Upbeat synthwave/retrowave background track
- Coin-collect sound for power-ups
- Glass clink/splash for drink hits
- Crowd ambiance that gets louder in dense zones
- Slurred "wooooo!" when very drunk

---

## Godot Implementation Plan

### Scene Structure
```
Main (Node2D)
├── World (Node2D) — isometric tilemap + buildings
│   ├── TileMap (road/sidewalk)
│   ├── Buildings (Node2D) — procedural building sprites
│   └── Landmarks (Node2D) — zone triggers
├── Entities (YSort/Node2D)
│   ├── Player (CharacterBody2D)
│   ├── Obstacles (Node2D) — pooled obstacle instances
│   └── Powerups (Node2D) — pooled powerup instances
├── Camera2D — follows player with drunk shake
├── UI (CanvasLayer)
│   ├── DrunkMeter (ProgressBar)
│   ├── StripProgress (ProgressBar)
│   ├── ScoreLabel
│   └── LandmarkPopup
├── ParticleManager
└── AudioManager
```

### Key Scripts Needed
1. `player.gd` — Movement, drunk wobble, collision
2. `obstacle.gd` — Movement patterns, type config
3. `powerup.gd` — Bobble animation, collection
4. `game_manager.gd` — State machine, spawning, difficulty
5. `drunk_system.gd` — Drunk level, screen effects
6. `camera_controller.gd` — Follow + drunk shake
7. `ui_manager.gd` — HUD updates, landmark popups
8. `building_generator.gd` — Procedural strip scenery

### Recommended Godot Version
- **Godot 4.x** (GDScript)
- Use `CharacterBody2D` for player
- Use `Area2D` for obstacles/powerups (overlap detection)
- `TileMap` with isometric mode for ground

---

## Future Ideas (V2+)
- 🎰 Slot machine mini-game at each casino (risk/reward)
- 👫 Co-op mode — help your drunk friend
- 🛒 Souvenir shop power-ups (sunglasses = obstacle slow-mo)
- 📱 Mobile touch controls
- 🏆 Leaderboard with fastest/most-sober completions
- 🌅 Day/night cycle (morning = hangover mode)
- 🚕 Uber power-up — skip a landmark zone
