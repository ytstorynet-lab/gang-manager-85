/**
 * The collection: the crew picks up a business's weekly protection money.
 *
 * The job runs in three stages (arrive, inside, leave). Each stage rolls skill checks for
 * the crew member in the right role, and what happens is written to a log as message keys,
 * so the play-by-play can be shown in any language. Nothing here draws or prints anything.
 */
import type { MessageKey } from '../../i18n/en';
import { check, type CheckResult } from '../checks';
import { generateCrewMember, type CrewMember, type Skill } from '../crew';
import type { Rng } from '../rng';
import type { Business, District } from '../world';

export const ROLES = ['driver', 'talker', 'muscle', 'lookout'] as const;
export type Role = (typeof ROLES)[number];
export type Crew = Readonly<Record<Role, CrewMember>>;

/** Quiet: the talker tries first. Loud: the muscle goes in first, for more money and more heat. */
export type Approach = 'quiet' | 'loud';
export type Outcome = 'clean' | 'messy' | 'botched' | 'busted';

export interface CollectionPlan {
  readonly crew: Crew;
  readonly approach: Approach;
  readonly business: Business;
  readonly district: District;
}

export interface LogEntry {
  /** Minutes after midnight on the night the job starts, so 1421 is 23:41. */
  readonly minute: number;
  readonly key: MessageKey;
  readonly params: Readonly<Record<string, string | number>>;
}

export interface Injury {
  readonly memberId: string;
  readonly severity: 'minor' | 'serious';
}

export interface CollectionResult {
  readonly outcome: Outcome;
  /** Dollars that reach the organisation. */
  readonly money: number;
  /** Dollars the crew member carrying the envelope quietly kept. The player isn't told. */
  readonly skimmed: number;
  /** How much police attention the job drew. */
  readonly heat: number;
  readonly injuries: readonly Injury[];
  /** Ids of the crew members arrested. */
  readonly arrests: readonly string[];
  /** A score out of 10 for each role, like Football Manager's match ratings. */
  readonly ratings: Readonly<Record<Role, number>>;
  readonly log: readonly LogEntry[];
}

/** Every balance number in one place. Difficulties are for a d20 plus the skill. */
export const TUNING = {
  startMinute: 23 * 60 + 30,
  /** Talking the owner round: this plus half the owner's resolve. */
  talkDifficulty: 14,
  /** Scaring the owner: this plus half the owner's resolve. */
  scareDifficulty: 10,
  /** Facing down the doorman: this plus half the doorman's toughness. */
  doormanDifficulty: 12,
  calmRoomDifficulty: 16,
  spotPatrolDifficulty: 18,
  spotRivalsDifficulty: 17,
  coolDriverDifficulty: 16,
  rivalsNerveDifficulty: 12,
  rivalsStandOffDifficulty: 18,
  getawayDifficulty: 20,
  driverNerveDifficulty: 11,
  footChaseDifficulty: 17,
  dodgeBrawlDifficulty: 14,
  /** Going loud collects the envelope plus a late fee for the trouble. */
  lateFee: 1.25,
  partialPayment: 0.5,
  /** Chance the police come back after a patrol took a good look. */
  policeReturn: 0.6,
  policeCalledWhenLoud: 0.25,
  policePassByLoud: 0.12,
  policePassByQuiet: 0.04,
  rivalsMoveWhenSpotted: 0.4,
  rivalsMoveWhenUnseen: 0.6,
  /** A job that draws this much heat or more counts as messy. */
  messyHeat: 10,
  heat: {
    quiet: 1,
    loud: 6,
    escalated: 8,
    saysTooMuch: 4,
    calmedRoom: -2,
    coolDriver: 1,
    noticed: 3,
    doormanFight: 3,
    partial: 4,
    callsPolice: 2,
    rivalsBackOff: 3,
    handsOver: 1,
    rivalsBrawl: 5,
    chaseEscaped: 6,
    chaseCaught: 8,
    arrests: 15,
  },
} as const;

const OUTCOME_RATING: Readonly<Record<Outcome, number>> = {
  clean: 0.6,
  messy: 0,
  botched: -0.6,
  busted: -0.8,
};

/** Generates a crew of four for the job, built around `quality` (1 to 20), with no shared names. */
export function generateCrew(rng: Rng, quality: number): Crew {
  const taken = new Set<string>();
  const crew = {} as Record<Role, CrewMember>;
  ROLES.forEach((role, index) => {
    const member = generateCrewMember(rng, {
      id: `crew-${index + 1}`,
      quality,
      takenNames: taken,
    });
    taken.add(member.firstName);
    taken.add(member.surname);
    crew[role] = member;
  });
  return crew;
}

