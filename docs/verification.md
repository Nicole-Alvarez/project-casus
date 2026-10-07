# Game verification — 2026-10-07

## Current: dash duration shortened by 50%

Changed horizontal/upward dash duration from **0.18 to 0.09 seconds**. Speed remains 900 world units/second and cooldown remains 0.8 seconds. Invulnerability follows the shorter active dash window; cancellation and repeated wall-dash rules remain intact. The fixed 60 Hz simulation expires the nominal timer on the next tick.

The updated duration/expiry test failed against 0.18, then passed at 0.09. With the reduced reach, the former dash-only bridge approach fell below the next landing. The route now uses a real ground jump followed by dash and float from the normal spawn; all six connected map-route tests pass. Terrain and source artwork are unchanged. README and movement guide now describe the shorter duration and jump-and-dash crossing.

- `npm test`: **44 passed, 0 failed** under bundled Node 24.19.0.
- `npm run build`: **passed**.
- `npm run test:browser`: **passed on rerun**, including Q dash/i-frames, double jump after dash, repeated wall dashes, multiplayer, camera, menus/reconnect and touch controls; no page errors or missing assets. The first run failed the existing assertion **“Float keeps the dash-to-jump test airborne”** because the player was already grounded at that check. A rerun with position diagnostics passed; the exact timing cause of that intermittent harness failure was not established.
- Verified retained PNG hashes against the pre-task baseline and reviewed scoped whitespace/staging. No source sprite changes, dependencies, subagents or commits.

Reproduce from the root with `npm test`, `npm run build` and `npm run test:browser`.

---

## Historical: slower idle, smooth whole-pose playback, display size and repeat wall dash

Implemented the approved bounded update inline. All **14 retained PNGs**, including every one of the **12 sprite sheets**, match their pre-task SHA-256 hashes. Source rectangles and generated drawings are unchanged.

Idle now advances at **3 fps** (four drawings over 1.33 seconds); movement remains **8 fps**. Adjacent drawings ease over 70 ms, action changes over 120 ms, and interrupted changes continue from the displayed mix. Head alignment and display magnification interpolate with the poses. Premultiplied additive compositing blends complete drawings and composites them onto the world once; no separate body parts or shape warping. This provides smooth whole-image blending, not true shape morphing.

Per-character float enlargement uses mean idle height as its reference; horizontal dash targets 90% of that height, capped at 1.35×. Actual multipliers:

| Character | Float | Horizontal dash |
| --- | --- | --- |
| Beetle | 1.162× | 1.322× |
| Moth | 1× | 1.149× |
| Ant | 1× | 1.095× |
| Guardian | 1.326× | 1.35× |

Moth/ant float silhouettes already exceed idle height. Compact horizontal dash poses retain their stance and may remain shorter than upright idle. Magnification eases when entering/leaving these actions.

Wall contact now permits another upward dash after the existing **0.8-second cooldown**, even when the ordinary air-dash budget is spent. Each activation requires releasing and pressing Q again. Open-air dash restrictions, wall jumps, double jumps, collision cancellation and the active **0.18-second i-frames** remain enforced. The HUD reports wall-dash readiness as a boolean.

Confirmed with bundled Node **24.19.0**:

- New timing/scale/transition and repeat-wall-dash tests failed before implementation, then passed. Tests cover both wall sides, cooldown, held-key suppression, no extra dash after leaving the wall, interrupted blends, normalized weights and loop continuity.
- `npm test`: **44 passed, 0 failed**.
- `npm run build`: **passed**.
- `npm run test:browser`: **passed**, including slower idle, enlarged guardian float, complete-pose blends and a second real keyboard wall dash without landing/jumping away. Existing multiplayer selection/storage/reconnect, movement routes, camera, fullscreen, menus, Q binding and touch checks pass; no browser errors or missing assets.
- Actual renderer audit at `test-results/smooth-animation-audit.png` inspected across all four characters. Twenty real Canvas samples across idle→run transitions retained opaque face pixels (alpha ≥250); no page errors. In-game float screenshot also retained by browser checks.
- Final source-image hashes, asset inventory and scoped whitespace review pass. Existing staged work and default dev listeners are preserved. No new dependencies, subagents or commits.

