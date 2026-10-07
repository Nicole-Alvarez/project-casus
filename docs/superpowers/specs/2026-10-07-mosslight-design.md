# Mosslight: cooperative browser platformer

The requested outcome is a playable 2D browser side scroller with real multiplayer, moving characters, a following camera, categorized downloaded free assets, and separate frontend/backend folders. The user selected cooperative pixel art. Implementation is sequential in this session; no subagents or commits.

## Design

Use native Canvas 2D and Vite in `frontend/`, Node HTTP and the `ws` library in `backend/`, and deterministic physics/level data in `shared/`. Canvas avoids an unnecessary game-engine dependency for this small level. The server runs fixed 60 Hz physics and publishes 20 Hz room snapshots. Clients send boolean controls only; clients cannot submit positions, score, or collection claims. The frontend predicts local movement and smoothly corrects it to server positions; remote players interpolate.

Rooms use a short validated code, hold at most eight players, and vanish when empty. A URL query shares the room. No login, database, or persistence is needed for this initial playable game. Names are length-limited and inserted as text. WebSocket upgrades enforce same origin by default, with an explicit optional allowlist; payloads, join time, connections, idle inputs, and send buffers are bounded.

The level has grass platforms, pits, shared coins, a checkpoint, and a finish flag. Keyboard arrows/A/D move, W/up/space jumps, R respawns. On-screen touch controls provide the same controls. A bounded camera follows the player in a wide world; multiple parallax layers, animated sprites, and a minimap communicate progress. Room UI shows actual player count, connection state, team coins, and a completion overlay. Leaving or blur releases held controls. Reconnects retain the room/name but respawn safely.

Downloaded Kenney Pixel Platformer assets live under `assets/kenney-pixel-platformer/`, separated into characters, terrain, props, items, backgrounds, spritesheets, and licenses. Preserve original tile identifiers in descriptive filenames and manifest entries. The supplemental New Platformer Pack supplies categorized sound effects; keep both original download archives and bundled licenses. A build plugin copies only the runtime categories into the frontend build; no remote asset dependency at runtime.

## Verification

Node tests exercise walking, world bounds, floor/platform collision, jump edges, respawn, server-only coin collection, camera limits, protocol validation, room limits, room isolation, and live two-client networking. A real browser smoke test checks that assets load, player controls move the character, the camera follows, and two browser contexts see the same room. Build the frontend, inspect dependencies with `npm audit`, and verify the production HTTP/static/WebSocket paths. Leave task files staged without creating a commit.

## Limits

This is a self-hosted starter game. Multiplayer requires a running backend; public hosting, durable accounts, moderation, and internet-scale infrastructure are outside the request. Development ports are 5173 (Vite) and 3001 (backend); production uses one HTTP server and same-origin WebSocket path `/ws`.
