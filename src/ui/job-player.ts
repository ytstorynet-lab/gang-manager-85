/**
 * Plays a job in real time. It shows each beat of commentary for a few seconds, then moves
 * on, passing along any call the boss made in the meantime. It knows nothing about the
 * screen, so it can be tested on its own.
 */
import {
  playCollection,
  type Beat,
  type Call,
  type CollectionPlan,
  type CollectionPlay,
  type CollectionResult,
} from '../sim/jobs/collection';
import type { Rng } from '../sim/rng';

/** Paused, or one, two or four times normal speed. */
export const SPEEDS = [0, 1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

/** After the boss makes a call, the crew acts on it this soon (in seconds at normal speed). */
export const CALL_RESPONSE_SECONDS = 0.8;

/** Long pauses (a hidden browser tab, a breakpoint) only count as this much time. */
const LONGEST_STEP_SECONDS = 0.25;

export interface JobPlayerEvents {
  /** A new beat has started. */
  readonly beat: (beat: Beat) => void;
  /** The job is over. */
  readonly finish: (result: CollectionResult) => void;
}

export interface JobPlayerOptions {
  /** How long a beat stays on screen at normal speed, in seconds. */
  readonly beatSeconds: (beat: Beat) => number;
}

export class JobPlayer {
  private readonly play: CollectionPlay;
  private beat: Beat | undefined;
  private result: CollectionResult | undefined;
  /** Seconds into the current beat, at normal speed. */
  private elapsed = 0;
  /** How long the current beat lasts, at normal speed. */
  private length = 1;
  private pending: Call | undefined;
  private currentSpeed: Speed = 1;

  constructor(
    plan: CollectionPlan,
    rng: Rng,
    private readonly events: JobPlayerEvents,
    private readonly options: JobPlayerOptions,
  ) {
    this.play = playCollection(plan, rng);
  }

  /** Shows the first beat. */
  start(): void {
    if (!this.beat && !this.result) this.advance(this.play.next());
  }

  /** Moves the job on by some real time, in seconds. */
  update(seconds: number): void {
    if (!this.beat || this.result) return;
    this.elapsed += Math.min(Math.max(seconds, 0), LONGEST_STEP_SECONDS) * this.currentSpeed;
    if (this.elapsed >= this.length) {
      const call = this.pending;
      this.advance(this.play.next(call));
    }
  }

  /**
   * The boss makes a call during the current beat. The crew acts on it shortly after.
   * Returns false if the call can't be made now, or a call has already been made this beat.
   */
  makeCall(call: Call): boolean {
    if (!this.beat || this.result || this.pending || !this.beat.calls.includes(call)) {
      return false;
    }
    this.pending = call;
    this.elapsed = Math.max(this.elapsed, this.length - CALL_RESPONSE_SECONDS);
    return true;
  }

  setSpeed(speed: Speed): void {
    this.currentSpeed = speed;
  }

  get speed(): Speed {
    return this.currentSpeed;
  }

  /** The beat on screen, until the job is over. */
  get currentBeat(): Beat | undefined {
    return this.result ? undefined : this.beat;
  }

  /** The call made during the current beat, waiting for the crew to act on it. */
  get pendingCall(): Call | undefined {
    return this.pending;
  }

  /** How far through the current beat the job is, from 0 to 1. */
  get progress(): number {
    return Math.min(1, this.elapsed / this.length);
  }

  get finished(): boolean {
    return this.result !== undefined;
  }

  private advance(step: IteratorResult<Beat, CollectionResult>): void {
    this.pending = undefined;
    this.elapsed = 0;
    if (step.done) {
      this.result = step.value;
      this.events.finish(step.value);
      return;
    }
    this.beat = step.value;
    this.length = Math.max(0.1, this.options.beatSeconds(step.value));
    this.events.beat(step.value);
  }
}