Reproduce with `npm test`, `npm run build` and `npm run test:browser` from the root. For manual verification, change characters in settings, float and dash, then hold against a wall and release/repress Q after cooldown. Smoothness remains a visual judgment; these checks establish timing, continuity, opacity, scale bounds and authoritative movement behavior.

---

## Historical: four selectable whole-character sprite animations

Implemented the approved A/B/C/D selection directly: Lantern beetle, Crescent moth, Thorn ant and Pebble guardian. Lobby/settings selectors share a saved browser preference. Join and live appearance messages validate supported IDs on the server; snapshots show the choice to peers. Appearance changes preserve position and ability state. Respawn/reconnect preserve the choice.

Generated twelve transparent source sheets with the built-in image-generation tool, referencing the approved four-character concept. Each character has four full drawings for each of ten movement states (40 poses per character, 160 total). Frames advance every 125 ms (8 fps). Playback draws a complete pose with facing mirroring; no body-part assembly, joint animation, cloth deformation or crossfade. Jump and dash hold their final frame; the 0.18-second dash normally consumes only its first two drawings.

Inspected the actual renderer's forty-action contact sheet at `test-results/whole-sprite-audit.png` and the in-game balloon float screenshot. The first measurement included antennae and missed face regions split by ink seams, causing inconsistent apparent scale. Corrected the inspection masks and rechecked the full poses. Frame metadata normalizes measured face span to 20 world units and aligns dark foot/body anchors. Pose angles, cape shapes and antennae still change the silhouette. Runtime connected-alpha extraction removes unrelated atlas tips/low-alpha residue; source PNG bytes are unchanged. Exact prompts accompany every sheet.

Removed exactly **291 obsolete asset files (26,449,311 bytes)**, including older concepts/rig/sheets, downloaded packs, archives and unused sounds. Retained the approved reference, twelve new sheets/prompts, cavern background, two Kenney sound effects and original license. Removed the obsolete archive extraction script; replacement measurement/inventory scripts do not edit PNGs.

Confirmed with bundled Node **24.19.0**:

- `npm test`: **39 passed, 0 failed**, covering playback timing, protocol validation, identical physics across characters, real peer appearance changes, source bounds/hashes, routes and isolated dev startup.
- `npm run build`: **passed**.
- `npm run test:browser`: **passed** in installed headless Chrome. Two actual clients verify all four selectors, live peer choices, saved reconnect choice, whole-pose animation, Q dash/X unbound, double jump, float, wall dash/jump, aerial refresh, routes, parallax, camera placement, menus, fullscreen and touch controls. No page errors or missing assets.
- Independently compared the built asset tree to the filtered source manifest: **13 PNGs, 2 OGGs, 1 license and the manifest**; no obsolete or source-only files.
- Reviewed task changes and whitespace. Existing staged work and default dev listeners preserved. No subagents, new dependencies or commits.

Reproduce from the root with `npm test`, `npm run build` and `npm run test:browser`. Source measurements can be regenerated with `python3 scripts/inspect-sprites.py` (Pillow), then visually checked before acceptance. Refresh inventory with `node scripts/update-asset-manifest.mjs`. Public hosting/load testing remains outside this verification.

---

## Historical: continuous sprite animation, consistent float size and Q dash

The sprite audit found whole-body pose holds/crossfades and inconsistent source dimensions. Earlier float crops rendered 79–100 world units tall compared with idle's 55.28; inspected helmet components also varied. Replaced runtime full-body playback with a generated parts atlas using the approved ant knight as its reference. The source PNG is preserved unchanged, with its exact prompt, inspected rectangles and SHA-256 recorded under `assets/generated/sanctuary/`. Previous artwork is preserved.

