// Movement and collision for circles (thief, guards) against the room's
// walls and outer bounds. Movement is resolved axis by axis, so sliding
// along a wall feels natural instead of sticking to corners.
import { ROOM } from './config.js';

function circleHitsRect(x, y, radius, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < radius * radius;
}

/** True when a circle at (x,y) overlaps any wall or leaves the room. */
export function circleBlocked(x, y, radius, walls) {
  if (x - radius < ROOM.x || x + radius > ROOM.x + ROOM.width) return true;
  if (y - radius < ROOM.y || y + radius > ROOM.y + ROOM.height) return true;
  for (const wall of walls) {
    if (circleHitsRect(x, y, radius, wall)) return true;
  }
  return false;
}

/**
 * Move a circle by (dx,dy), sliding along walls: try the full step, then
 * each axis alone, then stay put. Returns the position actually reached.
 * The room bounds count as walls, so nothing ever leaves the room.
 */
export function moveCircle(body, dx, dy, walls) {
  const nx = body.x + dx;
  const ny = body.y + dy;
  if (!circleBlocked(nx, ny, body.radius, walls)) {
    body.x = nx;
    body.y = ny;
    return;
  }
  if (!circleBlocked(nx, body.y, body.radius, walls)) {
    body.x = nx;
    return;
  }
  if (!circleBlocked(body.x, ny, body.radius, walls)) {
    body.y = ny;
  }
}
