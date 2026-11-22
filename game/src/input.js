// Keyboard and mouse input. Held keys steer the thief; Shift sneaks;
// one-shot presses (start, restart, pause) are queued as bit flags and
// taken once by the loop, so a press between two frames is never lost and
// never counted twice. A mouse click sets a walk target the thief heads for.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target, toField) {
  const held = { up: false, down: false, left: false, right: false, sneak: false };
  let actions = 0;
  let clickTarget = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.sneak = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
    else if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.sneak = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    held.up = false;
    held.down = false;
    held.left = false;
    held.right = false;
    held.sneak = false;
  });
  target.addEventListener('pointerdown', (event) => {
    // A click both confirms (starts the game from a panel) and, during play,
    // sets the walk target. The loop clears the target when keys take over.
    actions |= ACTION_CONFIRM;
    if (toField) clickTarget = toField(event.clientX, event.clientY);
  });

  return {
    /** {x, y} steering from held keys, or null when no key is held. */
    keyDirection() {
      const x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (x === 0 && y === 0) return null;
      return { x, y };
    },
    sneaking() {
      return held.sneak;
    },
    /** The click-to-walk target, or null; consumed by the loop each frame. */
    takeClickTarget() {
      const targetPoint = clickTarget;
      clickTarget = null;
      return targetPoint;
    },
    clearClickTarget() {
      clickTarget = null;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
