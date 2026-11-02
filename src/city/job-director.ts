/**
 * Turns each line of a job's commentary into stage directions for the city view: who walks
 * where, which car pulls up, when the sirens come on. Positions are in the block's own
 * pixels (240 by 168). Nothing here draws anything, so it can be tested on its own.
 */
import {
  ROLES,
  type CollectionKey,
  type CollectionPlan,
  type LogEntry,
  type Role,
} from '../sim/jobs/collection';

export type Facing = 'north' | 'east' | 'south' | 'west';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const VEHICLES = ['car', 'patrol', 'rivals'] as const;
export type VehicleId = (typeof VEHICLES)[number];
export const PEOPLE = [...ROLES, 'doorman', 'caller'] as const;
export type PersonId = (typeof PEOPLE)[number];
export type ActorId = VehicleId | PersonId;

export interface ActorState {
  x: number;
  y: number;
  /** Which way a vehicle points. People are seen from above and don't turn. */
  facing: Facing;
  visible: boolean;
  /** True while walking or driving. */
  moving: boolean;
  /** Headlights, for vehicles. */
  lights: boolean;
  /** Flashing lamps, for the patrol car. */
  sirens: boolean;
  /** Shows a "!" above them. */
  alert: boolean;
  /** Makes them flash, for injuries. */
  hurt: boolean;
  /** Makes them shake, for fights and nerves. */
  shaking: boolean;
}

/** Where the crew parks, and the routes that go with it. */
export type Parking = 'alley' | 'street';

interface Spot {
  /** Where the car parks, and the way it faces there. */
  readonly car: Point;
  /** The way in from off the map, ending where the car parks. */
  readonly arrive: readonly Point[];
  /** Where the crew go in and out of the business. */
  readonly door: Point;
  /** Where the lookout stands. */
  readonly lookout: Point;
  /** The ways out, starting from where the car parks. */
  readonly leave: Readonly<Record<'boulevard' | 'beach', readonly Point[]>>;
  /** A patrol car coming past: to the point where it might slow down, then away. */
  readonly patrolTo: readonly Point[];
  readonly patrolOn: readonly Point[];
  /** The rivals blocking the way out, and backing away again. */
  readonly rivalsBlock: readonly Point[];
  readonly rivalsReverse: readonly Point[];
  readonly rivalsAway: readonly Point[];
  /** The police coming up behind the car. */
  readonly sirens: readonly Point[];
  /** Where the car gets to before the police stop it, and where the police car ends up. */
  readonly boxedCar: Point;
  readonly boxedPatrol: readonly Point[];
  /** Where each crew member runs to when the car is stopped, off the edge of the map. */
  readonly scatter: Readonly<Record<Role, Point>>;
}

const P = (x: number, y: number): Point => ({ x, y });

/** The rivals' car loops round the block when the lookout spots it. */
const RIVALS_CIRCLE: readonly Point[] = [P(-16, 55), P(168.5, 55), P(168.5, -16)];

/** Someone from the business runs to the payphone on the corner. */
const PAYPHONE = P(91, 112);
const BACK_DOOR = P(101, 78);