/** Plays out one collection. The same plan and generator state always give the same result. */
export function runCollection(plan: CollectionPlan, rng: Rng): CollectionResult {
  return new CollectionRun(plan, rng).run();
}

class CollectionRun {
  private minute: number = TUNING.startMinute;
  private heat = 0;
  private money = 0;
  private skimmed = 0;
  private escalated = false;
  private chased = false;
  private confronted = false;
  private policeAlerted = false;
  private rivals: 'none' | 'spotted' | 'unseen' = 'none';
  private readonly log: LogEntry[] = [];
  private readonly injuries: Injury[] = [];
  private readonly arrests: string[] = [];
  private readonly ratingChange: Record<Role, number> = {
    driver: 0,
    talker: 0,
    muscle: 0,
    lookout: 0,
  };
  /** Good planning helps every check a little; bad planning hurts. -2 to +2. */
  private readonly planBonus: number;
  private readonly baseParams: Readonly<Record<string, string>>;

  constructor(
    private readonly plan: CollectionPlan,
    private readonly rng: Rng,
  ) {
    this.planBonus = Math.trunc((this.bestPlanner().skills.planning - 10) / 4);
    this.baseParams = {
      driver: plan.crew.driver.firstName,
      talker: plan.crew.talker.firstName,
      muscle: plan.crew.muscle.firstName,
      lookout: plan.crew.lookout.firstName,
      business: plan.business.name,
    };
  }

  run(): CollectionResult {
    this.arrive();
    this.inside();
    this.leave();
    return this.result();
  }

  // Stage 1: getting into position, watching for police and rivals.
  private arrive(): void {
    this.say(this.oneOf(['collection.arrive.parkAlley', 'collection.arrive.parkStreet'] as const));
    this.wait(1, 3);
    this.say('collection.arrive.lookout');
    if (this.planBonus >= 2) {
      this.say('collection.arrive.goodPlan', { planner: this.bestPlanner().firstName });
    } else if (this.planBonus <= -2) {
      this.say('collection.arrive.badPlan');
    }

    if (this.rng.chance(this.plan.district.patrol)) {
      this.wait(2, 5);
      if (this.test('lookout', 'discretion', TUNING.spotPatrolDifficulty).success) {
        this.say('collection.patrol.spotted');
        this.rate('lookout', 0.6);
        this.wait(3, 6);
      } else {
        this.rate('lookout', -0.4);
        if (this.test('driver', 'composure', TUNING.coolDriverDifficulty).success) {
          this.say('collection.patrol.coolDriver');
          this.heat += TUNING.heat.coolDriver;
          this.rate('driver', 0.4);
        } else {
          this.say('collection.patrol.noticed');
          this.policeAlerted = true;
          this.heat += TUNING.heat.noticed;
          this.rate('driver', -0.6);
        }
      }
    }

    if (this.rng.chance(this.plan.district.rivals)) {
      if (this.test('lookout', 'discretion', TUNING.spotRivalsDifficulty).success) {
        this.wait(1, 3);
        this.rivals = 'spotted';
        this.say('collection.rivals.spotted');
        this.rate('lookout', 0.5);
      } else {
        this.rivals = 'unseen';
      }
    }
  }

  // Stage 2: getting the envelope.
  private inside(): void {
    this.wait(2, 4);
    const halfResolve = Math.floor(this.plan.business.resolve / 2);

    if (this.plan.approach === 'quiet') {
      this.heat += TUNING.heat.quiet;
      this.say('collection.quiet.enter');
      this.wait(2, 4);
      const talk = this.test('talker', 'talking', TUNING.talkDifficulty + halfResolve);
      if (talk.roll === 1) {
        this.say('collection.quiet.saysTooMuch');
        this.heat += TUNING.heat.saysTooMuch;
        this.rate('talker', -0.8);
      }
      if (talk.success) {
        this.money = this.plan.business.envelope;
        const key =
          talk.margin >= 8
            ? 'collection.quiet.paysWarmly'
            : this.oneOf(['collection.quiet.pays', 'collection.quiet.paysFamily'] as const);
        this.say(key, { amount: this.money });
        this.rate('talker', 0.5 + Math.min(talk.margin, 10) / 10);
      } else {
        this.say('collection.quiet.stalls');
        this.wait(1, 3);
        if (this.test('talker', 'composure', TUNING.talkDifficulty + halfResolve).success) {
          this.money = this.plan.business.envelope;
          this.say('collection.quiet.talkedRound', { amount: this.money });
          this.rate('talker', 0.3);
        } else {
          this.escalated = true;
          this.rate('talker', -0.7);
          this.say('collection.quiet.muscleStepsIn');
          this.wait(1, 2);
          this.intimidate(halfResolve, TUNING.heat.escalated, 1);
        }
      }
    } else {
      this.say('collection.loud.enter');
      this.wait(1, 3);
      this.intimidate(halfResolve, TUNING.heat.loud, TUNING.lateFee);
      if (this.test('talker', 'talking', TUNING.calmRoomDifficulty).success) {
        this.say('collection.loud.calmsRoom');
        this.heat += TUNING.heat.calmedRoom;
        this.rate('talker', 0.5);
      }
      if (this.rng.chance(TUNING.policeCalledWhenLoud)) {
        this.say('collection.loud.callsPolice');
        this.policeAlerted = true;
        this.heat += TUNING.heat.callsPolice;
      }
    }

    this.skim();
  }

