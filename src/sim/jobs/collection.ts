/**
 * The collection: the crew picks up a business's weekly protection money.
 *
 * The job runs in three stages (arrive, inside, leave) and plays out one line of commentary
 * at a time. Each line is a beat. After a beat the boss can make a sideline call (pull out,
 * go loud or lie low) and the job carries on from there with the new plan.
 *
 * Each stage rolls skill checks for the crew member in the right role, and what happens is
 * written to a log as message keys, so the play-by-play can be shown in any language.
 * Nothing here draws or prints anything.
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

/**
 * The sideline calls the boss can make while a job plays.
 *
 * - pullOut: everyone leaves at once. No money, but no more risk.
 * - goLoud: in a quiet job, the muscle goes in. More money, more heat.
 * - lieLow: the crew waits until a patrol car or the rivals have gone. Safer, but it takes
 *   time and the owner gets edgy.
 */
export const CALLS = ['pullOut', 'goLoud', 'lieLow'] as const;
export type Call = (typeof CALLS)[number];

/** calledOff means the boss pulled the crew out. */
export type Outcome = 'clean' | 'messy' | 'botched' | 'busted' | 'calledOff';

/** The message keys a collection can write to its log. */
export type CollectionKey = Extract<MessageKey, `collection.${string}`>;

export interface CollectionPlan {
  readonly crew: Crew;
  readonly approach: Approach;
  readonly business: Business;
  readonly district: District;
}

export interface LogEntry {
  /** Minutes after midnight on the night the job starts, so 1421 is 23:41. */
  readonly minute: number;
  readonly key: CollectionKey;
  readonly params: Readonly<Record<string, string | number>>;
  /** The crew member a line is about, on lines about one person such as injuries and arrests. */
  readonly subject?: Role;
}

/** One line of the play-by-play, as the boss sees it while the job plays. */
export interface Beat {
  /** Where the line sits in the log, counting from 0. */
  readonly index: number;
  readonly entry: LogEntry;
  /** The calls the crew can act on straight after this line. Often none. */
  readonly calls: readonly Call[];
}

/** A call the boss made, and the beat it was made on. */
export interface CallMade {
  readonly beat: number;
  readonly call: Call;
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
  /** The calls the boss made. The same seed with the same calls always plays out the same way. */
  readonly calls: readonly CallMade[];
}

/**
 * A collection being played one beat at a time. Each `next()` gives the next beat. Pass it the
 * boss's call for the beat just shown, or nothing. When the job is over it gives the result.
 */
export type CollectionPlay = Generator<Beat, CollectionResult, Call | undefined>;

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
  /** Keeping the owner calm while the crew waits out the rivals inside. Harder after a loud job. */
  keepOwnerSweetDifficulty: 14,
  keepOwnerSweetAfterLoud: 4,
  /** Each time the crew lies low before going in, the owner is this much harder to deal with. */
  edgyOwner: 2,
  /** ...and this much more likely to lock up for the night instead. */
  ownerLocksUp: 0.2,
  /** Chance the rivals give up while the crew waits them out inside. */
  rivalsGiveUp: 0.55,
  /** How long lying low takes, in minutes. */
  lieLowMinutes: {
    patrol: [10, 16],
    rivals: [8, 14],
    blocked: [12, 20],
  },
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
    ownerPhones: 2,
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
  calledOff: 0,
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

/** Starts a collection that plays one beat at a time, so the boss can make calls as it goes. */
export function playCollection(plan: CollectionPlan, rng: Rng): CollectionPlay {
  return new CollectionRun(plan, rng).play();
}

/**
 * Plays out a whole collection at once, making the given calls at the given beats.
 * The same plan, generator state and calls always give the same result.
 */
export function runCollection(
  plan: CollectionPlan,
  rng: Rng,
  calls: readonly CallMade[] = [],
): CollectionResult {
  const play = playCollection(plan, rng);
  let step = play.next();
  while (!step.done) {
    const index = step.value.index;
    step = play.next(calls.find((made) => made.beat === index)?.call);
  }
  return step.value;
}

