# Vegas Strip Survivor — Illustrated Edition

Open `index.html` in a modern browser; it automatically opens `vegas-neon-redux.html` and serves as the GitHub Pages homepage. No build, package installation, or server is required. Keep both HTML files, `vegas-art.js`, `vegas-music.js`, `vegas-detours.js`, `redesign-ui.css`, `vegas-detours.css`, and the `assets` folder together when copying or sharing the game. Google Fonts are optional; system fonts are used offline.

## Separate 3D edition

`vegas-3d.html` opens the separate 2.5-D edition and loads `vegas-art-3d.js`. The homepage and `vegas-neon-redux.html` keep the original illustrated game. Each edition has its own HTML and art renderer; music, base styles, and artwork assets are shared. The 3D edition uses its own `vegas-detours-3d.js`, plus `vegas-rides.js` and `vegas-rides.css`, and has its own high score and souvenir storage.

The Strip now uses a 2.5-D perspective: converging pavement tiles, stronger lane depth and character scaling, hotel towers with shaded roofs and side walls, raised marquees, dimensional slot cabinets and pickup stands, and directional ground shadows. Characters remain illustrated sprites. Perspective is shared by objects, prompts, scenery, spawning, and visibility checks so gameplay stays aligned as the world scrolls. No new libraries or downloads are required.

Run the tests normally for the original edition, or set `VEGAS_EDITION=3d` to run them against the separate edition. The perspective and attraction checks always exercise the 3D edition.

## Optional attractions (3D edition only)

Look for RIDE entrances along the Strip and press Space nearby (or tap to grab on touch). The Big Apple Coaster stop is around the southern New York–New York/MGM stretch, and the High Roller is farther north near the middle of the Strip. Both are available once per lap; entrances are nudged clear of other fixtures. Locations follow the game’s compressed route.

| Attraction | Fictional game ticket | Effects | Souvenir |
| --- | --- | --- | --- |
| High Roller | $35 | +250 points, −8 drunk, 20 game seconds | Skyline Selfie |
| Big Apple Coaster | $25 | +350 points, −6 water, 12 game seconds. At 60+ drunk: −18 water total and a brief stumble. | Coaster Survivor |

The wheel has a nine-second animated scene; the coaster has a seven-second scene. Ticket effects are settled exactly once at boarding. Watching does not add game time or meter loss. Skip to arrival with the button or Escape; reduced-motion mode shows the arrival immediately. Insufficient funds disable boarding and leave a free exit. Fatal water loss is warned before boarding and resolves after the result is read. Restart and game end discard ride animation state.