const SPOTS: Readonly<Record<Parking, Spot>> = {
  alley: {
    car: P(100.5, 94.5),
    arrive: [P(-16, 55), P(100.5, 55), P(100.5, 94.5)],
    door: BACK_DOOR,
    lookout: P(100.5, 113),
    leave: {
      boulevard: [P(100.5, 127), P(168.5, 127), P(168.5, -16)],
      beach: [P(100.5, 127), P(159, 127), P(159, 184)],
    },
    patrolTo: [P(159, -16), P(159, 118.5), P(108, 118.5)],
    patrolOn: [P(-16, 118.5)],
    rivalsBlock: [P(-16, 127), P(100.5, 127), P(100.5, 118)],
    rivalsReverse: [P(100.5, 127)],
    rivalsAway: [P(-16, 127)],
    sirens: [P(-16, 55), P(100.5, 55), P(100.5, 79)],
    boxedCar: P(100.5, 104),
    boxedPatrol: [P(100.5, 89)],
    scatter: {
      driver: P(-16, 100),
      talker: P(100, -16),
      muscle: P(30, 184),
      lookout: P(120, 184),
    },
  },
  street: {
    car: P(170.5, 88.5),
    arrive: [P(168.5, 184), P(168.5, 100), P(170.5, 88.5)],
    door: P(149.5, 92.5),
    lookout: P(151, 113),
    leave: {
      boulevard: [P(168.5, 78), P(168.5, -16)],
      beach: [P(168.5, 78), P(159, 66), P(159, 184)],
    },
    patrolTo: [P(159, -16), P(159, 88)],
    patrolOn: [P(159, 184)],
    rivalsBlock: [P(159, -16), P(159, 60), P(170.5, 60), P(170.5, 73)],
    rivalsReverse: [P(170.5, -16)],
    rivalsAway: [],
    sirens: [P(168.5, 184), P(168.5, 106)],
    boxedCar: P(169.5, 80),
    boxedPatrol: [P(160, 96), P(160, 70), P(167, 66)],
    scatter: {
      driver: P(256, 70),
      talker: P(120, -16),
      muscle: P(256, 120),
      lookout: P(120, 184),
    },
  },
};

/** Where people stand round the car when everyone piles out. */
const AROUND_THE_CAR: Readonly<Record<Role, Point>> = {
  driver: P(-6, -2),
  talker: P(6, -2),
  muscle: P(-6, 4),
  lookout: P(6, 4),
};

type Place = 'car' | 'inside' | 'outside' | 'gone';

interface Move {
  readonly actor: ActorId;
  readonly path: readonly Point[];
  readonly start: number;
  readonly end: number;
  /** Driving backwards: the vehicle keeps facing the way it was. */
  readonly reverse: boolean;
}

interface Change {
  readonly actor: ActorId;
  readonly at: number;
  readonly set: Partial<ActorState>;
}

/** Stage directions for one line of commentary. */
type Cue = (director: JobDirector, entry: LogEntry) => void;

const insidePulse: Cue = (d) => d.pulseDoor();

