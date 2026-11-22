// The heist itself: state and rules, with no drawing and no browser in it.
// The thief moves, grabs loot, and is hunted by vision cones; being seen
// raises the alarm, the alarm decays while hidden, a full alarm (or a
// guard's touch) ends the run, and collecting every loot opens the exit.
// step() advances one fixed step and returns what happened as bit flags.
import { ALARM, CAMERA, GUARD, LEVEL_CLEAR_PAUSE, LOOT_VALUE, PLAYER } from './config.js';
import { LEVELS } from './levels.js';
import { cameraSeesThief, createCamera, createGuard, guardSeesThief, updateCamera, updateGuard } from './entities.js';
import { moveCircle } from './physics.js';

export const EVENT_LOOT = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_LEVEL = 8;
export const EVENT_WON = 16;

export const STATUS_PLAYING = 'playing';
export const STATUS_CAUGHT = 'caught';
export const STATUS_LEVEL_CLEAR = 'level-clear';
export const STATUS_WON = 'won';

export function createWorld() {
  const player = { x: 0, y: 0, radius: PLAYER.radius, sneaking: false };
  const state = {
    player,
    levelIndex: 0,
    level: LEVELS[0],
    guards: [],
    cameras: [],
    loot: [],
    lootValue: 0,
    lootTaken: 0,
    lootTotal: 0,
    alarm: 0,
    elapsed: 0,
    status: STATUS_PLAYING,
    levelClearTimer: 0,
    spotted: false,
    totalLoot: 0,
  };

  function loadLevel(index) {
    const level = LEVELS[index];
    state.levelIndex = index;
    state.level = level;
    player.x = level.spawn.x;
    player.y = level.spawn.y;
    player.sneaking = false;
    state.guards = level.guards.map(createGuard);
    state.cameras = level.cameras.map(createCamera);
    state.loot = level.loot.map((item) => ({ kind: item.kind, x: item.x, y: item.y, value: LOOT_VALUE[item.kind], taken: false }));
    state.lootTaken = 0;
    state.lootTotal = state.loot.length;
    state.alarm = 0;
    state.elapsed = 0;
    state.status = STATUS_PLAYING;
    state.levelClearTimer = 0;
    state.spotted = false;
  }

  function reset() {
    state.totalLoot = 0;
    state.lootValue = 0;
    loadLevel(0);
  }

  /** The exit door opens once every loot in the room is taken. */
  function exitOpen() {
    return state.lootTaken >= state.lootTotal;
  }

  function catchThief() {
    state.status = STATUS_CAUGHT;
    state.alarm = ALARM.max;
    return EVENT_CAUGHT;
  }

  /**
   * One fixed step. `move` is a unit-ish {x, y} direction (0,0 to stand
   * still); `sneak` halves speed and halves how fast being seen raises the
   * alarm. Returns EVENT_* flags for what happened this step.
   */
  function step(dt, move, sneak) {
    if (state.status === STATUS_CAUGHT || state.status === STATUS_WON) return 0;
    let events = 0;

    if (state.status === STATUS_LEVEL_CLEAR) {
      state.levelClearTimer -= dt;
      if (state.levelClearTimer <= 0) {
        if (state.levelIndex + 1 >= LEVELS.length) {
          state.status = STATUS_WON;
          events |= EVENT_WON;
        } else {
          loadLevel(state.levelIndex + 1);
        }
      }
      return events;
    }

    state.elapsed += dt;
    player.sneaking = sneak;
    const speed = sneak ? PLAYER.sneakSpeed : PLAYER.speed;
    if (move.x !== 0 || move.y !== 0) {
      const len = Math.hypot(move.x, move.y);
      moveCircle(player, (move.x / len) * speed * dt, (move.y / len) * speed * dt, state.level.walls);
    }

    // Grab loot the thief walks over.
    for (const item of state.loot) {
      if (item.taken) continue;
      if (Math.hypot(item.x - player.x, item.y - player.y) <= PLAYER.pickupRadius) {
        item.taken = true;
        state.lootTaken += 1;
        state.lootValue += item.value;
        state.totalLoot += item.value;
        events |= EVENT_LOOT;
      }
    }

    // Guards and cameras move, then look: every watcher that sees the thief
    // pushes the alarm up, faster when the thief runs instead of sneaking.
    for (const guard of state.guards) updateGuard(guard, dt, player, state.level.walls, state.alarm);
    for (const camera of state.cameras) updateCamera(camera, dt);
    let seen = false;
    for (const guard of state.guards) {
      guard.seesThief = guardSeesThief(guard, player, state.level.walls);
      if (guard.seesThief) {
        seen = true;
        state.alarm += GUARD.alarmRate * (sneak ? ALARM.sneakFactor : 1) * dt;
      }
    }
    for (const camera of state.cameras) {
      camera.seesThief = cameraSeesThief(camera, player, state.level.walls);
      if (camera.seesThief) {
        seen = true;
        state.alarm += CAMERA.alarmRate * (sneak ? ALARM.sneakFactor : 1) * dt;
      }
    }
    if (seen && !state.spotted) events |= EVENT_SPOTTED;
    state.spotted = seen;
    if (!seen) state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
    state.alarm = Math.min(ALARM.max, state.alarm);

    // A guard that reaches the thief ends the heist on the spot.
    // (The alarm check below covers being stared at from a distance.)
    for (const guard of state.guards) {
      if (Math.hypot(guard.x - player.x, guard.y - player.y) <= GUARD.catchRadius) {
        return events | catchThief();
      }
    }
    if (state.alarm >= ALARM.max) return events | catchThief();

    // All loot taken and the thief reaches the open exit: next room.
    if (exitOpen()) {
      const exit = state.level.exit;
      if (player.x >= exit.x - 10 && player.x <= exit.x + exit.w + 10 && player.y >= exit.y && player.y <= exit.y + exit.h) {
        state.status = STATUS_LEVEL_CLEAR;
        state.levelClearTimer = LEVEL_CLEAR_PAUSE;
        events |= EVENT_LEVEL;
      }
    }
    return events;
  }

  reset();
  return { state, reset, loadLevel, step, exitOpen };
}
