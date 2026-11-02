/**
 * Draws a job on the beach strip block with PixiJS: the crew, the cars and the police from
 * the job director, plus passing traffic, people out for the night and flickering neon.
 */
import { Container, Sprite, type Texture } from 'pixi.js';
import {
  PEOPLE,
  VEHICLES,
  type ActorState,
  type Facing,
  type JobDirector,
  type PersonId,
  type VehicleId,
} from './job-director';

/** The block's size, in its own pixels. */
export const BLOCK_WIDTH = 240;
export const BLOCK_HEIGHT = 168;

/** The middle of where jobs happen, kept on screen whatever the window size. */
const FOCUS = { x: 137, y: 88 };

/** The neon colour of each business's sign, matching the block art. */
const SIGN_COLOUR: Readonly<Record<string, number>> = {
  starlight: 0xff4fae,
  'coral-wash': 0x4ff0ff,
  neptune: 0xffb54a,
  'sunny-side': 0xff3048,
  'palm-court': 0xff4fae,
  'lucky-seven': 0x3dff8a,
  flamingo: 0x4ff0ff,
};

const ROTATION: Readonly<Record<Facing, number>> = {
  north: 0,
  east: Math.PI / 2,
  south: Math.PI,
  west: -Math.PI / 2,
};

const HEADLIGHT = 0xffc978;
const DOOR_LIGHT = 0xffcf80;

export interface SceneTextures {
  readonly block: Texture;
  sprite(name: string): Texture;
}

interface VehicleView {
  readonly root: Container;
  readonly body: Sprite;
  readonly beam: Sprite;
  readonly lamps: readonly [Sprite, Sprite];
  readonly marker: Sprite | undefined;
  readonly alert: Sprite;
}

interface PersonView {
  readonly body: Sprite;
  readonly marker: Sprite | undefined;
  readonly alert: Sprite;
}

interface Walker {
  readonly sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Walkers on a path turn back at its ends; the stress test bounces round the whole block. */
  readonly bounds: { x0: number; x1: number; y0: number; y1: number };
}

interface TrafficCar {
  readonly root: Container;
  y: number;
  readonly speed: number;
}

export class JobScene {
  readonly root = new Container();
  private readonly world = new Container();
  private readonly vehicles: Record<VehicleId, VehicleView>;
  private readonly people: Record<PersonId, PersonView>;
  private readonly doorGlow: Sprite;
  private readonly signGlow: Sprite;
  private readonly traffic: TrafficCar[] = [];
  private readonly walkers: Walker[] = [];
  private readonly crowd: Walker[] = [];
  private readonly trafficLayer = new Container();
  private readonly walkerLayer = new Container();
  private readonly crowdLayer = new Container();
  /** Scene time in seconds, at the job's speed. */
  private time = 0;
  private nextCar = 1.5;
  private flickerUntil = 0;

  constructor(
    private readonly director: JobDirector,
    private readonly textures: SceneTextures,
    businessId: string,
  ) {
    this.root.addChild(this.world);
    this.world.addChild(new Sprite(textures.block));

    this.signGlow = this.glow(SIGN_COLOUR[businessId] ?? 0xff4fae, 125.5, 67, 2.2);
    this.doorGlow = this.glow(DOOR_LIGHT, 0, 0, 0.9);
    this.world.addChild(this.signGlow, this.doorGlow, this.trafficLayer, this.walkerLayer);

    const vehicleTextures: Record<VehicleId, string> = {
      car: 'car-crew',
      patrol: 'car-patrol',
      rivals: 'car-rivals',
    };
    this.vehicles = {} as Record<VehicleId, VehicleView>;
    for (const id of VEHICLES) {
      this.vehicles[id] = this.makeVehicle(
        vehicleTextures[id],
        id === 'car' ? 'chevron-crew' : id === 'rivals' ? 'chevron-rivals' : undefined,
      );
    }

    this.people = {} as Record<PersonId, PersonView>;
    for (const id of PEOPLE) {
      const body = new Sprite(textures.sprite(`person-${id}`));
      body.anchor.set(0.5);
      const crew = id !== 'doorman' && id !== 'caller';
      const marker = crew ? this.marker('chevron-crew') : undefined;
      const alert = this.marker('alert');
      this.world.addChild(body);
      this.people[id] = { body, marker, alert };
    }
    this.world.addChild(this.crowdLayer);
    for (const view of [...Object.values(this.vehicles), ...Object.values(this.people)]) {
      if (view.marker) this.world.addChild(view.marker);
      this.world.addChild(view.alert);
    }

    this.addLocals();
    this.sync();
  }