/** What happens on screen for every line a collection can write. TypeScript checks none are missing. */
const CUES: Readonly<Record<CollectionKey, Cue>> = {
  'collection.arrive.parkAlley': (d) => d.arrive('alley'),
  'collection.arrive.parkStreet': (d) => d.arrive('street'),
  'collection.arrive.lookout': (d) => d.lookoutOut(0.1, 0.8),
  'collection.arrive.goodPlan': () => {},
  'collection.arrive.badPlan': () => {},
  'collection.patrol.spotted': (d) => {
    d.alert('lookout', 0, 0.45);
    d.patrolPasses(false);
  },
  'collection.patrol.coolDriver': (d) => d.patrolPasses(false),
  'collection.patrol.noticed': (d) => {
    d.patrolPasses(true);
    d.alert('car', 0.35, 0.7);
  },
  'collection.rivals.spotted': (d) => {
    d.lookoutOut(0, 0.3);
    d.alert('lookout', 0.1, 0.6);
    d.rivalsCircle();
  },
  'collection.inside.ownerEdgy': insidePulse,
  'collection.inside.lockedUp': (d) => {
    d.pulseDoor();
    d.alert('car', 0.3, 0.8);
  },
  'collection.quiet.enter': (d) => d.goInside(['talker']),
  'collection.quiet.saysTooMuch': insidePulse,
  'collection.quiet.pays': insidePulse,
  'collection.quiet.paysFamily': insidePulse,
  'collection.quiet.paysWarmly': insidePulse,
  'collection.quiet.stalls': insidePulse,
  'collection.quiet.talkedRound': insidePulse,
  'collection.quiet.muscleStepsIn': (d) => d.goInside(['muscle']),
  'collection.loud.enter': (d) => d.goInside(['muscle', 'talker']),
  'collection.loud.doormanBacksOff': (d) => d.doorman(false),
  'collection.loud.doormanFight': (d) => d.doorman(true),
  'collection.loud.paysLateFee': insidePulse,
  'collection.loud.pays': insidePulse,
  'collection.loud.partial': insidePulse,
  'collection.loud.callsPolice': (d) => d.callForHelp(),
  'collection.loud.calmsRoom': insidePulse,
  'collection.leave.calmBoulevard': (d) => d.driveOff('boulevard'),
  'collection.leave.calmBeach': (d) => d.driveOff('beach'),
  'collection.leave.rivalsExpected': (d) => d.rivalsBlock(),
  'collection.leave.rivalsAmbush': (d) => d.rivalsBlock(),
  'collection.leave.handsOver': (d) => d.handOver(),
  'collection.leave.rivalsBackOff': (d) => d.standFirm(),
  'collection.leave.rivalsTakeIt': (d) => d.brawl(),
  'collection.leave.sirens': (d) => d.sirens(),
  'collection.leave.driverRattled': (d) => d.shake('car', 0, 0.8),
  'collection.leave.escapeParkingLot': (d) => d.getaway(),
  'collection.leave.escapeRedLights': (d) => d.getaway(),
  'collection.leave.boxedIn': (d) => d.boxedIn(),
  'collection.leave.escapesOnFoot': (d, entry) => d.runFor(entry.subject, true),
  'collection.leave.arrested': (d, entry) => d.runFor(entry.subject, false),
  'collection.leave.envelopeSeized': (d) => d.alert('patrol', 0.1, 0.9),
  'collection.injury.minor': (d, entry) => d.hurt(entry.subject),
  'collection.injury.serious': (d, entry) => d.hurt(entry.subject),
  'collection.pullOut.beforeGoingIn': (d) => d.driveOff('boulevard'),
  'collection.pullOut.talkerLeaves': (d) => d.everyoneToCar(0.05, 0.8),
  'collection.pullOut.crewLeaves': (d) => d.everyoneToCar(0.05, 0.8),
  'collection.pullOut.driveAway': (d) => d.driveOff('boulevard'),
  'collection.goLoud.walksIn': (d) => d.goInside(['muscle', 'talker']),
  'collection.lieLow.patrol': (d) => d.everyoneToCar(0.05, 0.6),
  'collection.lieLow.rivals': () => {},
  'collection.lieLow.blocked': (d) => d.goInside(ROLES),
  'collection.lieLow.ownerSweet': insidePulse,
  'collection.lieLow.ownerPhones': (d) => {
    d.pulseDoor();
    d.alert('rivals', 0.2, 0.9);
  },
  'collection.lieLow.rivalsGiveUp': (d) => d.rivalsLeave(0.1, 0.9),
  'collection.lieLow.rivalsWait': (d) => d.everyoneToCar(0.05, 0.8),
};

/** Every line with stage directions. */
export const CUED_KEYS = Object.keys(CUES) as CollectionKey[];

function hiddenActor(): ActorState {
  return {
    x: -100,
    y: -100,
    facing: 'north',
    visible: false,
    moving: false,
    lights: false,
    sirens: false,
    alert: false,
    hurt: false,
    shaking: false,
  };
}

function facingOf(from: Point, to: Point): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'east' : 'west';
  return dy > 0 ? 'south' : 'north';
}

const OPPOSITE: Readonly<Record<Facing, Facing>> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

/** Starts and ends a move gently. */
const ease = (t: number): number => t * t * (3 - 2 * t);

/** The point a fraction of the way along a path, measured by distance. */
function along(path: readonly Point[], t: number): { point: Point; facing: Facing } {
  const first = path[0] ?? P(0, 0);
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
  }
  let left = total * t;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) continue;
    if (left <= length || i === path.length - 1) {
      const k = Math.min(1, left / length);
      return { point: P(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k), facing: facingOf(a, b) };
    }
    left -= length;
  }
  return { point: path[path.length - 1] ?? first, facing: 'north' };
}

export class JobDirector {
  readonly actors: Record<ActorId, ActorState>;
  /** How brightly the business's door is lit, 0 to 1, when something is happening inside. */
  doorGlow = 0;
  private parking: Parking = 'alley';
  private moves: Move[] = [];
  private changes: Change[] = [];
  private pulse = false;
  /** Where each actor will be once the current beat's moves are done. */
  private readonly planned = new Map<ActorId, Point>();
  /** Where each person will be once the current beat is done. */
  private readonly places: Record<PersonId, Place> = {
    driver: 'car',
    talker: 'car',
    muscle: 'car',
    lookout: 'car',
    doorman: 'gone',
    caller: 'gone',
  };

