# First-map Exploration Implementation Plan

> **Execution:** Use superpowers:executing-plans directly in this session. User instructions prohibit subagents, delegation, commits, and modifications to unrelated staged changes. Steps use checkboxes for tracking.

**Goal:** Replace the coin platformer with a fullscreen chibi woodland exploration map supporting double jump, float, cling/wall jump, grapple, and dash with i-frames.

**Architecture:** Extend the existing deterministic shared simulation and authoritative WebSocket rooms. The Canvas frontend predicts local movement and renders interpolated party members; the server owns traversal state. Assets remain local and categorized.

**Tech Stack:** Existing Node 22.12+ / bundled Node 24, Vite 8.3.3, ws 8.22.0, and Playwright. No new game engine or production dependency is required.

**Spec:** ../specs/2026-10-07-exploration-design.md

## Global Constraints

- No coins, collection goals, finish objective, combat, enemies, or damage hazards in the first map.
- Full browser viewport; no surrounding scrollable page; camera tracks the player's visual center in both axes.
- All five traversal abilities are available immediately; dash i-frames are authoritative and end on expiry/cancellation/collision.
- New art must be verified free, chibi, locally downloaded, categorized, and recorded with license/source/hash information.
- Preserve rooms, eight-player capacity, origin/input/payload limits, invite links, reconnects, and separate frontend/backend folders.
- Execute inline, review directly, stage this update without unstaging previous work, and leave all changes uncommitted.

## Review Focus

- Dash/grapple at a thin wall must stop without tunneling; high-speed traversal cannot grant permanent invulnerability.
- Held keys, menu opening, blur, reconnect, and respawn must release/cancel transient abilities consistently.
- Floating across a gap and climbing through a checkpoint must use actual geometry rather than X-only activation.
- Fullscreen/resizing/mobile aspect ratios must preserve centered X/Y tracking and parallax coverage without page overflow.
- An existing user dev server must be preserved; startup tests use separately selected local ports.

## Files and interfaces

- `shared/geometry.mjs`: rectangle overlap, line-of-sight segment tests, collision-safe motion helpers.
- `shared/level.mjs`: `LEVEL` geometry, rest locations, fixed grapple anchors, route landmarks; no coins/finish.
- `shared/physics.mjs`: `createPlayer(id,name,slot)`, `stepPlayer(player,input,dt)`, `respawn(player)`, `createRoom(code)`, `stepRoom(room,dt)`, `roomSnapshot(room)`, `cameraTarget(center,viewportSize)`, `selectGrappleAnchor(player)`, `canTakeDamage(player)`.
- `shared/protocol.mjs`: `parseMessage(raw)` accepts only validated joins and boolean movement inputs.
- `frontend/src/assets.mjs`: verified local sprite/background metadata, `loadSprites()`, `characterPath(slot)`, and sound loading without coin playback.
- `frontend/src/input.mjs`: `Input.read()` produces the shared neutral-input shape for keyboard/touch controls.
- `frontend/src/renderer.mjs`: centered two-axis view, categorized chibi sprite animations, local parallax layers, traversal effects, rest markers, and party minimap.
- `frontend/src/main.mjs`, `frontend/index.html`, `frontend/src/style.css`: overlay lobby/HUD/help/settings, fullscreen controls, no scrolling or objective UI.
- `scripts/organize-assets.py`, `assets/manifest.json`, `assets/README.md`, `frontend/vite.config.mjs`: preserve old sources, organize verified new packs, route/copy runtime files.
- `scripts/dev.mjs`, `tests/dev.test.mjs`: configurable local ports so verification cannot disrupt the user's default-port server.
- `tests/physics.test.mjs`, `tests/server.test.mjs`, `tests/browser.mjs`, `tests/routes.test.mjs`: meaningful actual-physics/socket/browser coverage.
- `README.md`, `docs/verification.md`, and a progress ledger: controls, scope, reproducible verification, and results.

## Task 1: Traversal physics, input validation, and dash invulnerability

**Interfaces:** Input fields are booleans `left,right,jump,respawn,float,grapple,dash`. Player snapshots expose `airJumpAvailable,wallSide,wallLock,floatActive,grappleId,dashTime,dashCooldown,airDashAvailable,invulnerable` plus existing position/velocity/name/slot. `canTakeDamage(player)` returns false only during an active dash. `selectGrappleAnchor(player)` returns a verified level anchor or null. This task also introduces the real `LEVEL` geometry/anchors/rest locations consumed by those tests; Task 2 proves and tunes its complete routes.

- [x] Write failing shared-physics/protocol tests for a second jump and a rejected third jump; held-key prevention; float descent at or below 110; cling/detach/wall-jump steering lock; grapple range/obstruction/release/arrival/collision; dash edge/duration/cooldown/air limit; invulnerability active/expired/cancelled and damage eligibility; and clearing all transient state on respawn. Tests use the real level and actual players rather than mocks.
- [x] Run `node --test tests/physics.test.mjs` and observe failures for missing abilities before implementing them.
- [x] Introduce the real 5600-by-2600 exploration geometry with ground at y=2200, spawn near x=900, shelves toward y=600, root walls, clear anchors, and rest locations for each named route. Implement collision helpers, shared traversal state transitions, anchor selection, and extended input validation. Use spec tuning: walk 300, gravity 1550, jump -620/-570, float terminal 110, wall jump horizontal 420 with 0.16 seconds of steering lock, grapple range 420/pull 750, dash speed 900/duration 0.18/cooldown 0.8. Subdivide high-speed movement to avoid crossing thin solids. Invulnerability is derived from active dash time, never from a client-supplied flag.
- [x] Run the physics/protocol tests and confirm every new behavior passes; keep landing, world bounds, walking, and respawn regressions covered.

