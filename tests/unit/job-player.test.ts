import { describe, expect, it } from 'vitest';
import {
  generateCrew,
  runCollection,
  type Beat,
  type CollectionPlan,
  type CollectionResult,
} from '../../src/sim/jobs/collection';
import { createRng, restoreRng } from '../../src/sim/rng';
import { BEACH_STRIP, BEACH_STRIP_BUSINESSES } from '../../src/sim/world';
import { CALL_RESPONSE_SECONDS, JobPlayer } from '../../src/ui/job-player';

const BEAT_SECONDS = 3;

function setUp(seed: string) {
  const rng = createRng(seed);
  const plan: CollectionPlan = {
    crew: generateCrew(rng, 10),
    approach: 'quiet',
    business: BEACH_STRIP_BUSINESSES[1]!,
    district: BEACH_STRIP,
  };
  const start = rng.state();
  const beats: Beat[] = [];
  let result: CollectionResult | undefined;
  const player = new JobPlayer(
    plan,
    rng,
    {
      beat: (beat) => beats.push(beat),
      finish: (finished) => (result = finished),
    },
    { beatSeconds: () => BEAT_SECONDS },
  );
  return { plan, start, player, beats, result: () => result };
}

/** Runs the player in steps of a 60th of a second until the job ends, or a time limit. */
function runFor(player: JobPlayer, seconds: number, onFrame?: () => void): void {
  for (let time = 0; time < seconds && !player.finished; time += 1 / 60) {
    onFrame?.();
    player.update(1 / 60);
  }
}

describe('the job player', () => {
  it('plays the whole job in real time and ends with the same result as the simulation', () => {
    const job = setUp('player: plain');
    job.player.start();
    runFor(job.player, 600);

    const expected = runCollection(job.plan, restoreRng(job.start));
    expect(job.result()).toEqual(expected);
    expect(job.beats.map((beat) => beat.entry)).toEqual(expected.log);
  });

  it('shows each beat for its full length at normal speed', () => {
    const job = setUp('player: timing');
    job.player.start();
    runFor(job.player, BEAT_SECONDS - 0.1);
    expect(job.beats).toHaveLength(1);
    runFor(job.player, 0.2);
    expect(job.beats).toHaveLength(2);
  });

  it('goes four times as fast at 4x, and stops when paused', () => {
    const job = setUp('player: speed');
    job.player.start();
    job.player.setSpeed(4);
    runFor(job.player, BEAT_SECONDS / 4 + 0.05);
    expect(job.beats).toHaveLength(2);

    job.player.setSpeed(0);
    runFor(job.player, 60);
    expect(job.beats).toHaveLength(2);
    expect(job.player.finished).toBe(false);
  });

  it('only counts a long pause between frames as a short step', () => {
    const job = setUp('player: long pause');
    job.player.start();
    job.player.update(1000);
    expect(job.beats).toHaveLength(1);
  });

  it('passes the boss call to the crew soon after it is made, and records it', () => {
    const job = setUp('player: call');
    job.player.start();
    expect(job.beats[0]?.calls).toContain('pullOut');

    expect(job.player.makeCall('pullOut')).toBe(true);
    expect(job.player.pendingCall).toBe('pullOut');
    runFor(job.player, CALL_RESPONSE_SECONDS + 0.05);
    expect(job.beats).toHaveLength(2);
    expect(job.player.pendingCall).toBeUndefined();

    runFor(job.player, 600);
    const result = job.result();
    expect(result?.outcome).toBe('calledOff');
    expect(result?.calls).toEqual([{ beat: 0, call: 'pullOut' }]);
    expect(runCollection(job.plan, restoreRng(job.start), result?.calls)).toEqual(result);
  });

  it('refuses calls that the crew cannot act on, and a second call in the same beat', () => {
    const job = setUp('player: refused');
    job.player.start();
    expect(job.beats[0]?.calls).not.toContain('lieLow');
    expect(job.player.makeCall('lieLow')).toBe(false);
    expect(job.player.makeCall('pullOut')).toBe(true);
    expect(job.player.makeCall('pullOut')).toBe(false);
  });

  it('lets the boss go loud when the talker is inside a quiet job', () => {
    const job = setUp('player: go loud');
    job.player.start();
    runFor(job.player, 600, () => {
      if (job.player.currentBeat?.calls.includes('goLoud')) job.player.makeCall('goLoud');
    });
    const result = job.result();
    expect(result?.calls.map((made) => made.call)).toEqual(['goLoud']);
    expect(result?.log.map((entry) => entry.key)).toContain('collection.goLoud.walksIn');
  });
});