Every action now draws the same helmet (28 units), torso (14 units) and limb parts. Joint transforms and the cloth-textured cape move continuously; action changes interpolate one set of transforms over 120 ms. Idle breathes over 2.4 seconds. Double jump spreads/flaps the cape, while float unfurls once over 450 ms and holds a compact balloon outline. Cape bounds are checked before body rotation: no wider than 42 units and no higher than 54 above the feet. This is procedural cutout animation, not a new hand-drawn frame sequence.

Q replaces X in keyboard input, the HUD, movement guide and accessible controls. Touch dash remains supported. Physics, the 0.18-second dash i-frames, wall/aerial ability rules and camera placement are unchanged.

- Continuous-motion, transition-endpoint, part-dimension and cape-envelope tests failed before implementation, then passed. The browser's Q-HUD assertion also failed against the earlier build.
- `npm test`: **38 passed, 0 failed** under bundled Node 24.19.0.
- `npm run build`: **passed**.
- `npm run test:browser`: **passed** with actual keyboard Q dash, X unbound, float unfurl completion/fixed helmet dimensions, upward wall dash, outward wall jump, double jump and air dash, remote states, multiplayer, parallax, menus/reconnect, fullscreen/camera framing and touch controls. No browser errors or missing assets.
- Visually inspected the actual renderer's eight-action contact sheet (`test-results/knight-rig-audit.png`) and the in-game float screenshot (`test-results/exploration-balloon-float.png`). The same body parts are visible across poses; the balloon cape stays close to the helmet instead of enlarging the whole drawing. Screenshots are ignored verification artifacts.

Reproduce from the root with `npm test`, `npm run build` and `npm run test:browser`. Reviewed the task diff and whitespace checks. Existing staged work and dev listeners are preserved. No subagents, new dependencies or commits.

---

## Historical: player 40% above the bottom and outward wall jumps

Implemented the approved adjustment directly. The player's center now targets 60% down the viewport, leaving 40% below it. Horizontal centering, 1.4× zoom and camera smoothing are preserved.

Wall jumps launch away on either side even when holding toward the wall, and refresh one air jump and one air dash. The existing 0.8-second dash cooldown remains enforced. During the short wall-launch steering lock, an air dash follows the launch direction so it does not immediately send the player back into the wall. Dashing while holding against a wall still launches upward, with the existing 0.18-second i-frames and swept collision checks.

- New wall-launch and ability-refresh tests failed before implementation, then passed. Tests use actual physics and input sequences, including spending an air dash before clinging, wall jumping, double jumping and dashing during the launch lock on both sides. A separate test proves wall jumping does not bypass cooldown.
- `npm test`: **37 passed, 0 failed** under bundled Node 24.19.0. All six route tests pass; the rootshaft route now exercises an upward dash and alternating outward wall jumps from the normal spawn.
- `npm run build`: **passed**.
- `npm run test:browser`: **passed** against the built game in installed headless Chrome. Actual keys verify upward wall dash → air jump → return to cling → outward wall jump → double jump → air dash, including authoritative ability availability. Camera placement is checked at rest and after traversal, reconnect, world-edge movement, desktop resize and mobile portrait/landscape. Multiplayer, remote poses, menus, touch, fullscreen and no-scroll checks pass, with no browser errors or missing assets.

The README and movement guide describe the updated controls. Reproduce with `npm test`, `npm run build` and `npm run test:browser` from the root. Reviewed the scoped diff and whitespace checks. No subagents, commits, new dependencies or asset changes.

---

## Historical: player 30% above the bottom

Implemented the approved camera placement: the player's collision-box center targets 70% of viewport height, leaving 30% below it. Horizontal centering, 1.4× zoom and exponential camera smoothing remain unchanged. The camera remains unclamped at world edges so the framing is preserved.

