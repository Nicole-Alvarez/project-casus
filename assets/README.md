# Game assets

The retained library contains four smooth chibi insect explorers, their approved concept reference, the cavern background, two Kenney sound effects and provenance. All runtime assets are local.

| Folder | Contents |
| --- | --- |
| `generated/sanctuary/characters/beetle/` | Lantern beetle: whole-character sheets and exact prompts |
| `generated/sanctuary/characters/moth/` | Crescent moth: whole-character sheets and exact prompts |
| `generated/sanctuary/characters/ant/` | Thorn ant: whole-character sheets and exact prompts |
| `generated/sanctuary/characters/pillbug/` | Pebble guardian: whole-character sheets and exact prompts |
| `generated/sanctuary/backgrounds/` | Cavern background |
| `generated/characters/replacement-concepts/` | Approved four-character reference and its prompt |
| `kenney-new-platformer/audio/` | Original `sfx_jump.ogg` and `sfx_magic.ogg` |
| `kenney-new-platformer/licenses/` | Original CC0 license |
| `manifest.json` | Complete retained file inventory, runtime flags and SHA-256 hashes |

Each character has `ground.png` (idle/run), `air.png` (retained jump/grapple), `special.png` (retained dash/upward wall dash), and `movement.png` (revised fall/double jump/float/cling), with four complete drawings stored per action. Idle uses only its first drawing to prevent inconsistent sword/leg geometry from cycling. A local whole-texture deformation supplies slow cape waves and chest breathing while protecting helmet, sword, hands and feet; source PNGs remain unchanged. The old air/special rows are retained inside sheets that still provide other runtime actions. Exact prompts accompany each PNG as `.md` files. See [runtime artwork](generated/sanctuary/README.md).

Generated art uses the built-in image-generation tool and is not assigned a third-party CC0 license. Hollow Knight and Silksong are visual inspirations; no official game assets are included. Sound comes from [Kenney's New Platformer Pack](https://kenney.nl/assets/new-platformer-pack); the retained original license states CC0.

Obsolete concept iterations, the separate-body-parts rig, prior sheets, unused downloaded packs, archives and unused sounds have been removed. The production build includes only runtime files and the sound license; the approved reference and prompts remain in the source library.

`python3 scripts/inspect-sprites.py` (requires Pillow) measures source poses and writes `frontend/src/sprite-frames.mjs`, without changing any image. Inspect new sheets visually before accepting measurements. `node scripts/update-asset-manifest.mjs` refreshes the retained inventory and hashes. `npm test` validates inventory, source rectangles and playback timing.
