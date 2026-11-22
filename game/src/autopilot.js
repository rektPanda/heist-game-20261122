// A pathfinding autopilot that plays the real rules: it is what the
// screenshot scenes use, and what ?autopilot=1 runs live. It plans a route
// on a coarse grid with Dijkstra's algorithm — walking through a cell a
// guard or camera can currently see costs far more than walking around it,
// so the route hugs cover and only crosses a cone when there is no other
// way. When the alarm is high, or every loot is taken, it routes to the
// exit instead of the next loot.
import { GUARD } from './config.js';
import { cameraSeesThief, guardSeesThief } from './entities.js';
import { circleBlocked } from './physics.js';

const CELL = 40;
const COLS = Math.ceil(1280 / CELL);
const ROWS = Math.ceil(720 / CELL);

function seenAt(state, x, y) {
  const probe = { x, y };
  for (const guard of state.guards) {
    if (guardSeesThief(guard, probe, state.level.walls)) return true;
  }
  for (const camera of state.cameras) {
    if (cameraSeesThief(camera, probe, state.level.walls)) return true;
  }
  return false;
}

function nearestLoot(state) {
  let best = null;
  let bestDist = Infinity;
  for (const item of state.loot) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - state.player.x, item.y - state.player.y);
    if (d < bestDist) {
      bestDist = d;
      best = item;
    }
  }
  return best;
}

function cellIndex(x, y) {
  const col = Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL)));
  const row = Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL)));
  return row * COLS + col;
}

function cellCenter(index) {
  return { x: (index % COLS) * CELL + CELL / 2, y: Math.floor(index / COLS) * CELL + CELL / 2 };
}

/** Cheapest route (as a list of cell centres) from `from` to `to`, or null. */
function findRoute(state, from, to) {
  const player = state.player;
  const walkable = new Array(COLS * ROWS);
  for (let index = 0; index < walkable.length; index += 1) {
    const centre = cellCenter(index);
    // A cell is walkable when the thief fits there — and when no guard is
    // standing in it right now, so the route goes around a guard instead
    // of walking head-on into its patrol lane and getting caught by touch.
    let nearGuard = false;
    for (const guard of state.guards) {
      if (Math.hypot(guard.x - centre.x, guard.y - centre.y) < 42) {
        nearGuard = true;
        break;
      }
    }
    walkable[index] = !nearGuard && !circleBlocked(centre.x, centre.y, player.radius + 2, state.level.walls);
  }
  const start = cellIndex(from.x, from.y);
  let goal = cellIndex(to.x, to.y);
  // The thief's own cell and the target cell are always enterable: the
  // route must be able to start where the thief stands and end on the loot.
  walkable[start] = true;
  walkable[goal] = true;
  // A blocked endpoint is nudged to the nearest walkable cell — the thief
  // often stands half a cell into a wall's shadow, and that must not
  // strand the route (it once pinned the autopilot against a wall).
  const nearestWalkable = (index) => {
    if (walkable[index]) return index;
    let bestIdx = -1;
    let bestDist = Infinity;
    const a = cellCenter(index);
    for (let i = 0; i < walkable.length; i += 1) {
      if (!walkable[i]) continue;
      const b = cellCenter(i);
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  };
  const routedStart = nearestWalkable(start);
  if (routedStart < 0) return null;
  goal = nearestWalkable(goal);
  if (goal < 0) return null;
  const dist = new Array(COLS * ROWS).fill(Infinity);
  const prev = new Array(COLS * ROWS).fill(-1);
  const done = new Array(COLS * ROWS).fill(false);
  dist[routedStart] = 0;
  for (;;) {
    let current = -1;
    let currentDist = Infinity;
    for (let i = 0; i < dist.length; i += 1) {
      if (!done[i] && dist[i] < currentDist) {
        currentDist = dist[i];
        current = i;
      }
    }
    if (current < 0 || current === goal) break;
    done[current] = true;
    const cx = current % COLS;
    const cy = Math.floor(current / COLS);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const next = ny * COLS + nx;
        if (!walkable[next] || done[next]) continue;
        const centre = cellCenter(next);
        let cost = dx !== 0 && dy !== 0 ? 1.4 : 1;
        if (seenAt(state, centre.x, centre.y)) cost += 60;
        for (const guard of state.guards) {
          const gd = Math.hypot(guard.x - centre.x, guard.y - centre.y);
          if (gd < 90) cost += (90 - gd) / 5;
        }
        const total = dist[current] + cost;
        if (total < dist[next]) {
          dist[next] = total;
          prev[next] = current;
        }
      }
    }
  }
  if (!Number.isFinite(dist[goal])) return null;
  const route = [];
  let node = goal;
  while (node !== -1) {
    route.unshift(cellCenter(node));
    node = prev[node];
  }
  return route;
}