The camera-anchor test failed against the old centered behavior, then passed after adding an optional viewport anchor and using `.7` for the renderer's vertical target. `npm test`: **35 passed, 0 failed**; `npm run build`: **passed**; `npm run test:browser`: **passed**. The real browser checks verify horizontal centering and the new vertical placement within two logical units after settling, including gallery traversal, the left world edge, reconnect, desktop resizing and mobile portrait/landscape. Existing movement, multiplayer, fullscreen and no-scroll checks also pass.

Reproduce from the root with `npm test`, `npm run build` and `npm run test:browser`. Reviewed the scoped diff and whitespace checks. No subagents, dependencies, new assets or commits.

---

## Historical: cape animations, wall traversal and camera refinement

Implemented the user's approved bounded design directly, without subagents, commits or dependency changes.

- Idle advances at three source poses per second, down from eight: its four-pose cycle now lasts 1.33 seconds instead of 0.5 seconds. Adjacent poses use brief eased blends; action changes fade over 80 ms. Isolated additive compositing preserves the opacity of overlapping pixels. Pose alignment was adjusted after visual review showed ghosting.
- A new original transparent sheet contains four cape-spreading/flapping double-jump poses, four float-unfurl poses and four inflated-cloak poses. Float plays its opening once before looping the balloon shape. Player labels sit above the cape. The previous art remains preserved. Exact prompt and source notes: `assets/generated/sanctuary/characters/cape-jump-float-v2.md`; dimensions and SHA-256: `manifest.json`.
- Holding toward a wall and jumping launches upward without horizontal displacement; steering away still jumps outward with a short steering lock. Holding toward a wall and dashing launches upward, including during ascent. Swept collisions stop it at ceilings. Dash retains its 0.18-second invulnerability, 0.8-second cooldown and one-air-dash budget. Every accepted dash restores one air jump, usable to interrupt the dash.
- Camera zoom is exactly 1.4× the previous view: logical height is `400 / 1.4`, and the nominal 52-unit character occupies 18.2% of viewport height. The camera remains centered in both axes; fullscreen and no-scroll behavior are preserved.
- `npm test`: **35 passed, 0 failed** under bundled Node 24.19.0. New behavioral tests failed before implementation and pass now. Covers upward jumps on either wall, vertical dash/i-frames/ceiling collision, dash restoring a spent air jump, action selection, slower timing, eased blending and float introduction/loop behavior. All six exploration-route tests, actual socket tests, asset hashes and isolated dev startup pass.
- `npm run build`: **passed**. The new cape sheet is copied into the production assets.
- `npm run test:browser`: **passed** against the built game in installed headless Chrome. Actual desktop keys, multiplayer peer poses and mobile touch controls verify zoom, cape double jump, balloon float, upward wall jump/dash, an air jump after horizontal dash and during wall dash, parallax, centered camera, routes, menus/focus/reconnect, fullscreen and resize. No browser errors or missing assets observed.
- Visually inspected the generated sheet and balloon-float screenshot in ignored `test-results/`. A browser assertion initially missed a transient dash, and another checked dash height too early. The harness now records actual rendered peer states with a MutationObserver and waits for upward travel. The dash-to-jump scenario waits for the first jump apex, floats through the dash, and dashes away from the gallery to keep the intended test airborne.
- The existing development server on 5173 returns `CAMERA_ZOOM=1.4` and HTTP 200 for the new cape sheet. Existing listeners were preserved; verification servers cleaned up. Syntax and whitespace checks pass.

Reproduce from the root: `npm test`, `npm run build`, `npm run test:browser`. Try holding toward a wall + Space or X, jumping during an air dash, and holding Shift while falling. The movement guide and README document the updated controls.

These remain generated prototype pose animations with some frame variation, rather than a hand-animated production sequence. Sword combat, damage sources, internet-latency/load testing and public hosting remain outside this exploration update. Review was performed by the author directly.

---

