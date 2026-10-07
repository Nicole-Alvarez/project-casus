# Mosslight first-map exploration update

## Approved direction and scope

The user requested a MapleStory-inspired chibi look, the traversal abilities double jump, float, cling, and grapple, upward platform routes, updated free assets and parallax, a fullscreen game without page scrolling, and a camera centered on the player. The follow-up changes the first map to exploration: remove coins and collection goals. Preserve the existing cooperative multiplayer and separate frontend/backend directories. Work directly in this session, without subagents or commits, preserving the already-staged first version.

The subsequent approval also includes the proposed dash with i-frames. Add horizontal dash on X, with server-tracked invulnerability during the active dash. This first exploration map has no enemies or damage hazards, so verify the invulnerability window and damage-eligibility rule directly; do not claim an untested enemy interaction.

## Player experience

A colorful fantasy woodland fills the browser viewport. A compact overlay HUD shows the map name, connection state, party, and movement hints. The room/name entry is an overlay on the game, with help, invite, sound, leave, and optional browser-fullscreen controls. There is no surrounding scrollable landing page, coin counter, collection progress, finish flag, completion screen, combat, or timer. Players explore at their own pace.

The first map is a connected woodland with a broad ground route, ascending ledges, tall walls for clinging/wall jumps, and visible silk anchors for grappling. Checkpoints are rest locations rather than objectives. Falling or pressing R respawns at the last visited rest location. Checkpoint activation requires proximity in both axes; flying over a checkpoint cannot activate it accidentally. The map remains in-memory and shared by each existing room.

### Routes designed around the abilities

The ground route provides orientation and a safe return path. The vertical branches are the exploration content, not merely scenery above a walkable corridor. Include these distinct traversable sections in the first map:

- **Canopy steps — double jump:** ascending ledges rise beyond the tested single-jump envelope but remain within the double-jump envelope. Place generous landing surfaces where players can reset their air jump.
- **Windfall glade — float:** a clearly visible lower landing across a broad opening rewards controlled descent from a high ledge. Give enough height and horizontal distance to visibly benefit from floating rather than treating float as an unused input.
- **Root chimney — cling and wall jump:** opposing solid walls and intermediate shelves let players cling, assess their next move, and climb by alternating wall jumps. Keep landing shelves close enough that a missed jump has a recoverable lower route.
- **Silk crossing — grapple:** clearly visible anchors cross a broken canopy and lead into an upper branch. Check their range, line of sight, and collision clearance against the actual pull simulation; grapple targets cannot be hidden behind terrain.
- **Treetop loop — combined traversal:** a connected upper loop links a double-jump ascent, a grapple transfer, and a floating descent back toward a rest area. Players can return to the ground route without completing an objective or collecting anything.
- **Bough passage — dash:** a short open transfer between safe shelves provides a clear place to dash, with enough clearance to show its horizontal burst and a wall beyond it to verify that dash does not pass through solid terrain. Include dash in the combined loop without introducing damage hazards merely to demonstrate i-frames.

Tune the gaps against the implemented movement physics rather than assumed jump distances. Every special must have at least one meaningful route, and the tests must demonstrate both the individual sections and a combined upper loop using control inputs rather than injected positions. Include readable landmarks and rest areas at transitions so the abilities serve exploration rather than a compulsory linear obstacle course.

## Traversal and input

Controls retain A/D or arrows for walking and Space/W/up for jumping. All five abilities are available immediately.

- **Double jump:** a new jump press performs a ground jump, then one air jump. Holding the key cannot trigger repeated jumps. Landing resets the air jump; walking off a ledge leaves one air jump available.
- **Float:** hold Shift while falling to reduce descent speed; release to restore normal gravity. Float does not lift the player and does not replace the double jump input.
- **Cling:** while airborne and descending, hold toward a solid wall to stop the fall. Releasing away detaches. Pressing jump while clinging launches away from the wall, with a short steering lock so the held direction cannot cancel the wall jump immediately. Wall contact restores one air jump.
- **Grapple:** hold E to attach to a highlighted eligible fixed anchor within range and pull toward it. Release E to detach. The shared simulation chooses the target; players cannot submit positions or arbitrary anchor coordinates. A jump can cancel the grapple. Anchors obstructed by solid geometry are ineligible. Pulling respects collision, detaches on collision/arrival, and cannot teleport through walls. A fresh E press is required before reattaching after arrival.
- **Dash:** press X for a 0.18-second horizontal burst at 900 world units/s, using held horizontal direction or facing. Invulnerability lasts only while the dash is active and ends immediately on cancellation or collision. A 0.8-second cooldown and one air dash per landing prevent repetition; held X does not retrigger. Dash cancels a grapple and suspends float/cling during the burst, but never bypasses solid terrain or out-of-bounds respawn. Landing resets air-dash availability without skipping the cooldown. Respawn clears active dash/invulnerability.
- **Touch:** movement, jump, float, grapple, and dash have corresponding on-screen controls. Blur, menus, disconnection, and visibility changes release every held input.

