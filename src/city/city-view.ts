import { Application, Assets, Sprite, type Texture } from 'pixi.js';
// Lets PixiJS run under the game's strict content security policy, which bans eval().
import 'pixi.js/unsafe-eval';

/** Stand-in art from the pixel art test until the real city view arrives in step 3. */
const PLACEHOLDER_CITY = `${import.meta.env.BASE_URL}assets/placeholder/city-night.png`;

export interface CityView {
  destroy(): void;
}

/**
 * Draws the city into the given element with PixiJS and keeps it filling the element.
 * Sets `data-ready="true"` on the element once the first frame is on screen.
 */
export async function mountCityView(host: HTMLElement): Promise<CityView> {
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

  const texture: Texture = await Assets.load(PLACEHOLDER_CITY);
  texture.source.scaleMode = 'nearest';
  const city = new Sprite(texture);
  app.stage.addChild(city);

  const layout = (): void => {
    const { width, height } = app.screen;
    // Scale by whole numbers only, so every pixel stays square and sharp.
    const scale = Math.max(1, Math.ceil(Math.max(width / texture.width, height / texture.height)));
    city.scale.set(scale);
    city.position.set(
      Math.round((width - texture.width * scale) / 2),
      Math.round((height - texture.height * scale) / 2),
    );
  };
  layout();
  app.renderer.on('resize', layout);

  app.ticker.addOnce(() => {
    host.dataset['ready'] = 'true';
  });

  return {
    destroy: () => app.destroy(true, { children: true }),
  };
}