  private intimidate(halfResolve: number, heat: number, paymentRate: number): void {
    this.heat += heat;
    const doorman = this.plan.business.doorman;
    if (doorman > 0) {
      const faceOff = this.test(
        'muscle',
        'muscle',
        TUNING.doormanDifficulty + Math.floor(doorman / 2),
      );
      if (faceOff.success) {
        this.say('collection.loud.doormanBacksOff');
        this.rate('muscle', 0.5);
      } else {
        this.say('collection.loud.doormanFight');
        this.heat += TUNING.heat.doormanFight;
        this.rate('muscle', -0.6);
        this.injure('muscle', faceOff.roll === 1 ? 'serious' : 'minor');
      }
      this.wait(1, 2);
    }

    const nerveBonus = Math.trunc((this.plan.crew.muscle.skills.nerve - 10) / 5);
    const scare = this.test('muscle', 'muscle', TUNING.scareDifficulty + halfResolve, nerveBonus);
    if (scare.success) {
      this.money = Math.round(this.plan.business.envelope * paymentRate);
      this.say(paymentRate > 1 ? 'collection.loud.paysLateFee' : 'collection.loud.pays', {
        amount: this.money,
      });
      this.rate('muscle', 0.6);
    } else {
      this.money = Math.round(this.plan.business.envelope * TUNING.partialPayment);
      this.say('collection.loud.partial', { amount: this.money });
      this.heat += TUNING.heat.partial;
      this.rate('muscle', -0.5);
    }
  }

  /** The talker carries the envelope. A greedy one who isn't very loyal keeps a little. */
  private skim(): void {
    const { greed, loyalty } = this.plan.crew.talker.hidden;
    if (this.money <= 0 || greed <= 12 || loyalty >= 15) return;
    if (this.rng.chance((greed - 12) / 16)) {
      this.skimmed = Math.round((this.money * this.rng.int(5, 15)) / 100);
      this.money -= this.skimmed;
    }
  }

  // Stage 3: getting away, maybe past rivals or the police.
  private leave(): void {
    this.wait(2, 4);
    const rivalsMove =
      this.rivals === 'spotted'
        ? this.rng.chance(TUNING.rivalsMoveWhenSpotted)
        : this.rivals === 'unseen' && this.rng.chance(TUNING.rivalsMoveWhenUnseen);
    const policeCome = this.policeAlerted
      ? this.rng.chance(TUNING.policeReturn)
      : this.rng.chance(
          this.plan.approach === 'loud' ? TUNING.policePassByLoud : TUNING.policePassByQuiet,
        );

    if (rivalsMove) {
      this.rivalsConfront();
    }
    if (policeCome) {
      this.wait(1, 3);
      this.chase();
    } else if (!rivalsMove) {
      this.say(
        this.oneOf(['collection.leave.calmBoulevard', 'collection.leave.calmBeach'] as const),
      );
    }
  }

