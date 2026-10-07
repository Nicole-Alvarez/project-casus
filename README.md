# Mosslight

A playable cooperative 2D browser platformer. Explore a moonlit pixel-art grove with up to eight players, collect coins together, activate a checkpoint, and reach the finish flag. Characters move and jump with collision physics; the camera follows across the level.

## Run locally

Use **Node.js 22.12+ (or Node 24 LTS)** and npm. Older Node versions are not supported by the current Vite release. This project was built and tested with Node 24.19.0; the workspace's default Node 21 needs upgrading before using the commands below.

```sh
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Enter an explorer name and expedition code, then start. Open another tab/browser with the same expedition code, or use **Invite a friend** to copy a link.

`npm run dev` launches both services. To run them separately:

```sh
npm run dev --workspace backend
npm run dev --workspace frontend
```

The frontend listens on port **5173** and proxies `/ws` and `/health` to the backend at **3001**. Both bind to all interfaces for local-network testing. Other devices need your computer's reachable LAN address instead of `localhost`, and permission through your firewall. An invitation with `localhost` works only on the same computer. Clipboard copying may be unavailable on plain HTTP LAN addresses; the game displays the link as a fallback.

## Controls and gameplay

- **A / D** or **← / →**: walk.
- **Space**, **W**, or **↑**: jump. Release before jumping again.
- **R**: respawn at your latest checkpoint.
- Touch devices show left, right, and jump buttons.
- **Sound off / Sound on**: toggle the downloaded sound effects.
- Team coins are collected once for everyone. Reaching the gold finish flag completes the expedition; you can keep exploring afterward.
- Falling returns you to your latest checkpoint. Losing focus releases held controls. Brief disconnections retry automatically; reconnecting respawns you in the same room.

## Folder layout

```text
frontend/      Canvas renderer, input, multiplayer client, UI, Vite configuration
backend/       HTTP/WebSocket server, room management, authoritative simulation
shared/        Level data, deterministic movement/collision physics, message validation
assets/        Download archives and categorized free assets, licenses, source manifest
scripts/       Combined development launcher and asset organization script
tests/         Physics/protocol, real WebSocket, and real-browser tests
docs/          Design, implementation plan, and verification record
```

See [assets/README.md](assets/README.md) for asset categories and sources. Kenney's Pixel Platformer and New Platformer Pack are CC0. Original ZIPs and licenses are included; `assets/manifest.json` records paths, sources, and archive SHA-256 hashes. Rebuild the organized asset library with `python3 scripts/organize-assets.py`.

## Build and run the production version

```sh
npm run build
npm start
```

Open [http://localhost:3001](http://localhost:3001). The backend serves the built frontend, runtime assets, and `/ws` on the same port. Download archives are excluded from the browser build. `/health` returns server status.

Optional backend settings:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | HTTP and WebSocket listener port |
| `HOST` | `0.0.0.0` | Network bind address; use `127.0.0.1` for local-only access |
| `ALLOWED_ORIGINS` | unset | Comma-separated additional browser origins allowed to connect to `/ws` |

Default browser connections must have the same origin as the server. For public hosting, use HTTPS and a reverse proxy that passes WebSocket upgrades and preserves `Host`; if the proxy changes the host, configure the exact public origin through `ALLOWED_ORIGINS`. The client uses `wss` automatically on HTTPS. No hosted deployment is included.

## Validation

```sh
npm test
npm run build
npm run test:browser
npm audit
```

Node tests use real physics and actual local WebSocket clients. The browser test runs the built game with two isolated sessions and a touch viewport. It checks asset loading, walking, jumping, camera following, room presence, focus loss, reconnection, credits, touch movement, and leaving. It uses Google Chrome at its standard macOS path when installed; otherwise install Playwright's browser with `npx playwright install chromium`. Screenshots are saved to ignored `test-results/`.

## Scope

This is an in-memory starter game: no accounts, persistent progress, player chat, or database. Empty rooms are deleted; server restarts reset all rooms. Positions and coin collection are controlled by the server, with local prediction and visual smoothing in the browser. Rooms allow eight players; the process caps rooms/connections and limits message sizes/rates, input lifetime, join time, and outbound buffering. It is not an internet-scale hosting or moderation service.
# project-casus
