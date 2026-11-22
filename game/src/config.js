// Midnight Heist — every tuning number and colour in one place.
// The whole heist room fits one 1280x720 logical field: no camera scroll,
// so one screenshot frame always shows the thief, the guards, the cameras,
// the loot and the alarm meter together.
export const FIELD = { width: 1280, height: 720 };

// The room the thief crosses: inset below the HUD strip at the top.
export const ROOM = { x: 16, y: 84, width: 1248, height: 620 };
export const HUD_HEIGHT = 72;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  speed: 215,
  sneakSpeed: 115,
  pickupRadius: 30,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 72,
  chaseSpeed: 138,
  visionRange: 235,
  visionHalfAngle: 0.62,
  /** Alarm points per second while this guard has the thief in its cone. */
  alarmRate: 42,
  /** Alarm above this makes guards leave patrol and chase the thief. */
  chaseAlarm: 55,
  /** Touching a guard ends the heist at once. */
  catchRadius: 30,
};

export const CAMERA = {
  visionRange: 285,
  visionHalfAngle: 0.48,
  /** Alarm points per second while a camera has the thief in its cone. */
  alarmRate: 30,
  /** Degrees per second the camera head sweeps. */
  sweepSpeed: 0.55,
};

export const ALARM = {
  max: 100,
  /** Points per second the alarm falls while nobody sees the thief. */
  decay: 9,
  /** Sneaking halves how fast being seen raises the alarm. */
  sneakFactor: 0.5,
  /** Alarm at or above this turns every guard's patrol into a chase. */
  chaseThreshold: 55,
};

/** Loot values in dollars: diamond > safe > gold bar > cash stack. */
export const LOOT_VALUE = { cash: 300, gold: 500, safe: 800, diamond: 1200 };

/** How long, in seconds, the "level clear" banner shows before the next room. */
export const LEVEL_CLEAR_PAUSE = 1.6;

/** Where the best total loot is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-heist.best-loot';

export const PALETTE = {
  backdrop: '#0b0d12',
  floor: '#1a1d27',
  floorTile: '#20242f',
  wall: '#3a4152',
  wallTrim: '#c9a227',
  hud: '#12141c',
  hudLine: '#2c3140',
  text: '#eef1f5',
  muted: '#9aa1b2',
  gold: '#f2c94c',
  goldDark: '#c9a227',
  diamond: '#7fe7f2',
  cash: '#7fce7f',
  safe: '#b9c0cf',
  player: '#111111',
  playerTrim: '#f2c94c',
  guard: '#3d5a80',
  guardAlert: '#e5534b',
  cone: 'rgba(242, 201, 76, 0.20)',
  coneAlert: 'rgba(229, 83, 75, 0.30)',
  cameraCone: 'rgba(127, 231, 242, 0.16)',
  exit: '#37c978',
  exitLocked: '#5a6478',
  alarmLow: '#37c978',
  alarmMid: '#f2c94c',
  alarmHigh: '#e5534b',
  panel: '#171a23',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