  /**
   * Scales the block by a whole number so it covers the part of the screen not hidden by
   * panels (`focusWidth` pixels from the left), and centres the action in that part.
   */
  layout(width: number, height: number, focusWidth: number): void {
    const scale = Math.max(1, Math.ceil(Math.max(focusWidth / BLOCK_WIDTH, height / BLOCK_HEIGHT)));
    this.world.scale.set(scale);
    const clamp = (value: number, min: number, max: number) =>
      Math.round(Math.min(max, Math.max(min, value)));
    this.world.position.set(
      clamp(focusWidth / 2 - FOCUS.x * scale, Math.min(focusWidth, width) - BLOCK_WIDTH * scale, 0),
      clamp(height / 2 - FOCUS.y * scale, height - BLOCK_HEIGHT * scale, 0),
    );
  }

  /** Moves the scene on. `seconds` is real time already multiplied by the job's speed. */
  update(seconds: number): void {
    this.time += seconds;
    this.sync();
    this.updateTraffic(seconds);
    for (const walker of this.walkers) this.walk(walker, seconds);
    for (const walker of this.crowd) this.walk(walker, seconds);
  }

  /** The stress test: adds `count` people wandering round the block. */
  setCrowd(count: number): void {
    while (this.crowd.length > count) {
      this.crowd.pop()?.sprite.destroy();
    }
    for (let i = this.crowd.length; i < count; i++) {
      const sprite = new Sprite(this.textures.sprite(`person-local-${(i % 5) + 1}`));
      sprite.anchor.set(0.5);
      this.crowdLayer.addChild(sprite);
      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 10;
      this.crowd.push({
        sprite,
        x: Math.random() * BLOCK_WIDTH,
        y: Math.random() * BLOCK_HEIGHT,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        bounds: { x0: 0, x1: BLOCK_WIDTH, y0: 0, y1: BLOCK_HEIGHT },
      });
    }
  }

  get crowdSize(): number {
    return this.crowd.length;
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }

  // Drawing the director's actors.

  private sync(): void {
    const actors = this.director.actors;
    const blink = Math.floor(this.time * 8) % 2 === 0;
    const flash = Math.floor(this.time * 6) % 2 === 0;
    const bob = Math.sin(this.time * 6) * 0.6;

    for (const id of VEHICLES) {
      const view = this.vehicles[id];
      const state = actors[id];
      view.root.visible = state.visible;
      view.root.position.set(state.x + this.shake(state), state.y);
      view.root.rotation = ROTATION[state.facing];
      view.beam.visible = state.lights;
      if (id === 'patrol') {
        view.body.texture = this.textures.sprite(
          state.sirens ? (flash ? 'car-patrol-red' : 'car-patrol-blue') : 'car-patrol',
        );
        view.lamps[0].visible = state.sirens && flash;
        view.lamps[1].visible = state.sirens && !flash;
      } else {
        const base = id === 'car' ? 'car-crew' : 'car-rivals';
        view.body.texture = this.textures.sprite(state.lights ? base : `${base}-dark`);
      }
      this.placeMarkers(view, state, 9, bob);
    }

    for (const id of PEOPLE) {
      const view = this.people[id];
      const state = actors[id];
      const step = state.moving ? Math.round(Math.sin(this.time * 14)) * 0.5 : 0;
      view.body.visible = state.visible && !(state.hurt && blink);
      view.body.position.set(state.x + this.shake(state), state.y + step);
      this.placeMarkers(view, state, 4, bob);
    }

    const door = this.director.door;
    this.doorGlow.position.set(door.x, door.y);
    this.doorGlow.alpha = this.director.doorGlow * 0.7;

    // The sign buzzes now and then, like old neon does.
    if (this.time > this.flickerUntil + 2 && Math.random() < 0.004) {
      this.flickerUntil = this.time + 0.12 + Math.random() * 0.2;
    }
    const buzzing = this.time < this.flickerUntil && Math.floor(this.time * 30) % 2 === 0;
    this.signGlow.alpha = buzzing ? 0.05 : 0.28 + Math.sin(this.time * 2.1) * 0.04;
  }

  private placeMarkers(
    view: { marker: Sprite | undefined; alert: Sprite },
    state: ActorState,
    height: number,
    bob: number,
  ): void {
    if (view.marker) {
      view.marker.visible = state.visible && !state.alert;
      view.marker.position.set(state.x, state.y - height + bob * 0.5);
    }
    view.alert.visible = state.visible && state.alert;
    view.alert.position.set(state.x, state.y - height - 2 + bob);
  }

  private shake(state: ActorState): number {
    return state.shaking ? Math.sin(this.time * 55) * 0.8 : 0;
  }

  // Building the pieces.