  private rivalsConfront(): void {
    this.confronted = true;
    const expected = this.rivals === 'spotted';
    this.say(expected ? 'collection.leave.rivalsExpected' : 'collection.leave.rivalsAmbush');
    this.wait(1, 2);
    const bonus = expected ? 2 : -2;

    if (!this.test('muscle', 'nerve', TUNING.rivalsNerveDifficulty, bonus).success) {
      this.say('collection.leave.handsOver');
      this.money = 0;
      this.heat += TUNING.heat.handsOver;
      this.rate('muscle', -1);
      return;
    }

    const standOff = this.test('muscle', 'muscle', TUNING.rivalsStandOffDifficulty, bonus);
    if (standOff.success) {
      this.say('collection.leave.rivalsBackOff');
      this.heat += TUNING.heat.rivalsBackOff;
      this.rate('muscle', 0.8);
      return;
    }

    this.say('collection.leave.rivalsTakeIt');
    this.money = 0;
    this.heat += TUNING.heat.rivalsBrawl;
    this.rate('muscle', -0.8);
    this.injure('muscle', standOff.roll === 1 ? 'serious' : 'minor');
    const bystander = this.oneOf(['driver', 'talker', 'lookout'] as const);
    if (!this.test(bystander, 'fitness', TUNING.dodgeBrawlDifficulty).success) {
      this.injure(bystander, 'minor');
    }
  }

  private chase(): void {
    this.chased = true;
    this.say('collection.leave.sirens');
    let nerves = 0;
    if (!this.test('driver', 'nerve', TUNING.driverNerveDifficulty).success) {
      this.say('collection.leave.driverRattled');
      nerves = -4;
    }
    const difficulty = TUNING.getawayDifficulty + (this.policeAlerted ? 2 : 0);
    const getaway = this.test('driver', 'driving', difficulty, nerves);
    this.wait(2, 5);

    if (getaway.success) {
      this.say(
        this.oneOf([
          'collection.leave.escapeParkingLot',
          'collection.leave.escapeRedLights',
        ] as const),
      );
      this.heat += TUNING.heat.chaseEscaped;
      this.rate('driver', 1);
      return;
    }

    this.say('collection.leave.boxedIn');
    this.rate('driver', -1);
    for (const role of ROLES) {
      const name = this.plan.crew[role].firstName;
      if (this.test(role, 'fitness', TUNING.footChaseDifficulty).success) {
        this.say('collection.leave.escapesOnFoot', { name });
        this.rate(role, 0.3);
      } else {
        this.arrests.push(this.plan.crew[role].id);
        this.say('collection.leave.arrested', { name });
        this.rate(role, -1.5);
      }
    }
    if (this.arrests.includes(this.plan.crew.talker.id) && this.money > 0) {
      this.say('collection.leave.envelopeSeized');
      this.money = 0;
    }
    this.heat += this.arrests.length > 0 ? TUNING.heat.arrests : TUNING.heat.chaseCaught;
  }

  private result(): CollectionResult {
    const outcome: Outcome =
      this.arrests.length > 0
        ? 'busted'
        : this.money === 0
          ? 'botched'
          : this.escalated ||
              this.chased ||
              this.confronted ||
              this.injuries.length > 0 ||
              this.heat >= TUNING.messyHeat
            ? 'messy'
            : 'clean';

    const ratings = {} as Record<Role, number>;
    for (const role of ROLES) {
      const score = 6 + OUTCOME_RATING[outcome] + this.ratingChange[role];
      ratings[role] = Math.round(Math.min(10, Math.max(1, score)) * 10) / 10;
    }

    return {
      outcome,
      money: this.money,
      skimmed: this.skimmed,
      heat: Math.max(0, this.heat),
      injuries: [...this.injuries],
      arrests: [...this.arrests],
      ratings,
      log: [...this.log],
    };
  }

  private injure(role: Role, severity: Injury['severity']): void {
    this.injuries.push({ memberId: this.plan.crew[role].id, severity });
    this.say(severity === 'serious' ? 'collection.injury.serious' : 'collection.injury.minor', {
      name: this.plan.crew[role].firstName,
    });
    this.rate(role, severity === 'serious' ? -0.8 : -0.3);
  }

  private test(role: Role, skill: Skill, difficulty: number, bonus = 0): CheckResult {
    return check(this.rng, this.plan.crew[role].skills[skill], difficulty, this.planBonus + bonus);
  }

  private bestPlanner(): CrewMember {
    return ROLES.map((role) => this.plan.crew[role]).reduce((best, member) =>
      member.skills.planning > best.skills.planning ? member : best,
    );
  }

  private say(key: MessageKey, extra: Readonly<Record<string, string | number>> = {}): void {
    this.log.push({ minute: this.minute, key, params: { ...this.baseParams, ...extra } });
  }

  private wait(min: number, max: number): void {
    this.minute += this.rng.int(min, max);
  }

  private rate(role: Role, change: number): void {
    this.ratingChange[role] += change;
  }

  private oneOf<T>(items: readonly T[]): T {
    return this.rng.pick(items);
  }
}
