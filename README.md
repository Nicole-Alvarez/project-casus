# Mosslight

A cooperative 2D browser exploration game for up to eight players. Explore **Hollowroot Sanctuary**, a compact mossy cavern with tall gallery steps, a wall-jump shaft, silk-anchor ascent, a broken bridge for dashing and a safe return corridor. Choose one of four chibi insect explorers: Lantern beetle, Crescent moth, Thorn ant or Pebble guardian. Each wears a green cloak and carries a cosmetic bone longsword. The first map has no coins, enemies or finish objective. Smooth 2D artwork and three parallax depths fill the browser viewport; the camera follows smoothly with the player centered horizontally and 40% above the bottom of the viewport, at 1.4× the previous zoom (400 / 1.4 logical vertical units).

## Run locally

Use **Node.js 22.12+** or Node 24 and npm. Verification uses Node 24.19.0; the user’s Node 22.19.0 satisfies the version requirement.

```sh
npm ci
npm run dev
```

Run `npm run dev` **from the repository root**. It launches the frontend on [localhost:5173](http://localhost:5173) and backend on port 3001. Choose your character, then join with an explorer name and expedition code; friends use the same code or your **Invite** link.

If those ports already belong to another running instance, reuse it or start on different ports:

```sh
PORT=3002 FRONTEND_PORT=5174 npm run dev
```

Open [localhost:5174](http://localhost:5174) for that example. `PORT` also sets Vite’s backend proxy target. Development tests select separate ephemeral ports and do not stop existing servers.

You can run the services separately with `npm run dev --workspace backend` and `npm run dev --workspace frontend`. Apply the same `PORT` value to both if changing the backend port. Both default listeners bind to all interfaces. Other devices need the computer’s reachable LAN address and firewall access; a `localhost` invite only works on the same computer. Clipboard restrictions on plain HTTP LAN addresses trigger a link fallback.

## Movement

| Controls | Action |
| --- | --- |
| A / D or ← / → | Walk; steer in the air |
| Space / W / ↑ | Jump; release and press again for one air jump |
| Hold Shift | Float while falling; descent capped at 110 world units/second |
| Hold toward a wall | Cling while descending; jump launches away from the wall and restores double jump and air dash |
| Hold E | Grapple toward the highlighted fixed anchor within 420 units and clear sight |
| Q | Dash in your movement/facing direction; hold into a wall to dash upward |
| R | Return to the latest glowing resting-place lantern |

Release and press E again to chain anchors. Jump, release, arrival or collision detaches a tether. Wall contact refreshes the air jump. Each accepted dash also restores one air jump, including when the previous double jump was spent; jumping during a dash cancels it. Landing and wall jumps refresh the air dash, while its cooldown still applies.

Dash lasts **0.09 seconds**, has a **0.8-second cooldown**, and permits one ordinary dash in open air before landing or wall jumping. While holding against a wall, release and press Q again after cooldown to dash upward repeatedly. Wall contact does not grant extra open-air dashes. The authoritative simulation tracks invulnerability during the active dash; expiry, a cancelling jump, collision or respawn ends it. This first map has no damage sources, so damage eligibility is verified directly in shared-physics tests rather than demonstrated against enemies.

Touch devices expose walk, jump, float, silk and dash buttons. Walk into a wall to cling on touch, then jump away or dash upward while holding toward it. The **? movement guide** explains the routes. The **☰ settings menu** contains the character picker, invites, sound, credits and leaving. Character changes preserve your position, are visible to friends, and are saved in this browser for later joins. Opening a menu releases and pauses your controls while friends continue. Losing focus releases held controls. Reconnecting rejoins the same expedition with a fresh player at the initial rest. The ⛶ button requests browser fullscreen where supported; the game fills the viewport regardless.

The gallery needs a second jump near the first jump's apex. Float from its upper ledge to the small landing across the hollow, or follow six silk anchors to the quiet sanctuary. Alternate wall jumps in the rootshaft, or dash upward while clinging. Jump and dash across the broken bridge. Holding into the right enclosing wall clings; release it to settle on the return ledge, then step left to descend into the lower corridor.

## Folder layout

```text
frontend/      Canvas renderer, keyboard/touch input, multiplayer client, UI and Vite
backend/       HTTP/WebSocket server and authoritative room simulation
shared/        Exploration map, collision geometry, traversal physics and protocol
assets/        Categorized generated sprites/background, concept reference, retained sounds and provenance
scripts/       Combined dev launcher, sprite measurement and asset inventory
tests/        Physics/routes, real sockets, assets, dev startup and browser checks
docs/         Approved design/plan, progress ledger and verification record
```

See [assets/README.md](assets/README.md) for categories and licensing. Each explorer has 40 complete generated drawings across three transparent sheets in `assets/generated/sanctuary/characters/`: four frames for each of ten movement states. Idle advances at 3 fps (a 1.33-second loop); movement advances at 8 fps. Adjacent drawings ease through a 70-ms blend, and action changes ease over 120 ms from the currently displayed pose, including interrupted transitions. Complete drawings align at the head, with foot/body height and display scale interpolated. Blends use premultiplied compositing to retain opacity. Sprite images remain unchanged and mirrored when facing left, with no separate body parts or image warping. Dash afterimages use the same complete-pose mix. Per-character float/dash magnification compensates for compact drawings, capped at 1.35×; already tall float poses keep their scale. The sword is cosmetic.

The approved four-character concept reference and exact sprite prompts are retained. Obsolete characters, part atlases, downloads and unused sounds have been removed. Kenney jump/magic sounds retain their CC0 license. Generated art is not claimed to be CC0 or official artwork from either inspiration game. All runtime assets are served locally; the build copies only the thirteen runtime PNGs, two sounds and the sound license.

## Production

```sh
npm run build
npm start
```

Open [localhost:3001](http://localhost:3001). The backend serves the built frontend, assets, `/ws` and `/health` on the same port.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Backend listener; also Vite’s backend proxy target |
| `FRONTEND_PORT` | `5173` | Vite development listener |
| `HOST` | `0.0.0.0` | Backend bind address |
| `ALLOWED_ORIGINS` | unset | Additional exact browser origins allowed to connect |

Browser sockets default to the same origin. Public hosting needs HTTPS and a reverse proxy passing WebSocket upgrades and preserving Host, or an explicitly configured allowed public origin. The client uses `wss` on HTTPS. No hosted deployment is included.

## Validation

```sh
npm test
npm run build
npm run test:browser
```

Node tests check real movement routes, 3-fps idle/8-fps movement timing, transition continuity and display size, all four characters' source bounds and hashes, appearance message validation, live multiplayer appearance changes, protocol boundaries and isolated dev startup. Browser tests use two desktop sessions and a mobile touch viewport to check the lobby/settings pickers, remote choices, saved reconnect choice, whole-pose blending, repeated wall dashes, Q dash, traversal, camera framing, menus, fullscreen and touch controls. They use installed macOS Google Chrome when available; otherwise install Chromium with `npx playwright install chromium`. Screenshots are saved in ignored `test-results/`.

## Scope

Rooms run an in-memory server-authoritative simulation at 60 Hz with snapshots at 20 Hz. The browser predicts local movement and interpolates other players. Eight players per room; connection/room caps and message/origin limits remain enforced. There are no accounts, chat, database, persistent progress or combat. Empty rooms are removed and a server restart resets state. Internet latency/load testing and public deployment are outside the verified scope.
