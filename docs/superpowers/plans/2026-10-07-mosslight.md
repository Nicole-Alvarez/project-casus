# Mosslight Implementation Plan

> Execute directly in this session using executing-plans and test-driven-development. User instructions prohibit subagents and commits.

**Goal:** A playable cooperative pixel-art side scroller with categorized CC0 assets.
**Architecture:** Canvas frontend, server-authoritative WebSocket backend, shared deterministic level/physics.
**Tech stack:** Modern Node, Vite, ws; exact installed versions are recorded in package-lock.json.
**Spec:** ../specs/2026-10-07-mosslight-design.md

## Global constraints
- No commits, subagents, invented production configuration, or pre-existing file changes.
- Characters/camera must move in the actual browser; multiplayer must use actual sockets.
- Frontend and backend have separate directories; downloaded assets retain licenses and provenance.

## Review focus
- Malformed or oversized messages: reject without crashing.
- Lost focus/socket/inputs: stop motion and expose reconnect state.
- Rooms isolate players and progress; empty rooms are removed.
- Camera clamps on small viewports and near world boundaries.
- Static HTTP requests cannot read outside the distribution directory.

## Tasks
- [x] 1. Download/categorize assets, preserve licenses and a path/source manifest; verify paths and PNG dimensions.
- [x] 2. Write failing tests for `createPlayer`, `stepPlayer`, `createRoom`, `stepRoom`, `cameraTarget`, and `parseMessage`; implement shared physics and validation; run Node tests.
- [x] 3. Write live WebSocket tests for `createGameServer({port,host})`; implement rooms, snapshots, cleanup, safe HTTP/static serving; test real two-client movement, isolation, and invalid input.
- [x] 4. Implement frontend renderer/input/network/UI against shared interfaces; run a browser test of loading, two-player movement, camera, and reconnects.
- [x] 5. Build, audit, self-review, document run commands and boundaries, stage only project files, and report verification plus a recommended commit message.
