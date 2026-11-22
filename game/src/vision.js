// Line of sight and vision cones: the stealth heart of the game.
// A guard or camera sees the thief only when the thief is inside its cone
// AND no wall stands between them. Walls are rectangles; the segment test
// below is exact, not sampled, so hiding behind a display case always works.

/** Smallest absolute difference between two angles, in radians. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** True when the segment (x1,y1)-(x2,y2) touches or crosses a rectangle. */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
  const { x, y, w, h } = rect;
  return (
    segmentsCross(x1, y1, x2, y2, x, y, x + w, y) ||
    segmentsCross(x1, y1, x2, y2, x + w, y, x + w, y + h) ||
    segmentsCross(x1, y1, x2, y2, x + w, y + h, x, y + h) ||
    segmentsCross(x1, y1, x2, y2, x, y + h, x, y)
  );
}

/** True when no wall blocks the straight line between two points. */
export function lineOfSightClear(x1, y1, x2, y2, walls) {
  // A wall the segment merely grazes still counts as cover: hiding is reliable.
  for (const wall of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, wall)) return false;
  }
  return true;
}

/**
 * True when a watcher at (ox,oy) facing `angle` can see point (px,py):
 * inside range, inside the half-angle, and with a clear line of sight.
 */
export function inVisionCone(px, py, ox, oy, angle, range, halfAngle, walls) {
  const dx = px - ox;
  const dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  if (angleDifference(Math.atan2(dy, dx), angle) > halfAngle) return false;
  return lineOfSightClear(ox, oy, px, py, walls);
}
