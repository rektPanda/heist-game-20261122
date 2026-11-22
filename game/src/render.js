// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred. One frame
// shows the whole room: floor tiles and walls, the thief, every guard with
// its vision cone, every sweeping camera with its cone, the loot, the exit
// door, and the HUD strip with the loot total, the alarm meter, the level
// and the timer. Flat shapes and canvas text, no assets, no network.
import { CAMERA, FIELD, FONT, GUARD, HUD_HEIGHT, PALETTE, ROOM } from './config.js';
import { STATUS_CAUGHT, STATUS_LEVEL_CLEAR, STATUS_WON } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 140, line: 32, bottom: 76 };
const TILE = 62;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function formatDollars(value) {
  return `$${value.toLocaleString('en-US')}`;
}

function alarmColour(alarm) {
  if (alarm >= 70) return PALETTE.alarmHigh;
  if (alarm >= 35) return PALETTE.alarmMid;
  return PALETTE.alarmLow;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawCone(x, y, angle, range, halfAngle, colour) {
    context.fillStyle = colour;
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    context.closePath();
    context.fill();
  }

  function drawLoot(item) {
    if (item.taken) return;
    const { x, y } = item;
    if (item.kind === 'gold') {
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.moveTo(x - 13, y + 8);
      context.lineTo(x - 9, y - 8);
      context.lineTo(x + 9, y - 8);
      context.lineTo(x + 13, y + 8);
      context.closePath();
      context.fill();
      context.fillStyle = PALETTE.goldDark;
      context.fillRect(x - 9, y - 2, 18, 3);
    } else if (item.kind === 'cash') {
      context.fillStyle = PALETTE.cash;
      context.fillRect(x - 13, y - 8, 26, 16);
      context.fillStyle = '#2c5a2c';
      context.beginPath();
      context.arc(x, y, 5, 0, Math.PI * 2);
      context.fill();
    } else if (item.kind === 'diamond') {
      context.fillStyle = PALETTE.diamond;
      context.beginPath();
      context.moveTo(x, y - 12);
      context.lineTo(x + 11, y - 2);
      context.lineTo(x + 7, y + 11);
      context.lineTo(x - 7, y + 11);
      context.lineTo(x - 11, y - 2);
      context.closePath();
      context.fill();
      context.fillStyle = '#ffffff';
      context.fillRect(x - 3, y - 8, 6, 4);
    } else {
      // safe: steel box with a dial
      context.fillStyle = PALETTE.safe;
      context.fillRect(x - 13, y - 13, 26, 26);
      context.fillStyle = '#4a5160';
      context.beginPath();
      context.arc(x, y, 6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.gold;
      context.fillRect(x - 2, y - 2, 4, 4);
    }
    text(formatDollars(item.value), x, y + 30, 13, PALETTE.muted, 'center');
  }

  function drawRoom(state, exitIsOpen) {
    // Floor with a tile grid.
    context.fillStyle = PALETTE.floor;
    context.fillRect(ROOM.x, ROOM.y, ROOM.width, ROOM.height);
    context.strokeStyle = PALETTE.floorTile;
    context.lineWidth = 1;
    context.beginPath();
    for (let x = ROOM.x + TILE; x < ROOM.x + ROOM.width; x += TILE) {
      context.moveTo(x, ROOM.y);
      context.lineTo(x, ROOM.y + ROOM.height);
    }
    for (let y = ROOM.y + TILE; y < ROOM.y + ROOM.height; y += TILE) {
      context.moveTo(ROOM.x, y);
      context.lineTo(ROOM.x + ROOM.width, y);
    }
    context.stroke();
    // Room border.
    context.strokeStyle = PALETTE.wallTrim;
    context.lineWidth = 3;
    context.strokeRect(ROOM.x, ROOM.y, ROOM.width, ROOM.height);

    // Vision cones first, so walls drawn over them hide the hidden part.
    for (const guard of state.guards) drawGuardConeOnly(guard);
    for (const camera of state.cameras) drawCameraConeOnly(camera);

    // Walls: display cases, shelves and vaults.
    for (const wall of state.level.walls) {
      context.fillStyle = PALETTE.wall;
      context.fillRect(wall.x, wall.y, wall.w, wall.h);
      context.strokeStyle = PALETTE.wallTrim;
      context.lineWidth = 2;
      context.strokeRect(wall.x, wall.y, wall.w, wall.h);
    }

    // Exit door on the room's edge.
    const exit = state.level.exit;
    context.fillStyle = exitIsOpen ? PALETTE.exit : PALETTE.exitLocked;
    context.fillRect(exit.x, exit.y, exit.w, exit.h);
    text('EXIT', exit.x + exit.w / 2, exit.y + exit.h / 2 + 5, 13, '#0b0d12', 'center');

    for (const item of state.loot) drawLoot(item);
    for (const guard of state.guards) drawGuardBodyOnly(guard);
    for (const camera of state.cameras) drawCameraBodyOnly(camera);

    // The thief: black-clad figure with a gold-trimmed mask band.
    const player = state.player;
    {
      context.fillStyle = PALETTE.player;
      context.beginPath();
      context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.playerTrim;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = PALETTE.playerTrim;
      context.fillRect(player.x - 9, player.y - 4, 18, 5);
      context.fillStyle = '#ffffff';
      context.fillRect(player.x - 6, player.y - 2, 3, 2);
      context.fillRect(player.x + 3, player.y - 2, 3, 2);
    }
    // A gold YOU tag marks the thief, so the player is unmistakable even
    // at a glance; while sneaking the tag says so instead.
    if (player.sneaking) text('SNEAKING', player.x, player.y - 24, 12, PALETTE.muted, 'center');
    else text('YOU', player.x, player.y - 24, 12, PALETTE.gold, 'center');
  }

  // Cones and bodies are drawn in two passes (cones under walls, bodies over),
  // so a wall between the watcher and the thief hides the cone behind it.
  function drawGuardConeOnly(guard) {
    drawCone(guard.x, guard.y, guard.angle, GUARD.visionRange, GUARD.visionHalfAngle, guard.seesThief ? PALETTE.coneAlert : PALETTE.cone);
  }
  function drawCameraConeOnly(camera) {
    drawCone(camera.x, camera.y, camera.angle, CAMERA.visionRange, CAMERA.visionHalfAngle, PALETTE.cameraCone);
  }
  function drawGuardBodyOnly(guard) {
    context.fillStyle = guard.seesThief ? PALETTE.guardAlert : PALETTE.guard;
    context.beginPath();
    context.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#dfe6f2';
    context.beginPath();
    context.arc(guard.x + Math.cos(guard.angle) * 7, guard.y + Math.sin(guard.angle) * 7, 5, 0, Math.PI * 2);
    context.fill();
    if (guard.seesThief) text('!', guard.x, guard.y - 24, 26, PALETTE.alarmHigh, 'center');
    else if (guard.chasing) text('?', guard.x, guard.y - 24, 24, PALETTE.gold, 'center');
  }
  function drawCameraBodyOnly(camera) {
    context.fillStyle = '#39404f';
    context.fillRect(camera.x - 11, camera.y - 8, 22, 16);
    context.fillStyle = camera.seesThief ? PALETTE.alarmHigh : PALETTE.diamond;
    context.beginPath();
    context.arc(camera.x + Math.cos(camera.angle) * 10, camera.y + Math.sin(camera.angle) * 10, 4, 0, Math.PI * 2);
    context.fill();
  }

  function drawHud(state) {
    context.fillStyle = PALETTE.hud;
    context.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
    context.fillStyle = PALETTE.hudLine;
    context.fillRect(0, HUD_HEIGHT, FIELD.width, 2);
    text('MIDNIGHT HEIST', 24, 32, 26, PALETTE.gold, 'left');
    text(state.level.name, 24, 58, 16, PALETTE.muted, 'left');
    text(`LOOT ${formatDollars(state.lootValue)}`, 300, 32, 22, PALETTE.text, 'left');
    text(`${state.lootTaken}/${state.lootTotal} taken`, 300, 58, 15, PALETTE.muted, 'left');
    // Alarm meter: the big bar the whole heist hangs on.
    text('ALARM', 560, 32, 20, state.spotted ? PALETTE.alarmHigh : PALETTE.text, 'left');
    context.fillStyle = '#232733';
    context.fillRect(650, 18, 260, 24);
    context.fillStyle = alarmColour(state.alarm);
    context.fillRect(650, 18, Math.max(0, (260 * state.alarm) / 100), 24);
    context.strokeStyle = PALETTE.hudLine;
    context.lineWidth = 2;
    context.strokeRect(650, 18, 260, 24);
    text(`${Math.floor(state.alarm)}%`, 920, 38, 18, alarmColour(state.alarm), 'left');
    if (state.spotted) text('SPOTTED!', 650, 62, 17, PALETTE.alarmHigh, 'left');
    else if (state.alarm > 0) text('cooling down…', 650, 62, 15, PALETTE.muted, 'left');
    text(`TIME ${formatTime(state.elapsed)}`, 1010, 32, 20, PALETTE.text, 'left');
    text(state.lootTaken >= state.lootTotal ? 'EXIT IS OPEN — RUN!' : 'Clear every loot to open the exit', 1010, 58, 15, state.lootTaken >= state.lootTotal ? PALETTE.exit : PALETTE.muted, 'left');
  }

  function drawPanel(title, lines, prompt, titleColour) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.goldDark;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    text(title, FIELD.width / 2, y + 72, 44, titleColour || PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 36, 22, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'Slip through three rooms. Take every loot. Reach the exit.',
    'Guards patrol with vision cones — cameras sweep theirs.',
    'Seen? The ALARM climbs. Full alarm, or a guard\'s touch, ends the run.',
    'WASD / arrows to move — hold Shift to sneak, click to walk there.',
    'Gold $500 · Cash $300 · Safe $800 · Diamond $1,200',
    '',
  ];
  const PAUSED_LINES = ['The guards wait for no one. Well — right now they do.'];
  const CAUGHT_LINES = ['', '', ''];
  const WIN_LINES = ['', '', ''];

  /** Paint one frame: the room, then the HUD, then a panel for the screen. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawRoom(state, state.lootTaken >= state.lootTotal);
    drawHud(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = `Best haul: ${formatDollars(best)}`;
      drawPanel('MIDNIGHT HEIST', TITLE_LINES, 'Press Space or click to start the job', PALETTE.gold);
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to keep sneaking');
    } else if (screen === SCREEN_OVER) {
      CAUGHT_LINES[0] = `Caught on ${state.level.name} — the alarm hit ${Math.floor(state.alarm)}%.`;
      CAUGHT_LINES[1] = `Loot this run: ${formatDollars(state.lootValue)}  ·  Best haul: ${formatDollars(best)}`;
      CAUGHT_LINES[2] = 'The crew is already planning the next job…';
      drawPanel('CAUGHT!', CAUGHT_LINES, 'Press Space or click to try again', PALETTE.alarmHigh);
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = 'Three rooms, three clean getaways. Nobody saw a thing.';
      WIN_LINES[1] = `Total haul: ${formatDollars(state.totalLoot)} in ${formatTime(state.elapsed)}`;
      WIN_LINES[2] = `Best haul: ${formatDollars(best)}`;
      drawPanel('CLEAN GETAWAY!', WIN_LINES, 'Press Space or click to run it again', PALETTE.exit);
    } else if (state.status === STATUS_LEVEL_CLEAR) {
      drawPanel('ROOM CLEAR!', [`${formatDollars(state.lootValue)} pocketed in ${state.level.name}.`, 'Next room: more guards, more cameras, richer loot.'], 'Get ready…', PALETTE.exit);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** Convert a client (mouse) point to field coordinates, or null outside. */
    toField(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * FIELD.width;
      const y = ((clientY - rect.top) / rect.height) * FIELD.height;
      return { x, y };
    },
  };
}
