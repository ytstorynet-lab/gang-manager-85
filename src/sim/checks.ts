import type { Rng } from './rng';

export interface CheckResult {
  readonly success: boolean;
  /** How far above (or below, if negative) the difficulty the total landed. */
  readonly margin: number;
  /** The die roll on its own, 1 to 20. A 1 is a blunder and a 20 a moment of brilliance. */
  readonly roll: number;
}

/**
 * A skill check: a 20-sided die plus the skill (and any bonus) against a difficulty.
 * Each point of skill is worth 5% more chance, so a skill of 10 against a difficulty
 * of 21 succeeds half the time, and a skill of 15 succeeds three times in four.
 */
export function check(rng: Rng, skill: number, difficulty: number, bonus = 0): CheckResult {
  const roll = rng.int(1, 20);
  const margin = roll + skill + bonus - difficulty;
  return { success: margin >= 0, margin, roll };
}

/** A normally distributed number around `mean`, from the seeded generator (Box-Muller). */
export function normal(rng: Rng, mean: number, spread: number): number {
  const u = 1 - rng.next();
  const v = rng.next();
  return mean + spread * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
