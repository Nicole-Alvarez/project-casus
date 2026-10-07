# Approved whole-character sprite update

The user approved the bounded design for all four concepts, using inline implementation without subagents or commits.

- Add A Lantern beetle, B Crescent moth, C Thorn ant and D Pebble guardian.
- Offer a lobby/settings character picker, persist the choice locally and synchronize it through multiplayer joins/snapshots/live appearance changes.
- Generate complete transparent drawings for idle, run, jump, fall, double jump, grapple, float, cling, dash and upward wall dash. Use four frames per state at 8 fps; do not assemble separate body sections.
- Preserve existing movement, Q dash/i-frames, physics bounds, map, camera and cooperative exploration behavior.
- Remove obsolete character art, unused downloaded assets/archives and unused sounds. Keep the approved concept reference, exact prompts, runtime cavern and retained sound license.
- Verify actual frame bounds/proportions, timing, real multiplayer selection and browser movement. Stage the scoped changes while preserving pre-existing staged work; leave uncommitted.

Implementation and reproducible results are recorded in [verification](../../verification.md). Source PNGs and per-sheet prompts are indexed in [runtime artwork](../../../assets/generated/sanctuary/README.md).
