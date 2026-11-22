// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens:
// title, play, paused, caught and clean getaway (win).
//
// ?seed=N fixes the run. ?shot=start|play|mid|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. ?autopilot=1 lets the autopilot
// play the live game on its own.
import { BEST_KEY, PLAYER, STEP } from './config.js';
import { createRandom } from './random.js';
import { EVENT_CAUGHT, EVENT_LEVEL, EVENT_LOOT, EVENT_SPOTTED, EVENT_WON, STATUS_CAUGHT, STATUS_LEVEL_CLEAR, STATUS_WON, createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { autopilotMove } from './autopilot.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const autopilotOn = params.get('autopilot') === '1';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best haul then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toField(x, y));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let clickTarget = null;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each catch.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    clickTarget = null;
    screen = SCREEN_PLAY;
    announce('Playing. Take every loot, then reach the exit. Stay out of the cones.');
  }

  function endRun() {
    screen = world.state.status === STATUS_WON ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.totalLoot > best) {
      best = world.state.totalLoot;
      saveBest(best);
    }
    announce(world.state.status === STATUS_WON ? `Clean getaway! Total haul $${world.state.totalLoot}.` : `Caught! Loot $${world.state.lootValue}. Best $${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The title screen's backdrop: guards patrol, nobody is hunted.
      // If the backdrop thief ever gets caught, restart the backdrop fresh.
      const { move } = autopilotMove(world.state, STEP, PLAYER.speed);
      world.step(STEP, move, false);
      if (world.state.status === STATUS_CAUGHT) world.reset();
      return;
    }
    let move;
    let sneak = input.sneaking();
    const keys = input.keyDirection();
    if (keys !== null) {
      move = keys;
      clickTarget = null;
    } else if (autopilotOn) {
      const auto = autopilotMove(world.state, STEP, PLAYER.speed);
      move = auto.move;
      sneak = auto.sneak;
    } else {
      const target = input.takeClickTarget();
      if (target !== null) clickTarget = target;
      if (clickTarget !== null) {
        const dx = clickTarget.x - world.state.player.x;
        const dy = clickTarget.y - world.state.player.y;
        if (Math.hypot(dx, dy) < 10) clickTarget = null;
        else move = { x: dx, y: dy };
      } else {
        move = { x: 0, y: 0 };
      }
    }
    const events = world.step(STEP, move, sneak);
    if (events & EVENT_LOOT) announce(`Loot taken. $${world.state.lootValue} so far.`);
    else if (events & EVENT_SPOTTED) announce('Spotted! The alarm is climbing.');
    if (events & EVENT_LEVEL) announce(`Room clear! $${world.state.lootValue} pocketed. Next room.`);
    if (events & (EVENT_CAUGHT | EVENT_WON)) endRun();
    if (world.state.status === STATUS_LEVEL_CLEAR) {
      // The banner shows while the world counts down to the next room.
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Midnight Heist. Press Space or click to start the job.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

// Test hook: drive the world straight from the console (used by the
// headless play-test; harmless in normal play). autoPlay runs the autopilot
// for up to `seconds` of game time and reports where the run ended.
window.__heist = {
  world,
  autopilotMove,
  autoPlay(seconds) {
    for (let i = 0; i < seconds / STEP; i += 1) {
      const { move, sneak } = autopilotMove(world.state, STEP, PLAYER.speed);
      const events = world.step(STEP, move, sneak);
      if (events & EVENT_CAUGHT) break;
      if (world.state.status === STATUS_WON) break;
    }
    const s = world.state;
    return { status: s.status, level: s.levelIndex + 1, lootTaken: s.lootTaken, lootTotal: s.lootTotal, lootValue: s.lootValue, totalLoot: s.totalLoot, alarm: Math.round(s.alarm), elapsed: Math.round(s.elapsed) };
  },
};
