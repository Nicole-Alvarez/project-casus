# Hollowroot Sanctuary runtime artwork

Generated with the built-in image-generation tool on 2026-10-07. All four characters use the approved [bug-knights-v1.png](../characters/replacement-concepts/bug-knights-v1.png) as their identity reference. No official Hollow Knight/Silksong assets or third-party CC0 claim apply to generated artwork.

## Characters and prompts

| Character | Idle/run | Aerial actions | Special actions |
| --- | --- | --- | --- |
| Lantern beetle | [ground prompt](characters/beetle/ground.md) | [air prompt](characters/beetle/air.md) | [special prompt](characters/beetle/special.md) |
| Crescent moth | [ground prompt](characters/moth/ground.md) | [air prompt](characters/moth/air.md) | [special prompt](characters/moth/special.md) |
| Thorn ant | [ground prompt](characters/ant/ground.md) | [air prompt](characters/ant/air.md) | [special prompt](characters/ant/special.md) |
| Pebble guardian | [ground prompt](characters/pillbug/ground.md) | [air prompt](characters/pillbug/air.md) | [special prompt](characters/pillbug/special.md) |

Each prompt has its unchanged source PNG beside it. Each character retains 40 independently drawn whole-body poses in clip metadata: four drawings for each of ten states. Runtime idle uses the first approved drawing only; other actions use their full sequences. Ground sheets have four columns and two rows; air/special sheets have four columns and four rows. New four-by-four `movement.png` sheets replace the fall, double-jump, float and cling clips. Existing air/special sheets remain needed for jump/grapple and dash/wallDash; their replaced rows are not used at runtime.

| Revised character actions | Exact generation prompt |
| --- | --- |
| Lantern beetle | [movement](characters/beetle/movement.md) |
| Crescent moth | [movement](characters/moth/movement.md) |
| Thorn ant | [movement](characters/ant/movement.md) |
| Pebble guardian | [movement](characters/pillbug/movement.md) |

Fall capes stream upward, double-jump capes spread into broad leaf wings, float capes form larger parachute canopies, and cling looks away from the wall with the rear hand reaching back. All drawings retain the approved identities and bone longswords. There are no separate body sections.

Idle holds one complete drawing, with local cape waves and gentle chest breathing over a 3.2-second cycle. The runtime deforms that whole texture, protecting helmet, sword, hands and feet; it does not build a body-part rig or change source PNGs. Thirty-two lazily cached phases interpolate continuously. Cape influence increases toward the tips, and chest motion fades near protected geometry. Idle frame advancement is reported as 0 fps; local motion updates every render. The existing 120-ms action transition retains the displayed deformation, including interrupted transitions. Movement plays at 8 fps with interpolation throughout each 125-ms interval; action changes blend over 120 ms from the displayed mix. Interrupted transitions retain the outgoing orientation. Fall/cling play frames 0,1,2,3,2,1; double jump opens through 0,1,2,3 then alternates 2,3 while rising. Float loops all four inflated poses. Jump/dash hold their final drawings. The 0.09-second dash timing and movement physics are unchanged.

`frontend/src/sprite-frames.mjs` records inspected source bounds, connected-alpha seeds, shell measurements, foot pivots and raised-hand contacts. Each frame normalizes shell span to 20 world units. Thorn ant uses a fixed 1.16 whole-image display magnification to match the beetle/guardian body stature; the other explorers remain at 1. Each character keeps that scale for every action, so cape bounds never change body size. Its foot-to-head and wall-hand anchors use the same magnification. The approved idle body supplies a constant vertical head anchor, and every layer shares the blended horizontal head position. Wall contact settles toward the raised hand; pose variation during blends may move the fingers slightly around the wall line. Runtime connected-alpha extraction excludes neighboring atlas tips and low-alpha residue, preserving source PNG bytes. Premultiplied compositing retains overlapping opaque pixels. Movement uses whole-image interpolation; idle uses bounded local texture deformation. Sword appearance is cosmetic.

`backgrounds/cavern.png` is the retained cavern backdrop. Canvas terrain, arches and root silhouettes provide three parallax depths. `manifest.json` records image dimensions/formats and SHA-256 hashes.

## Cavern generation prompt

```text
Use case: illustration-story. Asset type: wide landscape 2D game BACKGROUND for a compact insect-fantasy cavern sanctuary, smooth hand-drawn art inspired by Hollow Knight's atmospheric underground environments, original setting.
Create a richly layered but restrained mossy underground ruin: immense soft blue-teal cavern arches in the distance, dim aquamarine light filtering down through cracks, hanging root silhouettes, scattered tiny pale specks, very faint carved stone pillars, misty depth, dark desaturated rock framing the left and right edges. Center remains calm and open with readable subdued teal light. Landscape 3:2 composition. Distant scenery only: no characters, enemies, weapons, platforms intended to stand on, foreground ground surface, HUD, text, logos or signatures. All scenery deliberately low contrast and muted, dark ink and deep green-blue palette with pale jade light, cool luminous atmosphere, smooth 2D illustration with broad clean silhouettes and restrained soft depth shading, no pixel art and no photorealistic textures. Fill the complete canvas edge to edge with this cavern background; no transparent holes. This image will sit behind separately rendered gameplay platforms and multiple parallax layers.
```
