import { normal } from './checks';
import { FIRST_NAMES, SURNAMES } from './names';
import type { Rng } from './rng';

/** The skills every crew member is rated on, from 1 to 20 as in Football Manager. */
export const SKILLS = [
  'driving',
  'muscle',
  'talking',
  'planning',
  'discretion',
  'nerve',
  'composure',
  'fitness',
] as const;

export type Skill = (typeof SKILLS)[number];
export type Skills = Readonly<Record<Skill, number>>;

/** Traits the player never sees directly, also 1 to 20. */
export interface HiddenTraits {
  /** High: stays quiet if arrested and never skims. Low: a risk. */
  readonly loyalty: number;
  /** High: likely to keep some of the takings. */
  readonly greed: number;
}

export interface CrewMember {
  readonly id: string;
  readonly firstName: string;
  readonly surname: string;
  readonly age: number;
  readonly skills: Skills;
  readonly hidden: HiddenTraits;
}

export const MIN_RATING = 1;
export const MAX_RATING = 20;

/** Rounds to a whole rating between 1 and 20. */
export function toRating(value: number): number {
  return Math.min(MAX_RATING, Math.max(MIN_RATING, Math.round(value)));
}

export interface CrewMemberOptions {
  readonly id: string;
  /** The average skill they're built around, 1 to 20. Defaults to 10. */
  readonly quality?: number;
  /** Names already used in this crew (first names and surnames), so nobody shares one. */
  readonly takenNames?: ReadonlySet<string>;
}

/** Makes a crew member: most skills near `quality`, with one or two that stand out. */
export function generateCrewMember(rng: Rng, options: CrewMemberOptions): CrewMember {
  const quality = options.quality ?? 10;
  const skills = {} as Record<Skill, number>;
  for (const skill of SKILLS) {
    skills[skill] = toRating(normal(rng, quality, 2.5));
  }
  const specialities = rng.int(1, 2);
  for (let i = 0; i < specialities; i++) {
    const skill = rng.pick(SKILLS);
    skills[skill] = toRating(skills[skill] + rng.int(3, 5));
  }

  const taken = options.takenNames ?? new Set<string>();
  const unusedName = (names: readonly string[]): string => {
    let name = rng.pick(names);
    for (let tries = 0; taken.has(name) && tries < 50; tries++) {
      name = rng.pick(names);
    }
    return name;
  };
  const firstName = unusedName(FIRST_NAMES);
  const surname = unusedName(SURNAMES);

  return {
    id: options.id,
    firstName,
    surname,
    age: rng.int(19, 52),
    skills,
    hidden: {
      loyalty: toRating(normal(rng, 11, 4)),
      greed: toRating(normal(rng, 9, 4)),
    },
  };
}

/** The average of a crew member's eight skills. */
export function averageSkill(member: CrewMember): number {
  return SKILLS.reduce((sum, skill) => sum + member.skills[skill], 0) / SKILLS.length;
}
