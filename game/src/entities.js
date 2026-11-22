// The moving threats: patrolling guards and sweeping wall cameras.
// Guards walk their waypoint loop and face where they walk; when the alarm
// climbs past the chase threshold they abandon patrol and run at the thief.
// Cameras sit on the wall and sweep their cone back and forth.
import { CAMERA, GUARD } from './config.js';
import { moveCircle } from './physics.js';
import { inVisionCone } from './vision.js';

export function createGuard(def) {
  const first = def.waypoints[0];
  return {
    x: first.x,
    y: first.y,
    radius: GUARD.radius,
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    angle: 0,
    seesThief: false,
    chasing: false,
  };
}

export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    angle: def.baseAngle,
    sweepPhase: 0,
    seesThief: false,
  };
}

/** Walk one guard a step: patrol its loop, or chase the thief when alarmed. */
export function updateGuard(guard, dt, player, walls, alarm) {
  // Chasing overrides the patrol loop; the guard returns to patrol once the
  // alarm cools back down below the chase threshold.
  const chasing = alarm >= GUARD.chaseAlarm;
  guard.chasing = chasing;
  const speed = chasing ? GUARD.chaseSpeed : GUARD.patrolSpeed;
  let tx;
  let ty;
  if (chasing) {
    tx = player.x;
    ty = player.y;
  } else {
    const target = guard.waypoints[guard.waypointIndex];
    tx = target.x;
    ty = target.y;
    if (Math.hypot(tx - guard.x, ty - guard.y) < 6) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    }
  }
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 0.5) {
    const step = Math.min(dist, speed * dt);
    const mx = (dx / dist) * step;
    const my = (dy / dist) * step;
    moveCircle(guard, mx, my, walls);
    guard.angle = Math.atan2(dy, dx);
  }
}

/** Sweep one camera head a step: a sine sweep around its base angle. */
export function updateCamera(camera, dt) {
  camera.sweepPhase += dt * CAMERA.sweepSpeed;
  camera.angle = camera.baseAngle + Math.sin(camera.sweepPhase) * camera.sweep;
}

/** True when this guard's cone currently holds the thief. */
export function guardSeesThief(guard, player, walls) {
  return inVisionCone(player.x, player.y, guard.x, guard.y, guard.angle, GUARD.visionRange, GUARD.visionHalfAngle, walls);
}

/** True when this camera's cone currently holds the thief. */
export function cameraSeesThief(camera, player, walls) {
  return inVisionCone(player.x, player.y, camera.x, camera.y, camera.angle, CAMERA.visionRange, CAMERA.visionHalfAngle, walls);
}
