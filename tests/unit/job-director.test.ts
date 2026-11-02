import { describe, expect, it } from 'vitest';
import { CUED_KEYS, JobDirector, PEOPLE, VEHICLES } from '../../src/city/job-director';
import { en } from '../../src/i18n/en';
import {
  generateCrew,
  playCollection,
  type Beat,
  type CollectionKey,
  type CollectionPlan,
} from '../../src/sim/jobs/collection';
import { createRng } from '../../src/sim/rng';
import { BEACH_STRIP, BEACH_STRIP_BUSINESSES } from '../../src/sim/world';

/** Plays a job with random calls, handing every beat to `onBeat`. */
function watchJob(seed: string, onBeat: (beat: Beat, plan: CollectionPlan) => void) {
  const rng = createRng(seed);
  const boss = createRng(`${seed}: boss`);
  const plan: CollectionPlan = {
    crew: generateCrew(rng, rng.int(1, 20)),
    approach: rng.pick(['quiet', 'loud'] as const),
    business: rng.pick(BEACH_STRIP_BUSINESSES),
    district: BEACH_STRIP,
  };
  const play = playCollection(plan, rng);
  let step = play.next();
  while (!step.done) {
    onBeat(step.value, plan);
    const { calls } = step.value;
    step = play.next(calls.length > 0 && boss.chance(0.25) ? boss.pick(calls) : undefined);
  }
  return { plan, result: step.value };
}

describe('the job director', () => {
  it('has stage directions for every line a collection can write', () => {
    const lines = Object.keys(en).filter((key) => key.startsWith('collection.'));
    expect([...CUED_KEYS].sort()).toEqual(lines.sort());
  });

  it('keeps everyone on or near the map through thousands of jobs', () => {
    const problems: string[] = [];
    const seen = new Set<CollectionKey>();

    for (let job = 0; job < 3000 && problems.length < 20; job++) {
      let director: JobDirector | undefined;
      watchJob(`director ${job}`, (beat, plan) => {
        director ??= new JobDirector(plan);
        director.cue(beat.entry);
        seen.add(beat.entry.key);
        for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
          director.update(progress);
          for (const id of [...VEHICLES, ...PEOPLE]) {
            const actor = director.actors[id];
            if (!Number.isFinite(actor.x) || !Number.isFinite(actor.y)) {
              problems.push(`job ${job}: ${id} has no position on ${beat.entry.key}`);
            }
            const offMap = actor.x < -30 || actor.x > 270 || actor.y < -30 || actor.y > 200;
            if (actor.visible && offMap) {
              problems.push(`job ${job}: ${id} is lost at ${actor.x}, ${actor.y}`);
            }
          }
        }
      });
    }

    expect(problems).toEqual([]);
    expect(seen.size).toBeGreaterThan(50);
  });

  it('parks the car where the commentary says, and drives it away at the end', () => {
    for (let job = 0; job < 300; job++) {
      let director: JobDirector | undefined;
      const { result } = watchJob(`parking ${job}`, (beat, plan) => {
        director ??= new JobDirector(plan);
        director.cue(beat.entry);
        director.update(1);
        if (beat.index === 0) {
          const spot = beat.entry.key === 'collection.arrive.parkAlley' ? 'alley' : 'street';
          expect(director.spot).toBe(spot);
          expect(director.actors.car.visible).toBe(true);
          expect(director.actors.car.moving).toBe(false);
        }
      });
      director?.finish();

      const last = result.log[result.log.length - 1]?.key ?? '';
      const drivesOff = [
        'collection.leave.calmBoulevard',
        'collection.leave.calmBeach',
        'collection.leave.escapeParkingLot',
        'collection.leave.escapeRedLights',
        'collection.pullOut.beforeGoingIn',
        'collection.pullOut.driveAway',
      ].includes(last);
      if (drivesOff && director) {
        const car = director.actors.car;
        const gone = !car.visible || car.x < 0 || car.x > 240 || car.y < 0 || car.y > 168;
        expect(gone).toBe(true);
        for (const role of ['driver', 'talker', 'muscle', 'lookout'] as const) {
          expect(director.actors[role].visible).toBe(false);
        }
      }
    }
  });
});
