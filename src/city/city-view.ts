import { Application, Assets, Rectangle, Sprite, Texture } from 'pixi.js';
// Lets PixiJS run under the game's strict content security policy, which bans eval().
import 'pixi.js/unsafe-eval';
import type { Business } from '../sim/world';
import spriteSheetUrl from './art/sprites.png';
import spriteSheet from './art/sprites.json';
import type { JobDirector } from './job-director';
import { JobScene, type SceneTextures } from './job-scene';

/** The title screen's city, from the pixel art test. */
const TITLE_CITY = `${import.meta.env.BASE_URL}assets/placeholder/city-night.png`;

/** The empty block for each business, keyed by file name. */
const BLOCKS = import.meta.glob<string>('./art/block-*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export interface CityView {
  /** Shows the city at night behind the menus. */
  showBackdrop(): void;
  /** Shows the block where a job happens, ready to play. */
  showJob(director: JobDirector, business: Business): Promise<JobScene>;
  /**
   * How much of the window, from the left, isn't covered by panels. The job scene keeps
   * the action in the middle of it. Leave it out to use the whole window.
   */
  setFocusWidth(width: number | undefined): void;
  /** Calls `callback` every frame with the seconds since the last frame. Returns a way to stop. */
  everyFrame(callback: (seconds: number) => void): () => void;
  /** Frames per second, averaged by PixiJS. */
  readonly fps: number;
}

/** Loads a picture with hard pixel edges, so it stays sharp when scaled up. */
async function loadPixelArt(url: string): Promise<Texture> {
  const texture = await Assets.load<Texture>(url);
  texture.source.scaleMode = 'nearest';
  return texture;
}

/**
 * Draws the city into the given element with PixiJS and keeps it filling the element.
 * Sets `data-ready="true"` on the element once the first frame is on screen.
 */
export async function createCityView(host: HTMLElement): Promise<CityView> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: '#0c0a1a',
    antialias: false,
    roundPixels: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  app.canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(app.canvas);

  const titleTexture = await loadPixelArt(TITLE_CITY);
  const backdrop = new Sprite(titleTexture);
  app.stage.addChild(backdrop);

  let sprites: Promise<(name: string) => Texture> | undefined;
  const loadSprites = () => {
    sprites ??= loadPixelArt(spriteSheetUrl).then((sheet) => {
      const cache = new Map<string, Texture>();
      const frames: Readonly<Record<string, readonly number[]>> = spriteSheet.frames;
      return (name: string) => {
        let texture = cache.get(name);
        if (!texture) {
          const [x = 0, y = 0, w = 1, h = 1] = frames[name] ?? [];
          texture = new Texture({ source: sheet.source, frame: new Rectangle(x, y, w, h) });
          cache.set(name, texture);
        }
        return texture;
      };
    });
    return sprites;
  };

  let job: JobScene | undefined;
  let focusWidth: number | undefined;

  const layout = (): void => {
    const { width, height } = app.screen;
    // Scale by whole numbers only, so every pixel stays square and sharp.
    const scale = Math.max(
      1,
      Math.ceil(Math.max(width / titleTexture.width, height / titleTexture.height)),
    );
    backdrop.scale.set(scale);
    backdrop.position.set(
      Math.round((width - titleTexture.width * scale) / 2),
      Math.round((height - titleTexture.height * scale) / 2),
    );
    job?.layout(width, height, focusWidth ?? width);
  };
  layout();
  app.renderer.on('resize', layout);

  app.ticker.addOnce(() => {
    host.dataset['ready'] = 'true';
  });

  return {
    showBackdrop() {
      job?.destroy();
      job = undefined;
      backdrop.visible = true;
    },

    async showJob(director, business) {
      const blockUrl = BLOCKS[`./art/block-${business.id}.png`];
      if (!blockUrl) throw new Error(`No art for the business "${business.id}"`);
      const [block, sprite] = await Promise.all([loadPixelArt(blockUrl), loadSprites()]);
      const textures: SceneTextures = { block, sprite };
      job?.destroy();
      job = new JobScene(director, textures, business.id);
      app.stage.addChild(job.root);
      backdrop.visible = false;
      layout();
      return job;
    },

    setFocusWidth(width) {
      focusWidth = width;
      layout();
    },

    everyFrame(callback) {
      const tick = () => callback(app.ticker.deltaMS / 1000);
      app.ticker.add(tick);
      return () => {
        app.ticker.remove(tick);
      };
    },

    get fps() {
      return app.ticker.FPS;
    },
  };
}
