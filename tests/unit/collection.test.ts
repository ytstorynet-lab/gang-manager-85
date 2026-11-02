import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { entryText } from '../../src/report/collection-report';
import {
  ROLES,
  TUNING,
  generateCrew,
  runCollection,
  type Approach,
  type CollectionPlan,
  type CollectionResult,
} from '../../src/sim/jobs/collection';
import { createRng, type Rng } from '../../src/sim/rng';
import { BEACH_STRIP, BEACH_STRIP_BUSINESSES } from '../../src/sim/world';

interface Job {
  readonly plan: CollectionPlan;
  readonly result: CollectionResult;
}

function playJob(rng: Rng, quality: number, approach?: Approach): Job {
  const plan: CollectionPlan = {
    crew: generateCrew(rng, quality),
    approach: approach ?? rng.pick(['quiet', 'loud'] as const),
    business: rng.pick(BEACH_STRIP_BUSINESSES),
    district: BEACH_STRIP,
  };
  return { plan, result: runCollection(plan, rng) };
}

function playMany(seed: string, count: number, quality: number, approach?: Approach) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => playJob(rng, quality, approach).result);
}

const shareOf = (results: CollectionResult[], test: (result: CollectionResult) => boolean) =>
  results.filter(test).length / results.length;

const averageOf = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

describe('the collection', () => {
  it('plays out the same way every time for the same seed', () => {
    const first = playJob(createRng('replay'), 10);
    const second = playJob(createRng('replay'), 10);
    expect(second).toEqual(first);
  });

  it('goes better for better crews', () => {
    const poor = playMany('poor crews', 3000, 6);
    const good = playMany('good crews', 3000, 14);
    const clean = (result: CollectionResult) => result.outcome === 'clean';
    const busted = (result: CollectionResult) => result.outcome === 'busted';

    expect(shareOf(good, clean)).toBeGreaterThan(shareOf(poor, clean) + 0.2);
    expect(shareOf(good, busted)).toBeLessThan(shareOf(poor, busted) / 2);
    expect(averageOf(good.map((result) => result.money))).toBeGreaterThan(
      averageOf(poor.map((result) => result.money)),
    );
  });

  it('pays more but draws more heat when an average crew goes loud', () => {
    const quiet = playMany('approach', 5000, 10, 'quiet');
    const loud = playMany('approach', 5000, 10, 'loud');

    expect(averageOf(loud.map((result) => result.money))).toBeGreaterThan(
      averageOf(quiet.map((result) => result.money)) * 1.05,
    );
    expect(averageOf(loud.map((result) => result.heat))).toBeGreaterThan(
      averageOf(quiet.map((result) => result.heat)) * 1.5,
    );
  });

  it('runs 100,000 jobs without breaking its own rules', () => {
    const rng = createRng('soak');
    const problems: string[] = [];

    for (let i = 0; i < 100_000 && problems.length < 20; i++) {
      const { plan, result } = playJob(rng, rng.int(1, 20));
      const ids = ROLES.map((role) => plan.crew[role].id);
      const mostPossible = Math.round(plan.business.envelope * TUNING.lateFee);
      const fail = (problem: string) => problems.push(`job ${i}: ${problem}`);

      if (result.money < 0 || result.money + result.skimmed > mostPossible) fail('money');
      if (result.skimmed < 0) fail('skimmed');
      if (result.heat < 0) fail('heat');
      if ((result.outcome === 'busted') !== result.arrests.length > 0) fail('busted');
      if (result.outcome === 'botched' && result.money !== 0) fail('botched');
      if (result.outcome === 'clean' && result.injuries.length > 0) fail('clean');
      if (new Set(result.arrests).size !== result.arrests.length) fail('arrests');
      if (result.arrests.some((id) => !ids.includes(id))) fail('arrested stranger');
      if (result.injuries.some((injury) => !ids.includes(injury.memberId)))
        fail('injured stranger');
      for (const role of ROLES) {
        const rating = result.ratings[role];
        if (!(rating >= 1 && rating <= 10)) fail(`rating ${rating}`);
      }
      result.log.forEach((entry, index) => {
        const previous = result.log[index - 1];
        if (previous && entry.minute < previous.minute) fail('time ran backwards');
      });
    }

    expect(problems).toEqual([]);
  });

  it('writes every line of the play-by-play in full, and every line can happen', () => {
    const rng = createRng('every line');
    const seen = new Set<string>();
    const unfinished: string[] = [];

    for (let i = 0; i < 20_000; i++) {
      for (const entry of playJob(rng, rng.int(1, 20)).result.log) {
        seen.add(entry.key);
        const line = entryText(entry);
        if (/\{\w+\}/.test(line)) unfinished.push(line);
      }
    }

    expect(unfinished).toEqual([]);
    const neverUsed = Object.keys(en).filter(
      (key) => key.startsWith('collection.') && !seen.has(key),
    );
    expect(neverUsed).toEqual([]);
  });
});
