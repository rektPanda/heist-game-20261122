// The three heist rooms. Each level is one big room that fits the whole screen:
// walls (display cases, shelves, vaults) block movement and block sight,
// loot with a dollar value, guards on patrol loops, wall cameras that sweep,
// a spawn point for the thief and an exit door that opens once all loot is taken.
// Coordinates are in the 1280x720 field; the room itself is ROOM in config.js.
// Layout rule the levels follow: no loot, spawn, exit or waypoint sits inside
// a wall, and no patrol segment crosses a wall — verified by the test script.

export const LEVELS = [
  {
    name: '1 — The Gallery',
    walls: [
      { x: 560, y: 330, w: 160, h: 70 }, // central display case
      { x: 210, y: 180, w: 44, h: 190 }, // left shelf
      { x: 1026, y: 390, w: 44, h: 190 }, // right shelf
    ],
    loot: [
      { kind: 'gold', x: 620, y: 200 },
      { kind: 'cash', x: 140, y: 600 },
      { kind: 'diamond', x: 1140, y: 170 },
      { kind: 'safe', x: 1140, y: 600 },
    ],
    guards: [
      { waypoints: [{ x: 280, y: 300 }, { x: 940, y: 300 }] },
      { waypoints: [{ x: 940, y: 540 }, { x: 360, y: 540 }] },
    ],
    cameras: [
      { x: 640, y: 96, baseAngle: Math.PI / 2, sweep: 0.7 },
    ],
    spawn: { x: 70, y: 650 },
    exit: { x: 1216, y: 620, w: 36, h: 72 },
  },
  {
    name: '2 — Bank Floor',
    walls: [
      { x: 300, y: 200, w: 210, h: 44 },
      { x: 770, y: 200, w: 210, h: 44 },
      { x: 300, y: 470, w: 210, h: 44 },
      { x: 770, y: 470, w: 210, h: 44 },
      { x: 600, y: 330, w: 80, h: 64 }, // central vault
    ],
    loot: [
      { kind: 'cash', x: 140, y: 140 },
      { kind: 'diamond', x: 640, y: 140 },
      { kind: 'gold', x: 1140, y: 140 },
      { kind: 'cash', x: 640, y: 440 },
      { kind: 'safe', x: 140, y: 600 },
      { kind: 'gold', x: 1140, y: 600 },
    ],
    guards: [
      { waypoints: [{ x: 200, y: 300 }, { x: 1080, y: 300 }] },
      { waypoints: [{ x: 1080, y: 580 }, { x: 200, y: 580 }] },
      { waypoints: [{ x: 640, y: 120 }, { x: 640, y: 300 }] },
    ],
    cameras: [
      { x: 330, y: 96, baseAngle: Math.PI / 2, sweep: 0.9 },
      { x: 950, y: 96, baseAngle: Math.PI / 2, sweep: 0.9 },
    ],
    spawn: { x: 70, y: 650 },
    exit: { x: 1216, y: 110, w: 36, h: 72 },
  },
  {
    name: '3 — Diamond Vault',
    walls: [
      { x: 220, y: 200, w: 44, h: 300 },
      { x: 520, y: 120, w: 44, h: 200 },
      { x: 820, y: 380, w: 44, h: 300 },
      { x: 1020, y: 120, w: 44, h: 200 },
      { x: 400, y: 520, w: 240, h: 44 },
      { x: 760, y: 160, w: 240, h: 44 },
    ],
    loot: [
      { kind: 'gold', x: 140, y: 300 },
      { kind: 'cash', x: 1140, y: 140 },
      { kind: 'safe', x: 640, y: 300 },
      { kind: 'cash', x: 900, y: 300 },
      { kind: 'gold', x: 380, y: 640 },
      { kind: 'diamond', x: 640, y: 640 },
      { kind: 'diamond', x: 1140, y: 640 },
    ],
    guards: [
      { waypoints: [{ x: 120, y: 150 }, { x: 480, y: 150 }] },
      { waypoints: [{ x: 880, y: 600 }, { x: 1180, y: 600 }] },
      { waypoints: [{ x: 700, y: 250 }, { x: 700, y: 600 }] },
      { waypoints: [{ x: 300, y: 580 }, { x: 300, y: 150 }] },
    ],
    cameras: [
      { x: 140, y: 96, baseAngle: Math.PI / 2, sweep: 0.8 },
      { x: 640, y: 96, baseAngle: Math.PI / 2, sweep: 0.8 },
      { x: 1140, y: 96, baseAngle: Math.PI / 2, sweep: 0.8 },
    ],
    spawn: { x: 70, y: 650 },
    exit: { x: 1216, y: 620, w: 36, h: 72 },
  },
];

/** Total loot value of a level, in dollars. */
export function levelValue(level) {
  return level.loot.reduce((sum, item) => sum + ({ cash: 300, gold: 500, safe: 800, diamond: 1200 }[item.kind] || 0), 0);
}