## Historical: initial Hollowroot Sanctuary redesign

Implemented the approved ant knight and compact cavern redesign inline. No subagents, commits, new dependencies or changes to shared movement tuning, collision dimensions, network protocol or server authority.

- `npm test`: **30 passed, 0 failed** under bundled Node 24.19.0. Covers eight animation states and loop/transition timing, generated frame bounds/hashes, preserved archive hashes, deterministic traversal, walls/ceiling, actual sockets and isolated-port dev startup.
- `npm run build`: **passed**; all three character sheets and the cavern PNG are included under `frontend/dist/game-assets/generated/sanctuary/`.
- `npm run test:browser`: **passed** against the built game in installed headless Chrome. Two desktop sessions and a touch session exercise actual server state and keyboard/pointer controls. Verified nominal character size (52 of 400 logical vertical units), state/frame changes, remote dash poses, three parallax rates, all traversal abilities, centered X/Y camera, viewport/no-scroll/fullscreen, settings/invite feedback, help/credits, focus release, reconnect, resize and leaving. No browser exceptions or missing assets observed.
- Six route tests start from the normal spawn and prove gallery double jump, float crossing, wall-jump ascent, six-anchor climb, upper dash transfer, safe return, and enclosing walls/ceiling. The return requires releasing the right wall before stepping left from its ledge, as explained in the guide.
- Reviewed desktop lobby, mobile gameplay and desktop tether screenshots in ignored `test-results/`. The closer camera keeps the sprite readable; touch controls and HUD fit the viewport.
- The user's existing 5173 development server serves the new page and character sheet. No duplicate default-port instance was started; verification listeners cleaned up.

Self-review found invite feedback behind the settings dialog. A real browser assertion failed before the fix and passed after moving feedback into the active dialog. An intermittent gallery landing miss occurred in real-time keyboard automation; the helper now acknowledges server press/release state, brakes earlier and verifies a grounded approach. The final complete run passed. No gameplay tuning was changed to accommodate tests.

Artwork: three original transparent sheets, 24 distinct poses, eight animation states, and one opaque cavern image. Exact prompts, formats, dimensions and SHA-256 hashes are in `assets/generated/sanctuary/`; inspected source rectangles, pivots and rates are in `frontend/src/assets.mjs`. All source images and previous concepts remain available. These are two/four-frame prototype animations with minor generated-frame variation; the sword is cosmetic. Generated art is not claimed to carry a third-party CC0 license.

Reproduce from the root: `npm test`, `npm run build`, `npm run test:browser`, then `npm run dev`. For manual traversal: gallery steps → silk ascent → quiet sanctuary; try the shaft, dash bridge and float landing, then use the right return ledge to rejoin the lower corridor. Open ☰ for invites/sound/credits/leaving.

Public hosting, sustained load/internet latency and persistence remain unverified. Dash i-frames are tested through authoritative state and shared damage eligibility; this exploration map has no damage sources. Review was performed by the author directly, as requested.

---

## Historical: previous woodland implementation

The following record is retained for the earlier Willowmere prototype; the current implementation and results are above.

Implemented and reviewed directly in this session with no subagents, commits or dependency changes. The starting working tree/index were clean at the user's `1f9c5d7` first commit. The earlier coin-platformer verification is historical; the results below apply to the current exploration game.

## Confirmed results

