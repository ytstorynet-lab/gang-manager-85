import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { entryText } from '../../src/report/collection-report';
import {
  ROLES,
  TUNING,
  generateCrew,
  playCollection,
  runCollection,
  type Approach,
  type Beat,
  type Call,
  type CollectionKey,
  type CollectionPlan,
  type CollectionResult,
} from '../../src/sim/jobs/collection';
import { createRng, restoreRng, type Rng } from '../../src/sim/rng';
import { BEACH_STRIP, BEACH_STRIP_BUSINESSES } from '../../src/sim/world';

/** Decides the boss's call for each beat. Returning nothing lets the crew carry on. */
type Caller = (beat: Beat) => Call | undefined;

interface Job {
  readonly plan: CollectionPlan;
  readonly result: CollectionResult;
  /** The generator's state just before the job started, for replaying it. */
  readonly start: ReturnType<Rng['state']>;
}

function makePlan(rng: Rng, quality: number, approach?: Approach): CollectionPlan {
  return {
    crew: generateCrew(rng, quality),
    approach: approach ?? rng.pick(['quiet', 'loud'] as const),
    business: rng.pick(BEACH_STRIP_BUSINESSES),
    district: BEACH_STRIP,
  };
}

/** Plays a job beat by beat, the way the game does, asking `caller` after every beat. */
function playJob(rng: Rng, quality: number, approach?: Approach, caller?: Caller): Job {
  const plan = makePlan(rng, quality, approach);
  const start = rng.state();
  const play = playCollection(plan, rng);
  let step = play.next();
  while (!step.done) {
    step = play.next(caller?.(step.value));
  }
  return { plan, result: step.value, start };
}

function playMany(seed: string, count: number, quality: number, approach?: Approach) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => playJob(rng, quality, approach).result);
}

/** A boss who makes random calls, using a generator of their own so the job's rolls don't change. */
function randomCaller(seed: string, chance = 0.3): Caller {
  const rng = createRng(seed);
  return (beat) => (beat.calls.length > 0 && rng.chance(chance) ? rng.pick(beat.calls) : undefined);
}

/** A boss who always makes one call, the first time it's offered. */
function firstChance(call: Call): Caller {
  let made = false;
  return (beat) => {
    if (made || !beat.calls.includes(call)) return undefined;
    made = true;
    return call;
  };
}

const shareOf = <T>(items: readonly T[], test: (item: T) => boolean) =>
  items.filter(test).length / items.length;

const averageOf = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const keysOf = (result: CollectionResult): CollectionKey[] => result.log.map((entry) => entry.key);

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

  it('gives the same result whether it is played beat by beat or all at once', () => {
    const rng = createRng('two ways');
    for (let i = 0; i < 500; i++) {
      const job = playJob(rng, rng.int(1, 20));
      expect(runCollection(job.plan, restoreRng(job.start))).toEqual(job.result);
    }
  });
});