  constructor(readonly plan: CollectionPlan) {
    this.actors = {
      car: hiddenActor(),
      patrol: hiddenActor(),
      rivals: hiddenActor(),
      driver: hiddenActor(),
      talker: hiddenActor(),
      muscle: hiddenActor(),
      lookout: hiddenActor(),
      doorman: hiddenActor(),
      caller: hiddenActor(),
    };
  }

  /** Where the crew parked. */
  get spot(): Parking {
    return this.parking;
  }

  /** Where the crew go in and out of the business. */
  get door(): Point {
    return SPOTS[this.parking].door;
  }

  /** Starts the stage directions for a new line. Anything still moving jumps to where it was going. */
  cue(entry: LogEntry): void {
    this.finish();
    CUES[entry.key](this, entry);
  }

  /** Puts everything where it should be, `progress` (0 to 1) of the way through the beat. */
  update(progress: number): void {
    for (const actor of Object.values(this.actors)) actor.moving = false;
    // Changes first, so a move that has started takes over from where a change put someone.
    for (const change of this.changes) {
      if (progress >= change.at) Object.assign(this.actors[change.actor], change.set);
    }
    for (const move of this.moves) this.applyMove(move, progress);
    this.doorGlow = this.pulse ? Math.sin(Math.PI * Math.min(1, progress)) : 0;
  }

  /** Finishes the current beat at once. */
  finish(): void {
    this.update(1);
    for (const actor of Object.values(this.actors)) {
      actor.alert = false;
      actor.hurt = false;
      actor.shaking = false;
    }
    this.moves = [];
    this.changes = [];
    this.pulse = false;
    this.doorGlow = 0;
    this.planned.clear();
  }

  // Stage directions, used by the cues.

  arrive(parking: Parking): void {
    this.parking = parking;
    const spot = SPOTS[parking];
    const start = spot.arrive[0] ?? spot.car;
    this.set('car', 0, { x: start.x, y: start.y, visible: true, lights: true });
    this.planned.set('car', start);
    this.go('car', spot.arrive.slice(1), 0.05, 0.85);
    this.set('car', 0.9, { lights: false });
  }

  lookoutOut(start: number, end: number): void {
    if (this.places.lookout === 'outside') return;
    this.getOut('lookout', [SPOTS[this.parking].lookout], start, end);
  }

  patrolPasses(slowsDown: boolean): void {
    const spot = SPOTS[this.parking];
    this.enter('patrol', spot.patrolTo, { lights: true, sirens: false });
    if (slowsDown) {
      this.go('patrol', spot.patrolTo.slice(1), 0, 0.4);
      this.go('patrol', spot.patrolOn, 0.65, 1);
    } else {
      this.go('patrol', [...spot.patrolTo.slice(1), ...spot.patrolOn], 0, 1);
    }
    this.set('patrol', 1, { visible: false });
  }

  rivalsCircle(): void {
    this.enter('rivals', RIVALS_CIRCLE, { lights: true });
    this.go('rivals', RIVALS_CIRCLE.slice(1), 0.05, 0.95);
    this.set('rivals', 1, { visible: false });
  }

  goInside(roles: readonly Role[]): void {
    let start = 0.05;
    for (const role of roles) {
      if (this.places[role] === 'inside') continue;
      const from = this.places[role] === 'car' ? 'car' : 'outside';
      if (from === 'car') {
        this.getOut(role, [this.door], start, start + 0.55);
      } else {
        this.go(role, [this.door], start, start + 0.55);
      }
      this.set(role, start + 0.6, { visible: false });
      this.places[role] = 'inside';
      start += 0.12;
    }
  }

