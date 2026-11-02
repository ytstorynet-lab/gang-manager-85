import { t } from '../i18n';
import { button, element, type Cleanup } from './dom';

export interface TitleScreenOptions {
  /** Which build is running, shown in the corner. */
  readonly shell: 'browser' | 'electron';
  readonly version: string;
  readonly onWatchJob: () => void;
  /** Adds a Quit button when given (the desktop build only). */
  readonly onQuit?: () => void;
}

/** Shows the title screen in `host`, over the city. */
export function showTitleScreen(host: HTMLElement, options: TitleScreenOptions): Cleanup {
  const screen = element('main', 'title-screen');

  const panel = element('section', 'title-panel');
  panel.setAttribute('aria-labelledby', 'game-title');

  const heading = element('h1', 'logo', t('game.title'));
  heading.id = 'game-title';

  const tagline = element('p', 'tagline', t('title.tagline'));

  const menu = element('nav', 'menu');
  menu.setAttribute('aria-label', t('menu.label'));

  const watchJob = button('menu-button primary', t('menu.watchJob'), options.onWatchJob);
  watchJob.setAttribute('aria-describedby', 'watch-job-note');
  const watchJobNote = element('p', 'menu-note', t('menu.watchJobNote'));
  watchJobNote.id = 'watch-job-note';
  menu.append(watchJob, watchJobNote);

  if (options.onQuit) {
    menu.append(button('menu-button', t('menu.quit'), options.onQuit));
  }

  const shellName = t(options.shell === 'electron' ? 'build.desktop' : 'build.browser');
  const buildInfo = element(
    'p',
    'build-info',
    `${t('build.version', { version: options.version })} · ${shellName}`,
  );

  panel.append(heading, tagline, menu, buildInfo);
  screen.append(panel);
  host.replaceChildren(screen);

  return () => screen.remove();
}