Ride art is drawn locally on Canvas. These scenes are stylized attractions, not real ride simulations. Names are inspired by the [High Roller at The LINQ](https://newsroom.caesars.com/Property-Fact-Sheets/The-LINQ-Hotel--Experience/default.aspx) and [The Big Apple Coaster at New York–New York](https://www.mgmresorts.com/en/things-to-do/new-york-new-york/the-big-apple-coaster-and-arcade.html). Prices, timing, and rewards are game balance choices.

The seven-souvenir 3D collection uses vss-3d-souvenirs; existing original souvenirs are copied on first use, without writing back to the original collection.

## Play

- Up / Down or W / S: change sidewalk lane.
- Space: grab, buy, enter slots, or visit a STORY doorway.
- Right / D: sprint. Left / A: slow down.
- E: relief break. P: pause. M: toggle audio.
- Touch: swipe vertically to change lane, tap to grab, double-tap for relief, hold to sprint. Pause and sound buttons are on the HUD.

Collect drinks for points and cash, food to reduce drunkenness, and water to restore hydration. Avoid pedestrians and police. Reach The Strat to bank a bonus and begin a faster lap.

## Music

Choose Vegas Swing (default), Poolside Funk, After Hours Lounge, or Off on the opening screen. The music volume slider is independent of sound effects. During play, the music button cycles styles; M / SOUND toggles all audio. Your style and music volume are remembered locally.

These are original synthesized arrangements in `vegas-music.js`, with an eight-bar chord progression and sixteen-bar melody variations. They work offline without audio files. Music quiets during slots and detours, pauses with the game, and avoids replaying missed beats after a background-tab delay. Automated checks cover scheduling and controls, not perceived audio quality; audition the styles in the browser.

## Nightlife detours

Five STORY doorways appear along each lap. Press Space near one to enter on foot. At 70+ drunk, you can also stumble into the champagne club after the opening stretch, once per lap; this respects a 45-second return cooldown and does not interrupt riding, relief breaks, stagger, or invulnerability.

| Scene | Main choice | Consequences |
| --- | --- | --- |
| The Velvet Room | $100 champagne | +500 points, +12 drunk, −8 hydration, +12 bladder, 12 seconds, Bottle Service souvenir |
| Midnight chapel | $75 ceremony | +350 points, 25 seconds, Just Married souvenir |
| Midnight buffet | $35 plate | +50 points, −28 drunk, +20 hydration, 25 seconds, Buffet Legend souvenir |
| Afterglow pool club | $60 wristband | 10 seconds; 35 seconds of walking with 1.5× drink points and +10 percentage points hazard spawn chance (72% cap); Pool VIP souvenir |
| Casino security | Talk, pay $40, or accept an escort | Talk odds are shown: 85% below 40 drunk, 60% below 70, otherwise 30%. Success gives +125 points and Smooth Talker in 8 seconds. Failure/free escort loses up to 50 points and takes 15 seconds. Paying guarantees a 5-second exit. |

The street, meters, and clock pause while a scene is open. Only the displayed effects are applied on a choice; reading time is free. Meter values clamp to 0–100, score to zero. Fatal drink choices show a warning, then their outcome before the end screen. The club's unaffordable bottle request causes a bouncer exit with a short stumble and 5 seconds lost, without taking money. Other unaffordable paid choices are disabled. Each scene has a free way out; security's free escort has its point/time penalties displayed.

Use the buttons, or Tab then Enter. Escape focuses the free exit without selecting it; on an outcome, Escape continues. Returning provides 2.5 seconds of collision protection. Visits are counted in the end screen. Five souvenirs persist between runs in localStorage (`vss-souvenirs`), while each run tracks its own souvenirs separately.

`vegas-detours.js` contains scene definitions, effects, triggers, return handling and doorway art. `vegas-detours.css` presents the six-panel illustration atlas in `assets/vegas-detours.png`. The built-in image generation prompt is saved in `assets/vegas-detours-prompt.md`.

## Current visual pass


Painted Strip panorama, six-frame tourist walk animation, illustrated cast of eight hazards, zone-named casino fronts, warm slot cabinets, labeled pickups, and curbside scenery drawn behind gameplay. A simplified opening screen puts extra rules in an expandable section. Meters show numeric values. The menus adapt to smaller displays and can scroll when needed.

`vegas-art.js` owns image loading, sprite rectangles and the illustrated rendering helpers. `redesign-ui.css` owns the new presentation. The original Canvas character and skyline routines remain as image-load fallbacks. The legacy `vegas-strip-survivor.html` is unchanged.

The panorama is shared atmosphere across zones; the casino signs change per zone. Pedestrians currently use illustrated poses with subtle movement; only the protagonist has a full walking sheet. The asset prompts and provenance are in `assets/README.md`.

## Gameplay corrections

- Reaching 100 drunk triggers blackout immediately, before metabolism can undo it.
- A drink that removes the last hydration triggers collapse immediately.
- Slots advance run time and last call, and show the countdown in the slot panel.
- Ending/restarting a run cancels outstanding reel callbacks.
- Losing window focus pauses walking and releases held inputs. Canceled touch gestures release sprint.

## Verification

Run `node --test tests/game.test.cjs` with Node.js. The suite uses the actual game scripts with stubbed DOM/Canvas/audio/timers. It verifies survival boundaries, slot time and transactions, abandoned spins, focus/pause behavior, lap rollover, and render-command validity across all zones at four viewport sizes, including reduced-motion and missing-image paths. Detour checks cover all choices, affordability, exactly-once transactions, survival warnings, saved souvenirs, cooldowns, VIP risks/rewards, and keyboard focus handling.

These checks do not prove visual layout, real browser rendering, animation quality, or frame rate. The perspective pass was also rendered to desktop and phone-landscape Canvas images for visual inspection, without the HTML menus/HUD. Live browser verification was blocked by the browser tool's local-file URL policy; a manual playtest is still needed.
