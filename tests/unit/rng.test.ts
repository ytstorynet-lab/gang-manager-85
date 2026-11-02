import { describe, expect, it } from 'vitest';
import { createRng, restoreRng } from '../../src/sim/rng';

function take<T>(count: number, next: () => T): T[] {
  return Array.from({ length: count }, next);
}

describe('seeded random numbers', () => {
  it('gives the same numbers for the same seed', () => {
    const first = createRng('rico-city-1985');
    const second = createRng('rico-city-1985');
    expect(take(1000, first.next)).toEqual(take(1000, second.next));
  });

  it('gives different numbers for different seeds', () => {
    const first = createRng('seed-a');
    const second = createRng('seed-b');
    expect(take(10, first.next)).not.toEqual(take(10, second.next));
  });

  it('treats a number seed like its text', () => {
    expect(take(5, createRng(42).next)).toEqual(take(5, createRng('42').next));
  });

  it('stays between 0 and 1 and averages about a half', () => {
    const rng = createRng('average');
    const values = take(100_000, rng.next);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean).toBeCloseTo(0.5, 2);
  });

  it('carries on exactly from a saved state', () => {
    const rng = createRng('save-game');
    take(500, rng.next);
    const saved = rng.state();
    const expected = take(100, rng.next);
    expect(take(100, restoreRng(saved).next)).toEqual(expected);
  });

  it('rolls whole numbers within the range, both ends included', () => {
    const rng = createRng('dice');
    const rolls = take(10_000, () => rng.int(1, 6));
    expect(new Set(rolls)).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  it('rejects a backwards or fractional range', () => {
    const rng = createRng('bad-range');
    expect(() => rng.int(6, 1)).toThrow(RangeError);
    expect(() => rng.int(0.5, 2)).toThrow(RangeError);
  });

  it('respects the extremes of chance()', () => {
    const rng = createRng('chance');
    expect(take(1000, () => Number(rng.chance(0))).every((value) => value === 0)).toBe(true);
    expect(take(1000, () => Number(rng.chance(1))).every((value) => value === 1)).toBe(true);
  });

  it('picks every item eventually and refuses an empty list', () => {
    const rng = createRng('pick');
    const crew = ['Dee', 'Tommy', 'Hector', 'Benny'];
    expect(new Set(take(1000, () => rng.pick(crew)))).toEqual(new Set(crew));
    expect(() => rng.pick([])).toThrow(RangeError);
  });
});