  /** Everyone outside or inside walks back to the car and gets in. Returns when they're in. */
  everyoneToCar(start: number, end: number): number {
    const car = this.whereWill('car');
    let anyone = false;
    for (const role of ROLES) {
      const place = this.places[role];
      if (place === 'inside') {
        this.set(role, start, { x: this.door.x, y: this.door.y, visible: true });
        this.planned.set(role, this.door);
      } else if (place !== 'outside') {
        continue;
      }
      anyone = true;
      this.go(role, [car], start, end);
      this.set(role, end, { visible: false });
      this.places[role] = 'car';
    }
    return anyone ? end : start;
  }

  driveOff(route: 'boulevard' | 'beach'): void {
    const ready = this.everyoneToCar(0, 0.4);
    this.set('car', ready, { lights: true });
    this.go('car', SPOTS[this.parking].leave[route], ready + 0.05, 1);
  }

  doorman(fight: boolean): void {
    const door = this.door;
    const side = this.parking === 'alley' ? -1 : 1;
    this.set('doorman', 0, { x: door.x + side * 3, y: door.y - 4, visible: true });
    this.set('muscle', 0, { x: door.x, y: door.y + 3, visible: true });
    this.planned.set('muscle', P(door.x, door.y + 3));
    this.places.doorman = 'outside';
    if (fight) {
      this.shake('doorman', 0.1, 0.7);
      this.shake('muscle', 0.1, 0.7);
    } else {
      this.planned.set('doorman', P(door.x + side * 3, door.y - 4));
      this.go('doorman', [P(door.x + side * 6, door.y - 8)], 0.2, 0.6);
    }
    this.go('muscle', [door], 0.75, 0.95);
    this.set('muscle', 0.95, { visible: false });
  }

  callForHelp(): void {
    this.places.caller = 'outside';
    this.set('caller', 0, { x: BACK_DOOR.x, y: BACK_DOOR.y, visible: true });
    this.planned.set('caller', BACK_DOOR);
    this.go('caller', [P(BACK_DOOR.x - 3, PAYPHONE.y - 4), PAYPHONE], 0.05, 0.85);
    this.alert('caller', 0.85, 1);
  }

  rivalsBlock(): void {
    this.everyoneToCar(0, 0.45);
    const block = SPOTS[this.parking].rivalsBlock;
    this.enter('rivals', block, { lights: true });
    this.go('rivals', block.slice(1), 0.1, 0.8);
    this.alert('rivals', 0.8, 1);
  }

  rivalsLeave(start: number, end: number): void {
    const spot = SPOTS[this.parking];
    const middle = start + (end - start) * 0.4;
    this.go('rivals', spot.rivalsReverse, start, middle, true);
    if (spot.rivalsAway.length > 0) this.go('rivals', spot.rivalsAway, middle, end);
    this.set('rivals', end, { visible: false });
  }

  handOver(): void {
    this.walkToRivals(0, 0.45);
    this.everyoneToCar(0.5, 0.8);
    this.rivalsLeave(0.55, 1);
  }

  standFirm(): void {
    this.walkToRivals(0, 0.3);
    this.rivalsLeave(0.35, 0.9);
    this.everyoneToCar(0.9, 1);
  }

  brawl(): void {
    this.walkToRivals(0, 0.3);
    this.shake('muscle', 0.3, 0.75);
    this.shake('rivals', 0.3, 0.75);
    this.everyoneToCar(0.75, 0.9);
    this.rivalsLeave(0.7, 1);
  }

  sirens(): void {
    this.everyoneToCar(0, 0.35);
    const path = SPOTS[this.parking].sirens;
    this.enter('patrol', path, { lights: true, sirens: true });
    this.go('patrol', path.slice(1), 0.2, 0.9);
    this.set('car', 0.2, { lights: true });
  }

  getaway(): void {
    const route = SPOTS[this.parking].leave.boulevard;
    const car = this.whereWill('car');
    this.set('car', 0, { lights: true });
    this.go('car', route, 0, 0.6);
    this.go('patrol', [car, ...route], 0.15, 0.85);
    this.set('car', 0.6, { visible: false });
    this.set('patrol', 0.85, { visible: false });
  }

