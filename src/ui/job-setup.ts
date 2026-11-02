/** What a job needs before it starts, and the small helpers the job screens share. */
import type { MessageKey } from '../i18n';
import type { Skill } from '../sim/crew';
import { generateCrew, type Approach, type Crew, type Role } from '../sim/jobs/collection';
import { createRng } from '../sim/rng';
import type { Business } from '../sim/world';

export interface CrewSetup {
  /** The seed the crew was made from. */
  readonly seed: string;
  /** Their average skill, 1 to 20. */
  readonly quality: number;
  readonly crew: Crew;
}

export interface JobSetup {
  readonly crew: CrewSetup;
  readonly business: Business;
  readonly approach: Approach;
  /** The seed for the job's dice. The same seed, choices and calls always play out the same way. */
  readonly seed: string;
}

/** A fresh seed, such as "k3j9x2mq". */
export function randomSeed(): string {
  const [a = 0, b = 0] = crypto.getRandomValues(new Uint32Array(2));
  return `${a.toString(36)}${b.toString(36)}`.slice(0, 10);
}

/** Makes a crew of four from a seed, of a quality anywhere from poor to good (6 to 14). */
export function newCrew(seed: string): CrewSetup {
  const rng = createRng(`crew:${seed}`);
  const quality = rng.int(6, 14);
  return { seed, quality, crew: generateCrew(rng, quality) };
}

/** The skills that matter most for each role, highlighted in the briefing. */
export const KEY_SKILLS: Readonly<Record<Role, readonly Skill[]>> = {
  driver: ['driving', 'composure', 'nerve'],
  talker: ['talking', 'composure'],
  muscle: ['muscle', 'nerve'],
  lookout: ['discretion'],
};

/** A word for how hard an owner is to deal with. */
export function ownerKey(resolve: number): MessageKey {
  if (resolve <= 7) return 'briefing.owner.easy';
  if (resolve <= 10) return 'briefing.owner.careful';
  if (resolve <= 12) return 'briefing.owner.stubborn';
  return 'briefing.owner.hard';
}

export function doormanKey(doorman: number): MessageKey {
  if (doorman === 0) return 'briefing.doorman.none';
  return doorman >= 10 ? 'briefing.doorman.tough' : 'briefing.doorman.some';
}

/** A colour band for a skill from 1 to 20, as in Football Manager. */
export function skillBand(value: number): 'poor' | 'fair' | 'good' | 'great' {
  if (value <= 5) return 'poor';
  if (value <= 10) return 'fair';
  if (value <= 15) return 'good';
  return 'great';
}

/** A colour band for a match rating out of 10. */
export function ratingBand(value: number): 'poor' | 'fair' | 'good' | 'great' {
  if (value < 5.5) return 'poor';
  if (value < 6.5) return 'fair';
  if (value < 7.5) return 'good';
  return 'great';
}