describe('sideline calls', () => {
  it('replay exactly from the same seed and the same calls', () => {
    const rng = createRng('replays');
    const caller = randomCaller('replays: boss');
    let withCalls = 0;

    for (let i = 0; i < 3000; i++) {
      const job = playJob(rng, rng.int(1, 20), undefined, caller);
      if (job.result.calls.length > 0) withCalls++;
      const replay = runCollection(job.plan, restoreRng(job.start), job.result.calls);
      expect(replay).toEqual(job.result);
    }
    expect(withCalls).toBeGreaterThan(1000);
  });

  it('change nothing before the moment they are made', () => {
    const rng = createRng('before the call');
    const caller = randomCaller('before the call: boss', 0.5);

    for (let i = 0; i < 2000; i++) {
      const job = playJob(rng, rng.int(1, 20), undefined, caller);
      const first = job.result.calls[0];
      if (!first) continue;
      const untouched = runCollection(job.plan, restoreRng(job.start));
      expect(job.result.log.slice(0, first.beat + 1)).toEqual(
        untouched.log.slice(0, first.beat + 1),
      );
    }
  });

  it('only offer calls that make sense at that moment', () => {
    const rng = createRng('offers');
    const caller = randomCaller('offers: boss');
    const threats: readonly CollectionKey[] = [
      'collection.patrol.noticed',
      'collection.rivals.spotted',
      'collection.leave.rivalsExpected',
      'collection.leave.rivalsAmbush',
    ];
    const problems: string[] = [];

    for (let i = 0; i < 5000 && problems.length < 20; i++) {
      const plan = makePlan(rng, rng.int(1, 20));
      const play = playCollection(plan, rng);
      let goneLoud = plan.approach === 'loud';
      let money = false;
      let leaving = false;
      let step = play.next();
      while (!step.done) {
        const { entry, calls } = step.value;
        const key = entry.key;
        if ('amount' in entry.params) money = true;
        if (key.startsWith('collection.leave.') || key.startsWith('collection.lieLow.blocked')) {
          leaving = true;
        }
        if (calls.includes('pullOut') && (money || leaving)) problems.push(`pull out on ${key}`);
        if (calls.includes('goLoud') && (goneLoud || money || leaving)) {
          problems.push(`go loud on ${key}`);
        }
        if (calls.includes('lieLow') !== threats.includes(key)) problems.push(`lie low on ${key}`);
        if (calls.includes('goLoud') && key === 'collection.inside.lockedUp') {
          problems.push('go loud on a locked door');
        }
        if (key === 'collection.quiet.muscleStepsIn' || key === 'collection.goLoud.walksIn') {
          goneLoud = true;
        }
        step = play.next(caller(step.value));
      }
    }

    expect(problems).toEqual([]);
  });

  it('never end in arrests after pulling out, and nothing else happens', () => {
    const rng = createRng('pull out');
    const boss = createRng('pull out: boss');
    let pulledOut = 0;

    for (let i = 0; i < 5000; i++) {
      // Pull out at a random moment, whenever the chance comes up.
      const caller: Caller = (beat) =>
        beat.calls.includes('pullOut') && boss.chance(0.35) ? 'pullOut' : undefined;
      const { result } = playJob(rng, rng.int(1, 20), undefined, caller);
      const call = result.calls[0];
      if (!call) continue;
      pulledOut++;

      expect(result.outcome).toBe('calledOff');
      expect(result.money).toBe(0);
      expect(result.arrests).toEqual([]);
      const after = keysOf(result).slice(call.beat + 1);
      expect(after.every((key) => key.startsWith('collection.pullOut.'))).toBe(true);
    }
    expect(pulledOut).toBeGreaterThan(3000);
  });

  it('pay more and draw more heat when the boss sends the muscle into a quiet job', () => {
    const quiet = playMany('go loud', 5000, 10, 'quiet');
    const rng = createRng('go loud');
    const loud = Array.from(
      { length: 5000 },
      () => playJob(rng, 10, 'quiet', firstChance('goLoud')).result,
    );

    expect(loud.every((result) => result.calls[0]?.call === 'goLoud')).toBe(true);
    expect(averageOf(loud.map((result) => result.money))).toBeGreaterThan(
      averageOf(quiet.map((result) => result.money)) * 1.05,
    );
    expect(averageOf(loud.map((result) => result.heat))).toBeGreaterThan(
      averageOf(quiet.map((result) => result.heat)) * 1.5,
    );
  });

  it('keep the rivals away when the crew lies low after spotting them, but the owner notices', () => {
    const rng = createRng('lie low: rivals');
    const confronted = (result: CollectionResult) =>
      keysOf(result).some((key) => key.startsWith('collection.leave.rivals'));
    const spotted = (result: CollectionResult) =>
      keysOf(result).includes('collection.rivals.spotted');
    const waited: CollectionResult[] = [];
    const carriedOn: CollectionResult[] = [];

    for (let i = 0; i < 20_000; i++) {
      const lieLow = i % 2 === 0;
      const caller: Caller = (beat) =>
        lieLow && beat.entry.key === 'collection.rivals.spotted' ? 'lieLow' : undefined;
      const { result } = playJob(rng, 10, undefined, caller);
      if (spotted(result)) (lieLow ? waited : carriedOn).push(result);
    }

    expect(waited.length).toBeGreaterThan(500);
    expect(waited.some(confronted)).toBe(false);
    expect(shareOf(carriedOn, confronted)).toBeGreaterThan(0.3);
    // Every time, the owner either gets edgy or locks up for the night.
    const edgy = (result: CollectionResult) =>
      keysOf(result).includes('collection.inside.ownerEdgy');
    const lockedUp = (result: CollectionResult) =>
      keysOf(result).includes('collection.inside.lockedUp');
    expect(waited.every((result) => edgy(result) !== lockedUp(result))).toBe(true);
    expect(shareOf(waited, lockedUp)).toBeGreaterThan(0.1);
    expect(shareOf(waited, lockedUp)).toBeLessThan(0.35);
    expect(waited.filter(lockedUp).every((result) => result.money === 0)).toBe(true);
  });

  it('make a chase less likely when the crew lies low after the patrol noticed them', () => {
    const rng = createRng('lie low: patrol');
    const chased = (result: CollectionResult) => keysOf(result).includes('collection.leave.sirens');
    const noticed = (result: CollectionResult) =>
      keysOf(result).includes('collection.patrol.noticed');
    const waited: CollectionResult[] = [];
    const carriedOn: CollectionResult[] = [];

    for (let i = 0; i < 20_000; i++) {
      const lieLow = i % 2 === 0;
      const caller: Caller = (beat) =>
        lieLow && beat.entry.key === 'collection.patrol.noticed' ? 'lieLow' : undefined;
      const { result } = playJob(rng, 10, undefined, caller);
      if (noticed(result)) (lieLow ? waited : carriedOn).push(result);
    }

    // The patrol notices an average crew in about 3% of jobs.
    expect(waited.length).toBeGreaterThan(150);
    expect(shareOf(waited, chased)).toBeLessThan(shareOf(carriedOn, chased) / 2);
  });

  it('let the crew wait out rivals blocking the street, though they may still be there', () => {
    const rng = createRng('lie low: blocked');
    const blocked: CollectionResult[] = [];

    for (let i = 0; i < 20_000; i++) {
      const caller: Caller = (beat) => (beat.calls.includes('lieLow') ? 'lieLow' : undefined);
      const { result } = playJob(rng, 10, undefined, caller);
      if (keysOf(result).includes('collection.lieLow.blocked')) blocked.push(result);
    }

    expect(blocked.length).toBeGreaterThan(300);
    const showdown: readonly CollectionKey[] = [
      'collection.leave.handsOver',
      'collection.leave.rivalsBackOff',
      'collection.leave.rivalsTakeIt',
    ];
    const gaveUp = (result: CollectionResult) =>
      keysOf(result).includes('collection.lieLow.rivalsGiveUp');
    for (const result of blocked) {
      const keys = keysOf(result);
      const confronted = keys.some((key) => showdown.includes(key));
      // Either the rivals give up, or they're still there and it comes to a showdown.
      expect(confronted).toBe(!gaveUp(result));
      expect(keys.includes('collection.lieLow.rivalsWait')).toBe(!gaveUp(result));
    }
    expect(shareOf(blocked, gaveUp)).toBeGreaterThan(0.4);
    expect(shareOf(blocked, gaveUp)).toBeLessThan(0.7);
    const phoned = (result: CollectionResult) =>
      keysOf(result).includes('collection.lieLow.ownerPhones');
    expect(shareOf(blocked, phoned)).toBeGreaterThan(0.05);
    expect(shareOf(blocked, phoned)).toBeLessThan(0.6);
  });
});

