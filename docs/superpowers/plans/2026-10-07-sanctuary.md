# Hollowroot Sanctuary visual update

Approved by the user in chat on 2026-10-07, including the ant bone knight v4 sprite and the previously described compact map, larger character, action animations, smooth art, parallax and minimal HUD.

## Constraints

Execute inline without subagents, commits or dependency changes. Preserve existing staged work and source assets. Keep movement tuning, collision dimensions, server authority, room protocol, fullscreen viewport, centered camera and no-objective exploration. The sword is visual only; no combat was requested.

## Tasks

- [x] 1. Create aligned, locally stored idle/run and traversal animation sheets from the approved sprite. Generate smooth cavern backdrop art. Record prompts, frame rectangles and provenance; preserve concepts.
- [x] 2. Write and run failing route/animation checks. Build a compact connected sanctuary: entrance double-jump ledges, float landing, wall-jump shaft, grapple ascent, upper dash gap, safe return and rest points. Keep physics constants unchanged.
- [x] 3. Implement action-state animation, closer centered camera, smooth cavern terrain and multiple parallax depths. Copy required generated assets into production output. Verify actual sheets and paths.
- [x] 4. Simplify HUD to party, rest and compact ability indicators; keep settings/help, invites, touch controls and accessibility. Use a small dark lobby and menu panel appropriate to the game.
- [x] 5. Run Node tests, build, development-startup/proxy checks and real multiplayer browser coverage for action frames, routes, camera, fullscreen, desktop/touch, input release and reconnect. Inspect a few representative screenshots, self-review, document limitations and stage only task files.

## Execution ledger

Ruling: use the current checkout — the approved prototype and generated sprite are staged here; a new worktree would omit them. Existing index snapshot is saved outside the repository for comparison. No user changes are reset or discarded.

Ruling: review directly in this session and leave staged changes uncommitted — user instructions override skill requirements for subagents and commits.

Ruling: keep the longsword cosmetic — the approved plan is exploration and movement testing; combat would change the agreed scope.

Pre-flight: generated PNG sheets feed inspected per-frame metadata consumed by the renderer; production copying must include the same paths. Shared map is consumed by server, prediction and route/browser tests, so geometry and traversal expectations must change together.

Task 1: complete — three 1536×1024 transparent source sheets (24 poses) and one 1536×1024 opaque cavern image saved under `assets/generated/sanctuary/`; exact prompts, formats, dimensions and hashes recorded. Frame rectangles and foot pivots inspected. A crowded first run sheet was replaced before integration.

Task 2: complete — three animation checks and six route checks observed failing before implementation, then passing. Route tests traverse from the normal spawn with real inputs; enclosing wall and ceiling collision verified. Shared physics and protocol have no changes against the starting index.

Ruling: the new right enclosing wall requires releasing the steering input before settling onto the return ledge, then walking left to the lower corridor — pressing toward the wall intentionally clings. This is proven in the connected route test and explained in the guide. Cost if wrong: adjust the return-ledge layout or movement hint.

Task 3: complete — 400-unit viewport height and a nominal 52-unit character make the knight approximately 13% of screen height. Eight state-specific animations, three parallax depths and smooth collision-aligned scenery integrated. Runtime PNG paths, frame bounds and hashes pass asset tests; production build succeeds.

Ruling: use two-frame jump/fall/dash/cling transitions and four-frame idle/run/float/grapple loops — generated sheets have minor pose variation and are documented as prototype animation. Cost if wrong: additional animation cleanup, without changing traversal physics.

Task 4: complete — compact party/rest/ability HUD, dark lobby, settings actions, help/credits, viewport/touch layout implemented. Initial full browser run passed; desktop, mobile and tether screenshots inspected.

Final review: self-review (user prohibits subagents). Reviewed frame bounds/state priority/loop timing, clipping/pivots, camera offsets/resize, parallax coverage, new geometry and return route, menu input release, missing assets and production paths. Found invite feedback hidden behind the settings modal. Browser regression observed RED, then moved feedback into the active dialog; the complete browser suite passed afterward.

Verification: `npm test` → 30/30; `npm run build` → passed; `npm run test:browser` → passed, including real multiplayer/touch, animation changes, parallax, settings/invite feedback and all routes. Real-time gallery automation intermittently missed a landing; short key taps now await server press/release and approaches brake early with a grounded check. The final complete run passed. Production movement was not changed.

Ruling: preserve the established geometry intervals for the gallery, shaft and six-anchor ascent while reducing the outer map and adding a compact return — existing movement tuning remains approved and the connected paths are proven. Cost if wrong: map layout revision, not a change to the abilities.

Deferred minors: no additional code findings. Generated pose variation and two/four-frame animation limits are explicit prototype limitations, not production-quality animation claims.

Task 5: complete — final tests/build/browser verification recorded in `docs/verification.md`. Staged 23 update files, preserving 46 pre-existing staged files outside this task byte-for-byte against the initial index snapshot. No unstaged changes, commits, subagents or duplicate default-port servers. Stage/check commands succeeded.