- Runtime: bundled **Node 24.19.0**. The documented minimum remains Node 22.12+; the user's 22.19.0 satisfies it. This run does not claim a separate execution under Node 22.
- `npm test`: **26 passed, 0 failed**. Covers real traversal physics, route reachability, protocol validation, live sockets, room isolation/capacity/cleanup, origin/payload boundaries, source archives and asset dimensions, and combined dev startup on separately selected ports.
- `npm run build`: **passed**. Categorized runtime assets are copied to the production build; source download archives are excluded.
- `npm run test:browser`: **passed** against the built game with installed macOS Google Chrome in headless mode. Two isolated desktop sessions and a third touch session exercised actual multiplayer and server state. No browser exceptions or missing HTTP assets were observed.
- Browser coverage: full viewport/no horizontal or vertical page scroll; stable centered X/Y camera including the left world edge; desktop/mobile and portrait/landscape resizing; actual browser fullscreen entry/exit; keyboard double jump, float, dash, grapple and wall cling/jump; remote dash/tether presentation; lantern activation and R return; menu/blur release and held-key repeat suppression; reconnect; credits; touch walking/jump/float/dash and all touch buttons present; leaving.
- Asset verification: every one of the **269 categorized manifest paths** exists; all four original ZIP hashes match the manifest. The four warrior atlases fit the inspected 192-pixel, six-column animation metadata; all scrolling planes have their expected 2048 × 1546 dimensions.
- Desktop lobby and mobile gameplay screenshots were visually inspected, together with a desktop tether view. Files are ignored under `test-results/exploration-lobby.png`, `exploration-grapple.png`, `exploration-multiplayer.png` and `exploration-mobile.png`.
- Existing listeners on 3001/5173 were preserved. Verification listeners cleaned up; no second default-port preview was started.
- Dependencies/package lock are unchanged. No new dependency audit was needed for this update; the initial game's recorded audit reported zero vulnerabilities.

## Route and review evidence

Five deterministic route tests start at the normal spawn and use control inputs without injecting intermediate positions. They prove the canopy needs the second jump, float reaches the Windfall recovery shelf while ordinary falling misses it, alternating wall jumps climb the Root chimney, anchor chaining reaches the treetop followed by dash/float descent, and a dash crosses the Bough passage where walking drops below the landing.

Review found and corrected a sealed chimney crown, an upper anchor whose center line cleared a branch but the player's body did not, automatic reselection of an arrived anchor, zero-height mobile control layout, incomplete background coverage, ground dash losing support contact, and key repeats potentially resuming movement after menu/blur/reconnect. In-range obstructed anchor selection/detachment and collision against a two-unit-thick solid have explicit tests. Collision uses swept axis contacts rather than distance-dependent substeps.

Dash i-frames are observed by a second actual socket client. Shared tests check the active/expired/cancelled damage-eligibility policy, cooldown, one-air-dash restriction and wall cancellation. The first map has no damage sources; enemy/hazard interactions are not claimed or tested. The nominal 0.18-second window advances on the fixed 60 Hz simulation clock.

Free-asset license evidence comes from the primary author pages: [Pixel Frog](https://pixelfrog-assets.itch.io/tiny-swords) specifically labels upload 9428013 as the old CC0 version; [RavenTale](https://raventale.itch.io/parallax-background) explicitly marks the elements CC0. The newer Tiny Swords Free Pack was not downloaded. Neither selected new archive contains a standalone license document, so `licenses/SOURCE.md` clearly records the published designation instead.

## Reproduce

From the repository root with Node 22.12+ or Node 24:

```sh
npm ci
npm test
npm run build
npm run test:browser
npm run dev
```

If a dev instance already owns 3001/5173, reuse it or run `PORT=3002 FRONTEND_PORT=5174 npm run dev`. Tests pick independent local ports automatically. Playwright uses installed macOS Chrome; otherwise run `npx playwright install chromium`.

For manual play, join the same code in two sessions. Use A/D to approach Canopy steps, jump again near the first jump's apex, and follow highlighted silk anchors upward with E. Release/repress to chain. Use Shift for the glade, press into a descending wall and jump away in the chimney, and X for the branch transfer. R returns to the latest lantern. Check Trail notes, keyboard release after menus/focus loss, mobile controls and the fullscreen button.

Public deployment, internet-latency/load behavior and persistent progress were not verified. Rooms are in memory; reconnect creates a fresh player and server restarts reset state. Actual browser fullscreen availability depends on the browser/device; the normal layout fills the viewport without it.
