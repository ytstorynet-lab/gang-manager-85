/**
 * Seeded random numbers for the simulation.
 *
 * Everything random in the simulation comes from here, never from Math.random(),
 * so a game can be replayed exactly from its seed. That lets the tests play thousands
 * of simulated years and get the same result every time, and lets a saved game resume
 * exactly where it left off.
 *
 * The generator is sfc32, seeded by hashing the seed text with cyrb128.
 */

/** The generator's full state: four unsigned 32-bit numbers. Safe to store in a save file. */
export type RngState = readonly [number, number, number, number];

export interface Rng {
  /** A number from 0 up to, but not including, 1. */
  next(): number;
  /** A whole number from min to max, both included. */
  int(min: number, max: number): number;
  /** True with the given probability, from 0 (never) to 1 (always). */
  chance(probability: number): boolean;
  /** One item from the list. Throws if the list is empty. */
  pick<T>(items: readonly T[]): T;
  /** A copy of the current state, for saving the game. */
  state(): RngState;
}

/** Hashes seed text into four 32-bit numbers (cyrb128). */
function hashSeed(seed: string): RngState {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Restores a generator from a saved state. */
export function restoreRng(saved: RngState): Rng {
  let [a, b, c, d] = saved;

  function next(): number {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  return {
    next,
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
        throw new RangeError(`int() needs whole numbers with min <= max, got ${min} and ${max}`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(probability) {
      return next() < probability;
    },
    pick(items) {
      if (items.length === 0) {
        throw new RangeError('pick() needs at least one item');
      }
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    state() {
      return [a >>> 0, b >>> 0, c >>> 0, d >>> 0];
    },
  };
}

/** Creates a generator from seed text or a number. The same seed always gives the same numbers. */
export function createRng(seed: string | number): Rng {
  const rng = restoreRng(hashSeed(String(seed)));
  // Throw away the first outputs so similar seeds quickly drift apart.
  for (let i = 0; i < 15; i++) {
    rng.next();
  }
  return rng;
}
