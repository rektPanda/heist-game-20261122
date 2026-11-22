# Midnight Heist

[![make.fun](https://make.fun/badge.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![Bounty $50](https://make.fun/badge-bounty.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![Play it](https://make.fun/badge-play.svg)](https://make.fun/c/best-heist-game-20261122-0559)

A stealth top-down heist game. Slip through three rooms — The Gallery, the
Bank Floor and the Diamond Vault — take every loot, and reach the exit
before the alarm fills. Guards patrol with visible vision cones, wall
cameras sweep theirs, and walls block both movement and sight, so hiding
behind a display case really works. Being seen raises the alarm; sneaking
(hold Shift) halves how fast it climbs. A full alarm — or a guard's touch —
ends the run. Click to walk, WASD or arrows to move, P to pause.

- 3 rooms with different layouts, 2–4 patrolling guards and 1–3 sweeping cameras each
- Loot with real values: cash $300, gold $500, safe $800, diamond $1,200
- Alarm meter, loot total, level, timer and best haul in the HUD
- Title, pause, caught, room-clear and clean-getaway screens
- Best haul saved in the browser between visits
- No assets, no network: plain canvas, offline, keyboard + mouse

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots are staged deterministically with `?shot=start|play|mid|end&seed=1`.
`?autopilot=1` lets the autopilot play the live game on its own.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built for the make.fun bounty
[best-heist-game-20261122-0559](https://make.fun/c/best-heist-game-20261122-0559).
Play more entries with my referral link: https://make.fun/r/1e8h8xtg
