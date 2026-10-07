# Hollowroot Sanctuary runtime artwork

Generated with the built-in image-generation tool on 2026-10-07. All four characters use the approved [bug-knights-v1.png](../characters/replacement-concepts/bug-knights-v1.png) as their identity reference. No official Hollow Knight/Silksong assets or third-party CC0 claim apply to generated artwork.

## Characters and prompts

| Character | Idle/run | Aerial actions | Special actions |
| --- | --- | --- | --- |
| Lantern beetle | [ground prompt](characters/beetle/ground.md) | [air prompt](characters/beetle/air.md) | [special prompt](characters/beetle/special.md) |
| Crescent moth | [ground prompt](characters/moth/ground.md) | [air prompt](characters/moth/air.md) | [special prompt](characters/moth/special.md) |
| Thorn ant | [ground prompt](characters/ant/ground.md) | [air prompt](characters/ant/air.md) | [special prompt](characters/ant/special.md) |
| Pebble guardian | [ground prompt](characters/pillbug/ground.md) | [air prompt](characters/pillbug/air.md) | [special prompt](characters/pillbug/special.md) |

Each prompt has its unchanged source PNG beside it. Each character has 40 independently drawn whole-body poses: four frames for each of ten states. Ground sheets have four columns and two rows; air/special sheets have four columns and four rows.

Idle now plays at 3 fps; movement plays at 8 fps. Adjacent drawings ease into each other over 70 ms, and action changes blend over 120 ms from the displayed pose. Interrupted transitions continue from that mix. Complete poses align at the head and ease their display size; premultiplied additive compositing preserves overlapping opaque pixels. This is whole-image interpolation, not shape morphing. There are no separate body sections or image warps. Idle, run, fall, double jump, grapple, float and cling loop; jump and dash hold their final pose. The 0.09-second dash uses its first drawing while easing toward the next. Dash afterimages use complete-pose mixes.

`frontend/src/sprite-frames.mjs` records inspected bounds, connected-alpha anchors, foot pivots and per-frame scale. Measured shell span is normalized to 20 world units before display adjustments. Float scale uses idle as its height reference, while horizontal dash targets 90% of idle height; enlargement is capped at 1.35× to keep compact poses from becoming oversized. Moth/ant float already exceed idle height and retain 1×. Runtime display adjustments do not alter the source PNGs or measured metadata. The renderer extracts each connected complete pose once to exclude neighboring atlas tips and low-alpha background residue; original PNGs are unchanged. Face angle, antennae and cloak motion can change the silhouette. The inflated float cape stays around the head while body scale remains consistent. Sword appearance is cosmetic.

`backgrounds/cavern.png` is the retained cavern backdrop. Canvas terrain, arches and root silhouettes provide three parallax depths. `manifest.json` records image dimensions/formats and SHA-256 hashes.

## Cavern generation prompt

```text
Use case: illustration-story. Asset type: wide landscape 2D game BACKGROUND for a compact insect-fantasy cavern sanctuary, smooth hand-drawn art inspired by Hollow Knight's atmospheric underground environments, original setting.
Create a richly layered but restrained mossy underground ruin: immense soft blue-teal cavern arches in the distance, dim aquamarine light filtering down through cracks, hanging root silhouettes, scattered tiny pale specks, very faint carved stone pillars, misty depth, dark desaturated rock framing the left and right edges. Center remains calm and open with readable subdued teal light. Landscape 3:2 composition. Distant scenery only: no characters, enemies, weapons, platforms intended to stand on, foreground ground surface, HUD, text, logos or signatures. All scenery deliberately low contrast and muted, dark ink and deep green-blue palette with pale jade light, cool luminous atmosphere, smooth 2D illustration with broad clean silhouettes and restrained soft depth shading, no pixel art and no photorealistic textures. Fill the complete canvas edge to edge with this cavern background; no transparent holes. This image will sit behind separately rendered gameplay platforms and multiple parallax layers.
```
