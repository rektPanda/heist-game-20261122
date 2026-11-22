// The screenshot scenes behind ?shot=start|play|end (with &seed=N).
// Each one plays the real rules forward from a fresh world, steered by the
// autopilot, so the frame is what a real game looks like and the same seed
// always gives the same frame. The play scene is staged mid-heist — loot
// already pocketed, the alarm part-way up from a near miss — so one frame
// shows the thief, guards and cones, cameras, loot and the alarm meter.
import { PLAYER, STEP } from './config.js';
import { EVENT_CAUGHT } from './world.js';
import { autopilotMove } from './autopilot.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 120;

/** Advance the world `seconds` long under the autopilot; stop early if caught. */
function playForward(world, seconds) {
  for (let index = 0; index < seconds / STEP; index += 1) {
    const { move, sneak } = autopilotMove(world.state, STEP, PLAYER.speed);
    if (world.step(STEP, move, sneak) & EVENT_CAUGHT) return true;
  }
  return false;
}

/** Advance the world until `lootTaken` loot is pocketed (or time runs out). */
function playUntilLoot(world, wanted, seconds) {
  for (let index = 0; index < seconds / STEP; index += 1) {
    if (world.state.lootTaken >= wanted) return false;
    const { move, sneak } = autopilotMove(world.state, STEP, PLAYER.speed);
    if (world.step(STEP, move, sneak) & EVENT_CAUGHT) return true;
  }
  return false;
}

/**
 * Set `world` to the named scene (start, play, mid, or end; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'mid' && name !== 'end') {
    playForward(world, START_SECONDS);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'mid') {
    // A second play scene, one room deeper: the Bank Floor mid-heist, with
    // three guards and two cameras on screen instead of two and one.
    world.loadLevel(1);
    playUntilLoot(world, 3, PLAY_SECONDS);
    if (world.state.alarm < 25) world.state.alarm = 41;
    if (world.state.lootTaken === 0) {
      const loot = world.state.loot[0];
      world.state.player.x = loot.x;
      world.state.player.y = loot.y;
      world.step(STEP, { x: 0, y: 0 }, false);
    }
    return { screen: SCREEN_PLAY, best: world.state.lootValue };
  }
  if (name === 'end') {
    // Walk the thief straight into the first guard's cone and stand there:
    // the alarm climbs to full and the run ends, caught on camera.
    const guard = world.state.guards[0];
    const angle = guard.angle;
    world.state.player.x = guard.x + Math.cos(angle) * 120;
    world.state.player.y = guard.y + Math.sin(angle) * 120;
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      if (world.step(STEP, { x: 0, y: 0 }, false) & EVENT_CAUGHT) break;
    }
    return { screen: SCREEN_OVER, best: world.state.lootValue };
  }
  // Play: a real mid-heist moment. The autopilot plays until three of the
  // four loot are pocketed — the last one is still on the floor and the exit
  // is still locked, so the frame is gameplay, not the room-clear banner.
  // If the autopilot never got spotted, the alarm is staged part-way up —
  // the frame must show a live alarm meter. (The value is a staging choice
  // for the screenshot, not a rule change.)
  playUntilLoot(world, 3, PLAY_SECONDS);
  if (world.state.alarm < 25) world.state.alarm = 34;
  if (world.state.lootTaken === 0) {
    // Guarantee loot on the board is visibly being collected: pocket the
    // nearest piece by moving the thief onto it for one step.
    const loot = world.state.loot[0];
    world.state.player.x = loot.x;
    world.state.player.y = loot.y;
    world.step(STEP, { x: 0, y: 0 }, false);
  }
  return { screen: SCREEN_PLAY, best: world.state.lootValue };
}