  boxedIn(): void {
    const spot = SPOTS[this.parking];
    this.go('car', [spot.boxedCar], 0, 0.3);
    this.go('patrol', spot.boxedPatrol, 0, 0.35);
    // Doors fly open and everyone piles out.
    for (const role of ROLES) {
      const offset = AROUND_THE_CAR[role];
      const at = P(spot.boxedCar.x + offset.x, spot.boxedCar.y + offset.y);
      this.set(role, 0.45, { x: spot.boxedCar.x, y: spot.boxedCar.y, visible: true });
      this.planned.set(role, spot.boxedCar);
      this.go(role, [at], 0.45, 0.7);
      this.places[role] = 'outside';
    }
  }

  runFor(role: Role | undefined, escapes: boolean): void {
    if (!role) return;
    const spot = SPOTS[this.parking];
    if (escapes) {
      this.go(role, [spot.scatter[role]], 0, 0.85);
      this.set(role, 0.85, { visible: false });
      this.places[role] = 'gone';
      return;
    }
    const patrol = this.whereWill('patrol');
    const index = ROLES.indexOf(role);
    this.go(role, [P(patrol.x + 7, patrol.y - 5 + index * 3)], 0, 0.5);
    this.alert(role, 0.5, 1);
  }

  hurt(role: Role | undefined): void {
    if (!role) return;
    const place = this.places[role];
    if (place === 'outside') {
      this.set(role, 0, { hurt: true });
    } else {
      this.alert('car', 0, 0.8);
    }
  }

  pulseDoor(): void {
    this.pulse = true;
  }

  alert(actor: ActorId, start: number, end: number): void {
    this.set(actor, start, { alert: true });
    this.set(actor, end, { alert: false });
  }

  shake(actor: ActorId, start: number, end: number): void {
    this.set(actor, start, { shaking: true });
    this.set(actor, end, { shaking: false });
  }

  // Building blocks.

  private walkToRivals(start: number, end: number): void {
    const rivals = this.whereWill('rivals');
    const car = this.whereWill('car');
    const toward = P(car.x + (rivals.x - car.x) * 0.6, car.y + (rivals.y - car.y) * 0.6);
    this.getOut('muscle', [toward], start, end);
  }

  /** Brings a vehicle onto the map at the start of a path. */
  private enter(vehicle: VehicleId, path: readonly Point[], state: Partial<ActorState>): void {
    const start = path[0] ?? P(0, 0);
    const next = path[1] ?? start;
    this.set(vehicle, 0, {
      x: start.x,
      y: start.y,
      facing: facingOf(start, next),
      visible: true,
      ...state,
    });
    this.planned.set(vehicle, start);
  }

  /** Gets a crew member out of the car and walks them along a path. */
  private getOut(role: Role, path: readonly Point[], start: number, end: number): void {
    const car = this.whereWill('car');
    this.set(role, start, { x: car.x, y: car.y, visible: true });
    this.planned.set(role, car);
    this.go(role, path, start, end);
    this.places[role] = 'outside';
  }

  private go(
    actor: ActorId,
    waypoints: readonly Point[],
    start: number,
    end: number,
    reverse = false,
  ): void {
    const from = this.whereWill(actor);
    this.moves.push({ actor, path: [from, ...waypoints], start, end, reverse });
    this.planned.set(actor, waypoints[waypoints.length - 1] ?? from);
  }

  private set(actor: ActorId, at: number, set: Partial<ActorState>): void {
    // Kept in time order, so jumping to the end of a beat leaves everything as it should be.
    const index = this.changes.findIndex((change) => change.at > at);
    this.changes.splice(index === -1 ? this.changes.length : index, 0, { actor, at, set });
  }

  private whereWill(actor: ActorId): Point {
    const planned = this.planned.get(actor);
    if (planned) return planned;
    const state = this.actors[actor];
    return P(state.x, state.y);
  }

  private applyMove(move: Move, progress: number): void {
    if (progress < move.start) return;
    const span = move.end - move.start;
    const t = span <= 0 ? 1 : Math.min(1, (progress - move.start) / span);
    const { point, facing } = along(move.path, ease(t));
    const actor = this.actors[move.actor];
    actor.x = point.x;
    actor.y = point.y;
    if (move.path.length > 1 && t > 0) {
      actor.facing = move.reverse ? OPPOSITE[facing] : facing;
    }
    if (t < 1) actor.moving = true;
  }
}
