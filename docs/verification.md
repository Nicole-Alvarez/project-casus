# Verification record — 2026-10-07

Performed directly in this session, without subagents or commits. The workspace was initially empty and not a Git repository. Git was initialized to stage the requested deliverables.

## Results

- Runtime: Node 24.19.0 from the available bundled runtime. The default shell Node 21.7.3 needs upgrading; README explains the requirement.
- Dependencies: Vite 8.3.3, ws 8.22.0, Playwright 1.63.0, recorded by npm and package-lock.json.
- `npm test`: **12 passed, 0 failed**. Covers development startup/asset serving/WebSocket proxy, movement and collision, jump edges, respawn, shared coins, camera bounds, full level traversal, protocol validation, live movement, room isolation/capacity/cleanup, origin policy, malformed messages, and oversized frames.
- `npm run build`: passed. The build includes bundled code and local runtime assets; original download archives stay in the asset library.
- `npm run test:browser`: passed using installed Google Chrome in headless mode. Two isolated browser sessions plus a mobile touch viewport exercised asset loading, walking, jumping, camera following, room roster, blur release, reconnection, credits, touch movement, layout overflow, and leaving. No browser errors or HTTP asset failures were observed.
- `npm audit --json`: **0 vulnerabilities**. An initial standalone audit had an automatic approval-review timeout; the permitted retry succeeded.
- Desktop lobby, desktop multiplayer, and mobile screenshots were inspected. They are saved in ignored `test-results/`.

## Review and corrections

The combined launcher initially resolved Vite relative to the frontend instead of root node_modules. A live regression test reproduced the error, then passed after correcting the CLI path. The same test exposed a development asset rewrite problem caused by a mounted Connect route restoring its prefix; the rewrite now runs without the mount. The final suite verifies both fixes.

The full level was traversed using the actual walking/jumping physics, without injecting positions, reaching the checkpoint and finish without respawning. Review also covered room lifecycle, origin checks, input/payload restrictions, safe text insertion, local asset paths, static file boundaries, and child-process cleanup.

## Reproduce

With Node 22.12+ or Node 24 LTS:

```sh
npm ci
npm test
npm run build
npm run test:browser
npm audit
```

For manual verification, run `npm run dev`, open http://localhost:5173 in two sessions with the same room code, move/jump in one, and confirm the other sees the movement. Walk far enough to pan the camera, cross a pit, use R to respawn, and interrupt/reconnect a socket. A second device needs a reachable LAN URL rather than localhost.

Public deployment and internet-latency/load tests were not performed. Room state is in memory and resets on server restart, as documented in README.