## Task 2: A traversal-focused exploration map and multiplayer state

**Interfaces:** `LEVEL` contains `width,height,platforms,checkpoints,anchors,routes` and no active `coins`/`finish`. Each checkpoint has `id,name,x,y`; each anchor has `id,x,y`; routes name the spec's canopy steps, windfall glade, root chimney, silk crossing, bough passage, and treetop loop. Room snapshots contain players/tick only, with no coin/completion fields.

- [x] Replace coin/finish tests with failing exploration tests: proximity in both axes activates rests; room snapshots omit objective fields; each ability route is traversable; double jump exceeds single-jump reach; float improves the designated crossing; clinging/wall jumps climb the chimney; and grapple/dash transfers respect collision geometry.
- [x] Run `node --test tests/routes.test.mjs tests/server.test.mjs` and confirm failures for the missing exploration map/state.
- [x] Tune Task 1's real route coordinates against its physics, record the final geometry in level data, and prove a connected upper loop through control-input recipes without injecting intermediate positions. Retain generous landing surfaces, safe lower recovery paths, and rests at branch transitions.
- [x] Remove coin/finish simulation and update room snapshots/network tests for the new input/state shape. Extend live two-client tests to observe server dash/invulnerability transitions and traversal state remotely. Retain invalid/oversized message, room isolation/capacity, cleanup, and origin tests.
- [x] Make development ports configurable via `PORT` and `FRONTEND_PORT`, update the Vite proxy target consistently, and have the dev regression test select unused ports. Do not stop or replace an existing user server to run tests.
- [x] Run all Node tests for the shared, server, and development changes; fix unreachable routes or protocol mismatches before rendering them.

## Task 3: Verified chibi assets and actual parallax layers

**Interfaces:** Asset metadata specifies actual atlas paths, inspected frame dimensions/animation rows, and ordered parallax layers. The manifest records every original-to-categorized mapping plus author/license/source/archive hashes.

- [x] Retrieve the author's specifically labeled old CC0 Tiny Swords archive and RavenTale's CC0 parallax archive. Inspect their included files/licenses and actual image dimensions before selecting runtime paths. If an official download cannot be recovered or licensing is unverified, select another verified free source and document the reason before proceeding.
- [x] Organize selected chibi humanoid animation sheets and suitable terrain/props by pack/type; organize the downloaded parallax layers separately. Preserve source archives/licenses and the existing Kenney library. Extend the organization script without losing old manifest entries.
- [x] Update local development routing and production copying for the new packs. Load actual idle/walk frames and aerial traversal presentation; stop loading/playing coin assets in gameplay. Do not invent missing jump animations; use available frames plus clearly implemented movement effects when the pack lacks them.
- [x] Verify every runtime path resolves, inspect a small character/layer sample, validate archive hashes, and build once to check production asset copying.

## Task 4: Fullscreen frontend, centered camera, and all controls

**Interfaces:** `Renderer.draw(state,time,dt)` consumes local/player traversal state. Camera targets are the local player's rendered center minus half the viewport dimension on both axes, including visual reconciliation offsets. Canvas telemetry reports camera/player X/Y and active traversal state for browser verification.

- [x] Extend failing browser checks for no coin/finish UI, full-viewport Canvas, no page scroll at desktop/mobile sizes, centered camera in both axes after stabilization, double jump/float/dash inputs, grapple/cling presentation, remote ability state, rest/respawn, menu/blur release, and corresponding touch controls. Use actual browser sessions and server state.
- [x] Run the browser test against the built old frontend and observe failures for the new fullscreen/traversal expectations.
- [x] Replace the surrounding landing page with full-viewport Canvas and overlay lobby/HUD/help/settings. Show the map/rest location, actual room presence, ability availability, invite/sound/leave controls, and optional browser-fullscreen button. Use A/D/arrows, Space/W/up, Shift float, E grapple, X dash, R respawn, and touch buttons. Opening a menu releases controls and pauses local input, not the shared server.
- [x] Implement centered X/Y smoothing, visible grapple anchors/tethers, dash trails, float/cling state presentation, and parallax with distinct horizontal/vertical rates and sufficient overscan or looping to cover world edges. Draw using actual downloaded character/layer metadata; preserve multiplayer interpolation and reconnect behavior.
- [x] Run the production build and actual browser checks. Inspect one desktop and one mobile screenshot for character proportions, traversal readability, parallax coverage, UI legibility, and page overflow.

## Task 5: Review, final verification, documentation, and staging

- [x] Review the complete update directly against the spec. Check multi-ability state priorities, thin-wall collision, i-frame cancellation, missing asset handling, checkpoint activation, input release/reconciliation, viewport resize, and removal of all active collection/completion UI.
- [x] Run `npm test`, `npm run build`, and `npm run test:browser` using Node 22.12+ or bundled Node 24. Inspect outputs and report actual results. A dependency audit is needed only if dependencies change; no new production dependencies are planned.
- [x] Update README with new controls, exploration-only first-map scope, dash invulnerability boundaries, asset sources, and port settings. Update verification results and plan checkboxes only after their checks pass.
- [x] Stage only changed/new files for this update, preserving the previous index contents and unrelated user work. Check the staged diff and whitespace, excluding unmodified original third-party license formatting where necessary.
- [x] Report what was staged, validation results, material limitations, and recommended commit message: `feat: add fullscreen chibi exploration and traversal abilities`. Do not commit, push, or leave a second preview process occupying the user's development ports.
