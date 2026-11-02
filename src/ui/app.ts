/** Moves the player between screens, over the city view that stays behind them all. */
import { createCityView, type CityView } from '../city/city-view';
import type { Approach } from '../sim/jobs/collection';
import type { Business } from '../sim/world';
import { showBriefing } from './briefing-screen';
import { element, type Cleanup } from './dom';
import { newCrew, randomSeed, type CrewSetup } from './job-setup';
import { showTitleScreen } from './title-screen';
import { showWatchScreen } from './watch-screen';

export interface AppOptions {
  readonly shell: 'browser' | 'electron';
  readonly version: string;
  /** Adds a Quit button to the title screen (the desktop build only). */
  readonly onQuit?: () => void;
  /**
   * Makes the first crew and job the same every time, for tests and for replaying a bug.
   * Later ones get fresh seeds.
   */
  readonly seed?: string;
}

export async function startApp(root: HTMLElement, options: AppOptions): Promise<void> {
  const cityHost = element('div', 'city-view');
  cityHost.dataset['testid'] = 'city-view';
  const screenHost = element('div', 'screen-host');
  root.replaceChildren(cityHost, screenHost);

  // The game can still be played as commentary if the city view can't start.
  const cityReady: Promise<CityView | undefined> = createCityView(cityHost).catch(
    (error: unknown) => {
      console.error('The city view could not start', error);
      return undefined;
    },
  );
  let leaveScreen: Cleanup = () => {};
  let starting = false;
  let crew: CrewSetup = newCrew(options.seed ?? randomSeed());
  let business: Business | undefined;
  let approach: Approach | undefined;
  let jobs = 0;

  const show = (screen: () => Cleanup): void => {
    leaveScreen();
    leaveScreen = screen();
  };

  const title = (): void =>
    show(() =>
      showTitleScreen(screenHost, {
        shell: options.shell,
        version: options.version,
        onWatchJob: briefing,
        ...(options.onQuit ? { onQuit: options.onQuit } : {}),
      }),
    );

  const briefing = (): void =>
    show(() =>
      showBriefing(screenHost, {
        crew,
        ...(business ? { business } : {}),
        ...(approach ? { approach } : {}),
        onNewCrew: (choice) => {
          ({ business, approach } = choice);
          crew = newCrew(randomSeed());
          briefing();
        },
        onStart: (choice) => {
          ({ business, approach } = choice);
          void watch(choice.business, choice.approach);
        },
        onBack: title,
      }),
    );

  const watch = async (chosenBusiness: Business, chosenApproach: Approach): Promise<void> => {
    if (starting) return;
    starting = true;
    // Usually ready long before anyone gets this far, but the job needs it to be drawn.
    const city = await cityReady;
    starting = false;
    jobs += 1;
    const seed =
      options.seed !== undefined && jobs === 1 ? options.seed : `${crew.seed}-${randomSeed()}`;
    show(() =>
      showWatchScreen(screenHost, {
        setup: { crew, business: chosenBusiness, approach: chosenApproach, seed },
        city,
        onAgain: briefing,
        onMenu: title,
      }),
    );
  };

  title();
  await cityReady;
}
