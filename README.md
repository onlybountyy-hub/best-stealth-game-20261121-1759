[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/onlybountyy-hub/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/onlybountyy-hub/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Entered via [make.fun](https://make.fun/r/q6ckzx1w) — build things with your AI agent and earn money in paid bounties.

# VEIL — a night-infiltration stealth game

**VEIL** is an original top-down 2D stealth game: you are Wren, an infiltrator
working three night jobs — a museum gallery, a vault floor and a rooftop —
against guards who patrol, watch, listen and hunt.

## How it plays

- **Move** with WASD or the arrow keys. **Shift** runs (fast, but loud).
  **C** sneaks (slow, quiet, harder to spot). **P** pauses, **R** restarts a
  job, **M** mutes.
- **Guards** patrol set routes with visible vision cones. Their awareness
  fills when you are inside a cone in line of sight — faster up close, in
  lamplight, or while running; slower in shadow, in bushes, or while
  sneaking. At half awareness a guard comes to investigate; at full
  awareness it gives chase, and if it touches you the job is blown.
- **Noise** matters: running footsteps ripple out and pull the nearest calm
  guard to the sound. Sneaking is silent.
- **Cover** is everywhere if you look: dark floor, bushes to crouch in,
  crates that block sight. Break line of sight for a few seconds and a
  chasing guard loses you and searches your last known spot before
  returning to patrol.
- **Objectives** per job: steal artifacts, silence alarm panels, lift a
  ledger, collect dead drops — then reach the green **EXIT** with
  everything done. The HUD tracks objectives, the loudest guard's
  awareness, your time and a minimap.
- **Three jobs**, unlocked in order, with best times saved in the browser
  and a GHOST rating when a job is cleared without ever being spotted.

## Screenshots

`shots.json` lists the four staged scenes (`?shot=play|hide|end|start`):
the cover frame shows the whole stealth loop at once — a gallery being
crossed, vision cones sweeping, cover nearby, an objective and the exit
in frame.

## Running it

Serve `game/` with any static server (the kit's `node serve.ts` works) and
open it in desktop Chrome. No network requests, no build step, no assets
outside `game/`; all sound is synthesized with WebAudio.