  private makeVehicle(texture: string, marker: string | undefined): VehicleView {
    const root = new Container();
    const beam = new Sprite(this.textures.sprite('cone'));
    beam.anchor.set(0.5, 1);
    beam.position.set(0, -6);
    beam.tint = HEADLIGHT;
    beam.alpha = 0.4;
    beam.blendMode = 'add';
    const body = new Sprite(this.textures.sprite(texture));
    body.anchor.set(0.5);
    const red = this.glow(0xff3048, -2, 0, 1.4);
    const blue = this.glow(0x3d6dff, 2, 0, 1.4);
    red.alpha = 0.8;
    blue.alpha = 0.8;
    red.visible = false;
    blue.visible = false;
    root.addChild(beam, body, red, blue);
    root.visible = false;
    this.world.addChild(root);
    return {
      root,
      body,
      beam,
      lamps: [red, blue],
      marker: marker ? this.marker(marker) : undefined,
      alert: this.marker('alert'),
    };
  }

  private marker(texture: string): Sprite {
    const sprite = new Sprite(this.textures.sprite(texture));
    sprite.anchor.set(0.5, 1);
    sprite.visible = false;
    return sprite;
  }

  private glow(tint: number, x: number, y: number, scale: number): Sprite {
    const sprite = new Sprite(this.textures.sprite('glow'));
    sprite.anchor.set(0.5);
    sprite.tint = tint;
    sprite.blendMode = 'add';
    sprite.scale.set(scale);
    sprite.position.set(x, y);
    return sprite;
  }

  // Life on the block, away from the job.

  private addLocals(): void {
    const paths = [
      { x0: 180, x1: 181, y0: -6, y1: 174 },
      { x0: 180, x1: 181, y0: -6, y1: 174 },
      { x0: 186, x1: 200, y0: 20, y1: 150 },
      { x0: 52, x1: 53, y0: -6, y1: 174 },
      { x0: 73, x1: 74, y0: -6, y1: 174 },
      { x0: 20, x1: 40, y0: 113, y1: 114 },
    ];
    paths.forEach((bounds, index) => {
      const sprite = new Sprite(this.textures.sprite(`person-local-${(index % 5) + 1}`));
      sprite.anchor.set(0.5);
      this.walkerLayer.addChild(sprite);
      const along = bounds.y1 - bounds.y0 > bounds.x1 - bounds.x0;
      const speed = (4 + Math.random() * 4) * (index % 2 === 0 ? 1 : -1);
      this.walkers.push({
        sprite,
        x: bounds.x0 + Math.random() * (bounds.x1 - bounds.x0),
        y: bounds.y0 + Math.random() * (bounds.y1 - bounds.y0),
        vx: along ? 0 : speed,
        vy: along ? speed : 0,
        bounds,
      });
    });
  }

  private walk(walker: Walker, seconds: number): void {
    const { bounds } = walker;
    walker.x += walker.vx * seconds;
    walker.y += walker.vy * seconds;
    if (walker.x < bounds.x0 || walker.x > bounds.x1) {
      walker.vx = -walker.vx;
      walker.x = Math.min(bounds.x1, Math.max(bounds.x0, walker.x));
    }
    if (walker.y < bounds.y0 || walker.y > bounds.y1) {
      walker.vy = -walker.vy;
      walker.y = Math.min(bounds.y1, Math.max(bounds.y0, walker.y));
    }
    const step = Math.round(Math.sin((this.time + walker.x) * 12)) * 0.5;
    walker.sprite.position.set(walker.x, walker.y + step);
  }

  /** Cars come and go on the inner street, out of the way of the job. */
  private updateTraffic(seconds: number): void {
    this.nextCar -= seconds;
    if (this.nextCar <= 0) {
      this.nextCar = 3 + Math.random() * 6;
      const north = Math.random() < 0.5;
      const root = new Container();
      const beam = new Sprite(this.textures.sprite('cone'));
      beam.anchor.set(0.5, 1);
      beam.position.set(0, -6);
      beam.tint = HEADLIGHT;
      beam.alpha = 0.32;
      beam.blendMode = 'add';
      const body = new Sprite(
        this.textures.sprite(`car-traffic-${1 + Math.floor(Math.random() * 4)}`),
      );
      body.anchor.set(0.5);
      root.addChild(beam, body);
      root.rotation = north ? 0 : Math.PI;
      root.x = north ? 66.5 : 59;
      this.trafficLayer.addChild(root);
      this.traffic.push({
        root,
        y: north ? 184 : -16,
        speed: (north ? -1 : 1) * (32 + Math.random() * 16),
      });
    }
    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const car = this.traffic[i]!;
      car.y += car.speed * seconds;
      car.root.y = car.y;
      if (car.y < -20 || car.y > 190) {
        car.root.destroy({ children: true });
        this.traffic.splice(i, 1);
      }
    }
  }
}