type Stage = 'arrive' | 'inside' | 'leave';

/** A danger in plain sight that the crew could lie low to avoid. */
type Threat = 'patrol' | 'rivalsCircling' | 'rivalsBlocking';

interface SayOptions {
  /** A danger the line reveals, which lets the boss call for the crew to lie low. */
  readonly threat?: Threat;
  /** The crew member the line is about. */
  readonly subject?: Role;
  /** True when no call can be made on this line, because the next line is part of the same moment. */
  readonly noCalls?: boolean;
}

/** What a step of the run gives back: beats while it plays, then an optional value. */
type Beats<T = void> = Generator<Beat, T, Call | undefined>;

/**
 * Thrown inside a run when a call means dropping whatever the crew was doing. It unwinds to
 * the stage that deals with it: inside() for going loud, play() for pulling out.
 */
class ChangeOfPlan extends Error {
  constructor(readonly call: 'pullOut' | 'goLoud') {
    super(`The boss called ${call}`);
    this.name = 'ChangeOfPlan';
  }
}

class CollectionRun {
  private stage: Stage = 'arrive';
  private minute: number = TUNING.startMinute;
  private heat = 0;
  private money = 0;
  private skimmed = 0;
  /** True once the muscle is doing the persuading, by plan or by the boss's call. */
  private loud: boolean;
  private escalated = false;
  /** True if the owner locked up rather than open the door to the crew. */
  private lockedOut = false;
  private chased = false;
  private confronted = false;
  private pulledOut = false;
  private policeAlerted = false;
  /** Who has gone into the business so far. */
  private goneIn: 'nobody' | 'talker' | 'both' = 'nobody';
  /** How many times the crew lay low before going in. The owner notices the car outside. */
  private edginess = 0;
  /** How hard the owner is to talk round or scare, on top of the base difficulty. */
  private ownerResist = 0;
  private rivals: 'none' | 'spotted' | 'unseen' = 'none';
  private readonly log: LogEntry[] = [];
  private readonly callsMade: CallMade[] = [];
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
    this.loud = plan.approach === 'loud';
    this.planBonus = Math.trunc((this.bestPlanner().skills.planning - 10) / 4);
    this.baseParams = {
      driver: plan.crew.driver.firstName,
      talker: plan.crew.talker.firstName,
      muscle: plan.crew.muscle.firstName,
      lookout: plan.crew.lookout.firstName,
      business: plan.business.name,
    };
  }

  *play(): Beats<CollectionResult> {
    try {
      yield* this.arrive();
      yield* this.inside();
    } catch (error) {
      if (!(error instanceof ChangeOfPlan && error.call === 'pullOut')) throw error;
      yield* this.pullOut();
      return this.result();
    }
    yield* this.leave();
    return this.result();
  }

  // Stage 1: getting into position, watching for police and rivals.
  private *arrive(): Beats {
    yield* this.say(
      this.oneOf(['collection.arrive.parkAlley', 'collection.arrive.parkStreet'] as const),
    );
    this.wait(1, 3);
    yield* this.say('collection.arrive.lookout');
    if (this.planBonus >= 2) {
      yield* this.say('collection.arrive.goodPlan', { planner: this.bestPlanner().firstName });
    } else if (this.planBonus <= -2) {
      yield* this.say('collection.arrive.badPlan');
    }

    if (this.rng.chance(this.plan.district.patrol)) {
      this.wait(2, 5);
      if (this.test('lookout', 'discretion', TUNING.spotPatrolDifficulty).success) {
        // A sharp lookout gets everyone down in time, which is lying low without being told.
        this.rate('lookout', 0.6);
        yield* this.say('collection.patrol.spotted');
        this.wait(3, 6);
      } else {
        this.rate('lookout', -0.4);
        if (this.test('driver', 'composure', TUNING.coolDriverDifficulty).success) {
          this.heat += TUNING.heat.coolDriver;
          this.rate('driver', 0.4);
          yield* this.say('collection.patrol.coolDriver');
        } else {
          this.policeAlerted = true;
          this.heat += TUNING.heat.noticed;
          this.rate('driver', -0.6);
          yield* this.say('collection.patrol.noticed', {}, { threat: 'patrol' });
        }
      }
    }

    if (this.rng.chance(this.plan.district.rivals)) {
      if (this.test('lookout', 'discretion', TUNING.spotRivalsDifficulty).success) {
        this.wait(1, 3);
        this.rivals = 'spotted';
        this.rate('lookout', 0.5);
        yield* this.say('collection.rivals.spotted', {}, { threat: 'rivalsCircling' });
      } else {
        this.rivals = 'unseen';
      }
    }
  }

  // Stage 2: getting the envelope.
  private *inside(): Beats {
    this.stage = 'inside';
    this.ownerResist =
      Math.floor(this.plan.business.resolve / 2) + this.edginess * TUNING.edgyOwner;
    this.wait(2, 4);

    try {
      if (this.edginess > 0) {
        if (this.rng.chance(TUNING.ownerLocksUp * this.edginess)) {
          this.lockedOut = true;
          yield* this.say('collection.inside.lockedUp');
          return;
        }
        yield* this.say('collection.inside.ownerEdgy');
      }
      if (this.loud) {
        yield* this.bargeIn();
      } else {
        yield* this.askNicely();
      }
    } catch (error) {
      if (!(error instanceof ChangeOfPlan && error.call === 'goLoud')) throw error;
      yield* this.goLoud();
    }

    this.skim();
  }

  /** The quiet way: the talker goes in alone and asks for the envelope. */
  private *askNicely(): Beats {
    this.heat += TUNING.heat.quiet;
    this.goneIn = 'talker';
    yield* this.say('collection.quiet.enter');
    this.wait(2, 4);

    const talk = this.test('talker', 'talking', TUNING.talkDifficulty + this.ownerResist);
    if (talk.roll === 1) {
      this.heat += TUNING.heat.saysTooMuch;
      this.rate('talker', -0.8);
      yield* this.say('collection.quiet.saysTooMuch', {}, { noCalls: true });
    }
    if (talk.success) {
      this.money = this.plan.business.envelope;
      this.rate('talker', 0.5 + Math.min(talk.margin, 10) / 10);
      const key =
        talk.margin >= 8
          ? 'collection.quiet.paysWarmly'
          : this.oneOf(['collection.quiet.pays', 'collection.quiet.paysFamily'] as const);
      yield* this.say(key, { amount: this.money });
      return;
    }

    yield* this.say('collection.quiet.stalls');
    this.wait(1, 3);
    if (this.test('talker', 'composure', TUNING.talkDifficulty + this.ownerResist).success) {
      this.money = this.plan.business.envelope;
      this.rate('talker', 0.3);
      yield* this.say('collection.quiet.talkedRound', { amount: this.money });
      return;
    }

    this.escalated = true;
    this.goneIn = 'both';
    this.rate('talker', -0.7);
    yield* this.say('collection.quiet.muscleStepsIn');
    this.wait(1, 2);
    yield* this.intimidate(TUNING.heat.escalated, 1);
  }

  /** The loud way, as planned: the muscle goes in first. */
  private *bargeIn(): Beats {
    this.goneIn = 'both';
    yield* this.say('collection.loud.enter');
    this.wait(1, 3);
    yield* this.leanOn();
  }

  /** The boss's call to send the muscle into a quiet job. It's a loud job from here on. */
  private *goLoud(): Beats {
    this.loud = true;
    this.goneIn = 'both';
    yield* this.say('collection.goLoud.walksIn');
    this.wait(1, 2);
    yield* this.leanOn();
  }

  /** The muscle collects the envelope plus a late fee; the talker keeps the room calm. */
  private *leanOn(): Beats {
    yield* this.intimidate(TUNING.heat.loud, TUNING.lateFee);
    if (this.test('talker', 'talking', TUNING.calmRoomDifficulty).success) {
      this.heat += TUNING.heat.calmedRoom;
      this.rate('talker', 0.5);
      yield* this.say('collection.loud.calmsRoom');
    }
    if (this.rng.chance(TUNING.policeCalledWhenLoud)) {
      this.policeAlerted = true;
      this.heat += TUNING.heat.callsPolice;
      yield* this.say('collection.loud.callsPolice');
    }
  }

  private *intimidate(heat: number, paymentRate: number): Beats {
    this.heat += heat;
    const doorman = this.plan.business.doorman;
    if (doorman > 0) {
      const faceOff = this.test(
        'muscle',
        'muscle',
        TUNING.doormanDifficulty + Math.floor(doorman / 2),
      );
      if (faceOff.success) {
        this.rate('muscle', 0.5);
        yield* this.say('collection.loud.doormanBacksOff');
      } else {
        this.heat += TUNING.heat.doormanFight;
        this.rate('muscle', -0.6);
        yield* this.say('collection.loud.doormanFight', {}, { noCalls: true });
        yield* this.injure('muscle', faceOff.roll === 1 ? 'serious' : 'minor');
      }
      this.wait(1, 2);
    }

    const nerveBonus = Math.trunc((this.plan.crew.muscle.skills.nerve - 10) / 5);
    const scare = this.test(
      'muscle',
      'muscle',
      TUNING.scareDifficulty + this.ownerResist,
      nerveBonus,
    );
    if (scare.success) {
      this.money = Math.round(this.plan.business.envelope * paymentRate);
      this.rate('muscle', 0.6);
      yield* this.say(paymentRate > 1 ? 'collection.loud.paysLateFee' : 'collection.loud.pays', {
        amount: this.money,
      });
    } else {
      this.money = Math.round(this.plan.business.envelope * TUNING.partialPayment);
      this.heat += TUNING.heat.partial;
      this.rate('muscle', -0.5);
      yield* this.say('collection.loud.partial', { amount: this.money });
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
  private *leave(): Beats {
    this.stage = 'leave';
    this.wait(2, 4);
    const rivalsMove =
      this.rivals === 'spotted'
        ? this.rng.chance(TUNING.rivalsMoveWhenSpotted)
        : this.rivals === 'unseen' && this.rng.chance(TUNING.rivalsMoveWhenUnseen);

    let calm = !rivalsMove;
    if (rivalsMove) {
      const expected = this.rivals === 'spotted';
      const call = yield* this.say(
        expected ? 'collection.leave.rivalsExpected' : 'collection.leave.rivalsAmbush',
        {},
        { threat: 'rivalsBlocking' },
      );
      if (this.rivals === 'none') {
        // They gave up while the crew waited inside.
        calm = true;
      } else {
        this.wait(1, 2);
        yield* this.rivalsConfront(expected || call === 'lieLow');
      }
    }

    const policeCome = this.policeAlerted
      ? this.rng.chance(TUNING.policeReturn)
      : this.rng.chance(this.loud ? TUNING.policePassByLoud : TUNING.policePassByQuiet);
    if (policeCome) {
      this.wait(1, 3);
      yield* this.chase();
    } else if (calm) {
      yield* this.say(
        this.oneOf(['collection.leave.calmBoulevard', 'collection.leave.calmBeach'] as const),
      );
    }
  }

  private *rivalsConfront(expected: boolean): Beats {
    this.confronted = true;
    const bonus = expected ? 2 : -2;

    if (!this.test('muscle', 'nerve', TUNING.rivalsNerveDifficulty, bonus).success) {
      this.money = 0;
      this.heat += TUNING.heat.handsOver;
      this.rate('muscle', -1);
      yield* this.say('collection.leave.handsOver');
      return;
    }

    const standOff = this.test('muscle', 'muscle', TUNING.rivalsStandOffDifficulty, bonus);
    if (standOff.success) {
      this.heat += TUNING.heat.rivalsBackOff;
      this.rate('muscle', 0.8);
      yield* this.say('collection.leave.rivalsBackOff');
      return;
    }

    this.money = 0;
    this.heat += TUNING.heat.rivalsBrawl;
    this.rate('muscle', -0.8);
    yield* this.say('collection.leave.rivalsTakeIt', {}, { noCalls: true });
    yield* this.injure('muscle', standOff.roll === 1 ? 'serious' : 'minor');
    const bystander = this.oneOf(['driver', 'talker', 'lookout'] as const);
    if (!this.test(bystander, 'fitness', TUNING.dodgeBrawlDifficulty).success) {
      yield* this.injure(bystander, 'minor');
    }
  }

  private *chase(): Beats {
    this.chased = true;
    yield* this.say('collection.leave.sirens');
    let nerves = 0;
    if (!this.test('driver', 'nerve', TUNING.driverNerveDifficulty).success) {
      nerves = -4;
      yield* this.say('collection.leave.driverRattled');
    }
    const difficulty = TUNING.getawayDifficulty + (this.policeAlerted ? 2 : 0);
    const getaway = this.test('driver', 'driving', difficulty, nerves);
    this.wait(2, 5);

    if (getaway.success) {
      this.heat += TUNING.heat.chaseEscaped;
      this.rate('driver', 1);
      yield* this.say(
        this.oneOf([
          'collection.leave.escapeParkingLot',
          'collection.leave.escapeRedLights',
        ] as const),
      );
      return;
    }

    this.rate('driver', -1);
    yield* this.say('collection.leave.boxedIn', {}, { noCalls: true });
    for (const role of ROLES) {
      const member = this.plan.crew[role];
      if (this.test(role, 'fitness', TUNING.footChaseDifficulty).success) {
        this.rate(role, 0.3);
        yield* this.say(
          'collection.leave.escapesOnFoot',
          { name: member.firstName },
          { subject: role },
        );
      } else {
        this.arrests.push(member.id);
        this.rate(role, -1.5);
        yield* this.say('collection.leave.arrested', { name: member.firstName }, { subject: role });
      }
    }
    this.heat += this.arrests.length > 0 ? TUNING.heat.arrests : TUNING.heat.chaseCaught;
    if (this.arrests.includes(this.plan.crew.talker.id) && this.money > 0) {
      this.money = 0;
      yield* this.say('collection.leave.envelopeSeized');
    }
  }

  // The boss's calls.

  /** Pull out: everyone leaves now, without the money. Nothing else can go wrong. */
  private *pullOut(): Beats {
    this.pulledOut = true;
    if (this.goneIn === 'nobody') {
      yield* this.say('collection.pullOut.beforeGoingIn');
      return;
    }
    yield* this.say(
      this.goneIn === 'both' ? 'collection.pullOut.crewLeaves' : 'collection.pullOut.talkerLeaves',
    );
    this.wait(1, 2);
    yield* this.say('collection.pullOut.driveAway');
  }

  /**
   * Lie low: wait until the danger has gone. It takes time, and the owner notices: before the
   * crew goes in, an edgy owner is harder to deal with and may lock up for the night.
   */
  private *lieLow(threat: Threat): Beats {
    if (threat === 'rivalsBlocking') {
      yield* this.waitOutRivals();
      return;
    }
    this.edginess += 1;
    if (threat === 'patrol') {
      this.policeAlerted = false;
      yield* this.say('collection.lieLow.patrol');
      this.wait(...TUNING.lieLowMinutes.patrol);
    } else {
      this.rivals = 'none';
      yield* this.say('collection.lieLow.rivals');
      this.wait(...TUNING.lieLowMinutes.rivals);
    }
  }

  /**
   * The rivals are blocking the street, so the crew goes back inside until they give up. The
   * owner wants them gone and may phone the police, and the rivals may still be there after.
   */
  private *waitOutRivals(): Beats {
    yield* this.say('collection.lieLow.blocked');
    this.wait(...TUNING.lieLowMinutes.blocked);
    const difficulty =
      TUNING.keepOwnerSweetDifficulty + (this.loud ? TUNING.keepOwnerSweetAfterLoud : 0);
    if (this.test('talker', 'talking', difficulty).success) {
      this.rate('talker', 0.3);
      yield* this.say('collection.lieLow.ownerSweet');
    } else {
      this.policeAlerted = true;
      this.heat += TUNING.heat.ownerPhones;
      yield* this.say('collection.lieLow.ownerPhones');
    }
    this.wait(2, 4);
    if (this.rng.chance(TUNING.rivalsGiveUp)) {
      this.rivals = 'none';
      yield* this.say('collection.lieLow.rivalsGiveUp');
    } else {
      yield* this.say('collection.lieLow.rivalsWait', {}, { noCalls: true });
    }
  }

  /** The calls that make sense straight after the line being written. */
  private callsNow(threat: Threat | undefined): Call[] {
    if (this.pulledOut) return [];
    const calls: Call[] = [];
    const beforeTheMoney = this.stage !== 'leave' && this.money === 0;
    if (beforeTheMoney) {
      calls.push('pullOut');
    }
    if (
      beforeTheMoney &&
      this.stage === 'inside' &&
      !this.loud &&
      !this.escalated &&
      !this.lockedOut
    ) {
      calls.push('goLoud');
    }
    if (threat) {
      calls.push('lieLow');
    }
    return calls;
  }

  /**
   * Writes one line to the log and hands it to whoever is watching, with the calls the crew
   * could act on now. Lying low happens here and then the job carries on. Pulling out and
   * going loud drop what the crew was doing, so they unwind to the stage that deals with them.
   */
  private *say(
    key: CollectionKey,
    extra: Readonly<Record<string, string | number>> = {},
    options: SayOptions = {},
  ): Beats<Call | undefined> {
    const index = this.log.length;
    const entry: LogEntry = {
      minute: this.minute,
      key,
      params: { ...this.baseParams, ...extra },
      ...(options.subject ? { subject: options.subject } : {}),
    };
    this.log.push(entry);

    const calls = options.noCalls ? [] : this.callsNow(options.threat);
    const call = yield { index, entry, calls };
    if (call === undefined || !calls.includes(call)) return undefined;

    this.callsMade.push({ beat: index, call });
    switch (call) {
      case 'lieLow':
        if (options.threat) yield* this.lieLow(options.threat);
        return call;
      case 'pullOut':
      case 'goLoud':
        throw new ChangeOfPlan(call);
    }
  }

  private result(): CollectionResult {
    const outcome: Outcome = this.pulledOut
      ? 'calledOff'
      : this.arrests.length > 0
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
      calls: [...this.callsMade],
    };
  }

  private *injure(role: Role, severity: Injury['severity']): Beats {
    this.injuries.push({ memberId: this.plan.crew[role].id, severity });
    this.rate(role, severity === 'serious' ? -0.8 : -0.3);
    yield* this.say(
      severity === 'serious' ? 'collection.injury.serious' : 'collection.injury.minor',
      { name: this.plan.crew[role].firstName },
      { subject: role },
    );
  }

  private test(role: Role, skill: Skill, difficulty: number, bonus = 0): CheckResult {
    return check(this.rng, this.plan.crew[role].skills[skill], difficulty, this.planBonus + bonus);
  }

  private bestPlanner(): CrewMember {
    return ROLES.map((role) => this.plan.crew[role]).reduce((best, member) =>
      member.skills.planning > best.skills.planning ? member : best,
    );
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
