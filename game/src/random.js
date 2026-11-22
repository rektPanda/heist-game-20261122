// A small seeded random generator (mulberry32) so a ?seed=N run of the game
// always plays the same way: screenshots and autopilot tests are reproducible.

/** Returns a function that yields a deterministic number in [0, 1) on every call. */
export function createRandom(seed) {
  // A zero seed is replaced with a fixed non-zero state so it still varies.
  let state = (seed >>> 0) || 0x9e3779b9;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