/**
 * Pick the next move for one step: {move: {x, y}, sneak: boolean}.
 * `dt` is the fixed step length, `speed` the thief's walking speed.
 */
export function autopilotMove(state, dt, speed) {
  const player = state.player;
  const allLootTaken = state.lootTaken >= state.lootTotal;
  // Panic: the alarm is high enough that guards are chasing. The thief
  // runs — never sneaks, a chasing guard is faster than a sneaking thief —
  // to the safest spot on the floor until the alarm cools down. The exit
  // is only the target once every loot is taken; running to a locked exit
  // while loot remains just waits to be caught there.
  const panicking = !allLootTaken && state.alarm >= GUARD.chaseAlarm;
  let target;
  if (allLootTaken) target = { x: state.level.exit.x + 18, y: state.level.exit.y + 36 };
  else if (panicking) target = fleeTarget(state);
  else target = nearestLoot(state);
  if (target === null) return { move: { x: 0, y: 0 }, sneak: false };

  // Timing: when the next loot is watched right now — inside a cone, or a
  // guard standing close to it — do not walk into the watch. Wait somewhere
  // safe until the patrol moves on, then go. Rushing a watched loot is how
  // the alarm fills and the chase starts.
  if (!allLootTaken && !panicking) {
    const watched = seenAt(state, target.x, target.y) || state.guards.some((g) => Math.hypot(g.x - target.x, g.y - target.y) < 100);
    if (watched) {
      const safeHere = !seenAt(state, player.x, player.y) && state.guards.every((g) => Math.hypot(g.x - player.x, g.y - player.y) > 80);
      if (safeHere) return { move: { x: 0, y: 0 }, sneak: true };
      target = waitTarget(state) ?? target;
    }
  }

  const route = findRoute(state, player, target);
  let waypoint = target;
  if (route !== null && route.length > 1) {
    // Skip cells already reached; steer at the first one still ahead.
    let index = 1;
    while (index < route.length - 1 && Math.hypot(route[index].x - player.x, route[index].y - player.y) < CELL * 0.6) index += 1;
    waypoint = route[index];
  }
  const dx = waypoint.x - player.x;
  const dy = waypoint.y - player.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return { move: { x: 0, y: 0 }, sneak: false };
  const sneak = !panicking && (seenAt(state, waypoint.x, waypoint.y) || seenAt(state, player.x, player.y));
  return { move: { x: dx / len, y: dy / len }, sneak };
}

/**
 * Where to wait out a watched loot: the nearest walkable cell no watcher
 * can currently see and no guard stands close to. Returns null if the
 * whole floor is watched right now (then the caller goes anyway).
 */
function waitTarget(state) {
  let best = null;
  let bestDist = Infinity;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const centre = cellCenter(row * COLS + col);
      if (circleBlocked(centre.x, centre.y, state.player.radius + 2, state.level.walls)) continue;
      if (seenAt(state, centre.x, centre.y)) continue;
      if (state.guards.some((g) => Math.hypot(g.x - centre.x, g.y - centre.y) < 120)) continue;
      const d = Math.hypot(centre.x - state.player.x, centre.y - state.player.y);
      if (d < bestDist) {
        bestDist = d;
        best = centre;
      }
    }
  }
  return best;
}

/**
 * Where to run while a guard is chasing: straight away from the nearest
 * guard, recomputed every step — a fixed hiding spot lets a chasing guard
 * cut the corner, but the thief (215) outruns a chasing guard (138) in a
 * straight line, and past 235 the guard's cone cannot see the thief at all,
 * so the alarm finally cools down.
 */
function fleeTarget(state) {
  const player = state.player;
  let nearest = null;
  let nearestDist = Infinity;
  for (const guard of state.guards) {
    const d = Math.hypot(guard.x - player.x, guard.y - player.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = guard;
    }
  }
  if (nearest === null) return { x: player.x, y: player.y };
  const dx = player.x - nearest.x;
  const dy = player.y - nearest.y;
  const len = Math.hypot(dx, dy) || 1;
  // Aim 320 away (past the guard's vision range), clamped inside the room.
  const x = Math.max(40, Math.min(1240, player.x + (dx / len) * 320));
  const y = Math.max(108, Math.min(680, player.y + (dy / len) * 320));
  return { x, y };
}
