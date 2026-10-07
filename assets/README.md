# Downloaded free assets

Art: [Kenney Pixel Platformer](https://kenney.nl/assets/pixel-platformer), version 1.2 as stated in the bundled license. Sound: [Kenney New Platformer Pack](https://kenney.nl/assets/new-platformer-pack), download 1.1. Both packs are **CC0**; the original license files are in each pack's `licenses/` folder.

- `downloads/`: the unmodified official ZIP files, including the full supplemental art pack for future use.
- `kenney-pixel-platformer/characters/`: characters and animation frames.
- `kenney-pixel-platformer/terrain/`: grass, soil, stone, wood, and other platform tiles.
- `kenney-pixel-platformer/props/`: plants, trees, flags, signs, decorations, and unused environment objects.
- `kenney-pixel-platformer/items/`: coins, hearts, keys, and pickups.
- `kenney-pixel-platformer/backgrounds/`: background tiles and clouds.
- `kenney-pixel-platformer/ui/`: pixel numbers and symbols.
- `kenney-pixel-platformer/spritesheets/`: original packed and spaced PNG sheets.
- `kenney-new-platformer/audio/`: ten original OGG sound effects.
- `manifest.json`: exact original-to-categorized file mapping, source URLs, and archive SHA-256 hashes.

Descriptive filenames keep the original four-digit tile ID. Reproduce the library with `python3 scripts/organize-assets.py` after downloading the archives. Runtime files are served by Vite from this directory; production builds copy runtime categories to `frontend/dist/game-assets/`. Archives are not shipped in the browser build.