Initial tuning, to be verified in actual gameplay: 300 world units/s walk speed, 1550 units/s² gravity, ground jump velocity -620, air jump -570, float descent capped at 110, wall jump horizontal speed 420 with a 0.16-second steering lock, grapple range 420 and pull speed 750. These are new implementation choices, not claims about MapleStory or Silksong's mechanics.

## World, camera, and rendering

Use a world roughly 5600 units wide and 2600 high, with ground around y=2200 and climbing routes extending toward y=600. Put the starting rest area well inside the horizontal bounds so the initial view has scenery on both sides. Size individual ledge gaps and height differences to the tested traversal envelope; prove at least one connected ascent through actual physics.

The local player's visual center is the camera target on both axes. Smooth position changes, and render parallax scenery beyond the map boundaries so world-edge clamping does not push the player away from the center. The camera must track changes in rendered position, including reconciliation smoothing; other players are interpolated relative to the same view. Use viewport dimensions consistently across Canvas transforms, UI, world-to-screen calculations, and both camera axes.

Render distinct character states for idle, walking, rising/falling, floating, clinging, and grappling, using available animation frames and simple traversal effects. Grappling draws a visible tether and eligible-target highlight. Background layers scroll at different horizontal and vertical rates, loop without gaps, and cover tall maps on desktop and mobile.

## Assets and provenance

Replace the astronaut character presentation with freely usable chibi humanoid sprites. The author's Tiny Swords page offers a specifically labeled older CC0 release; inspect its actual archive/license and animation sheets before selecting filenames or frame dimensions. RavenTale's Nature Parallax Background page explicitly permits CC0 use and supplies separated layers. Select actual downloaded files after verification, preserving original archives, licenses, source URLs, categorized paths, and hashes. Do not substitute current restricted pack terms for the older CC0 release's license.

Organize new assets by pack and type under `assets/`: character sheets, terrain/props if used, backgrounds/parallax layers, and licenses. Keep previous downloaded packs and their source records. Runtime/build asset routing must include the new packs; production remains independent of remote asset URLs. Asset candidates that cannot be downloaded or whose licensing cannot be verified must be replaced with another verified free source before claiming completion.

## Architecture and protocol

Extend the existing shared deterministic physics instead of introducing a game engine. Server simulation remains authoritative at 60 Hz, with room snapshots at 20 Hz and local browser prediction. Extend the validated input message with boolean `float`, `grapple`, and `dash`; include necessary traversal state in player snapshots for remote rendering and reconciliation. Keep the payload/rate/origin/buffer/connection limits. Remove coin and completion state from active room simulation, protocol consumers, and UI. Preserve rooms, capacity, invite links, reconnects, and cleanup behavior.

The frontend owns rendering/input/UI only. Shared level/physics own platform geometry, anchor selection, checkpoint proximity, and movement state transitions. The backend cannot accept movement coordinates or score claims from clients.

## Acceptance and reproducible validation

1. Shared-physics tests prove exactly one air jump, no held-key auto-jumps, float descent limits, cling/detach, wall-jump steering, grapple targeting/range/obstruction/collision/detach, dash duration/cooldown/air limit/collision, invulnerability start/expiry/cancellation and damage eligibility, and clearing ability state on respawn.
2. Level tests exercise each named ability route and the combined upper loop using real movement physics, reachable rest locations, and collision-safe platform/anchor geometry. Check single-jump versus double-jump reach and normal versus float descent in the relevant sections, plus wall-jump and grapple transfers. No coin or finish logic remains active.
3. Protocol and actual two-client WebSocket tests cover the new inputs/state, room isolation/capacity, invalid messages, and reconnection/cleanup.
4. Browser tests verify full-viewport Canvas, zero page scrolling, centered camera on both axes, loaded local chibi/parallax assets, real traversal inputs, remote-player state, menus/blur input release, and touch controls at a mobile viewport.
5. Run the production build and development-startup asset/proxy test. Use available Node 22.19.0 or bundled Node 24; respect existing dev processes rather than stopping the user's running server without authorization.
6. Inspect a small number of desktop/mobile screenshots to verify the chibi presentation, parallax coverage, HUD legibility, and fullscreen layout.
7. Review the final changes, stage only this update's changed/new files without unstaging the existing first version, and provide a recommended commit message. Do not commit or push.

## Boundaries

This update is a traversal/exploration prototype, with visual and movement inspiration from the named games. It does not reproduce their proprietary characters/assets, add enemies/combat/quests, introduce accounts or durable persistence, or deploy publicly. Exact new asset filenames and dimensions will be determined from the verified downloads before implementation.