describe('every job', () => {
  it('keeps to its own rules over 100,000 jobs with random calls', () => {
    const rng = createRng('soak');
    const caller = randomCaller('soak: boss', 0.15);
    const problems: string[] = [];

    for (let i = 0; i < 100_000 && problems.length < 20; i++) {
      const { plan, result } = playJob(rng, rng.int(1, 20), undefined, caller);
      const ids = ROLES.map((role) => plan.crew[role].id);
      const mostPossible = Math.round(plan.business.envelope * TUNING.lateFee);
      const fail = (problem: string) => problems.push(`job ${i}: ${problem}`);

      if (result.money < 0 || result.money + result.skimmed > mostPossible) fail('money');
      if (result.skimmed < 0) fail('skimmed');
      if (result.heat < 0) fail('heat');
      if ((result.outcome === 'busted') !== result.arrests.length > 0) fail('busted');
      if (result.outcome === 'botched' && result.money !== 0) fail('botched');
      if (result.outcome === 'calledOff' && (result.money !== 0 || result.skimmed !== 0)) {
        fail('called off with money');
      }
      if ((result.outcome === 'calledOff') !== result.calls.some((made) => made.call === 'pullOut'))
        fail('called off');
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
      result.calls.forEach((made, index) => {
        const previous = result.calls[index - 1];
        if (previous && made.beat <= previous.beat) fail('calls out of order');
        if (made.beat >= result.log.length) fail('call after the end');
      });
    }

    expect(problems).toEqual([]);
  });

  it('writes every line of the play-by-play in full, and every line can happen', () => {
    const rng = createRng('every line');
    const caller = randomCaller('every line: boss', 0.25);
    const seen = new Set<string>();
    const unfinished: string[] = [];

    for (let i = 0; i < 30_000; i++) {
      for (const entry of playJob(rng, rng.int(1, 20), undefined, caller).result.log) {
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
