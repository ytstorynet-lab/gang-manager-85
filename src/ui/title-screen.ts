import { mountCityView } from '../city/city-view';
import { t } from '../i18n';

export interface TitleScreenOptions {
  /** Which build is running, shown in the corner. */
  shell: 'browser' | 'electron';
  version: string;
  /** Adds a Quit button when given (the desktop build only). */
  onQuit?: () => void;
}

/** Makes an element with an optional class and text. */
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Replaces everything in `root` with the title screen. */
export async function showTitleScreen(
  root: HTMLElement,
  options: TitleScreenOptions,
): Promise<void> {
  const screen = element('main', 'title-screen');

  const cityHost = element('div', 'city-view');
  cityHost.dataset['testid'] = 'city-view';

  const panel = element('section', 'title-panel');
  panel.setAttribute('aria-labelledby', 'game-title');

  const heading = element('h1', 'logo', t('game.title'));
  heading.id = 'game-title';

  const tagline = element('p', 'tagline', t('title.tagline'));

  const menu = element('nav', 'menu');
  menu.setAttribute('aria-label', t('menu.label'));

  const newGame = element('button', 'menu-button primary', t('menu.newGame'));
  newGame.type = 'button';
  newGame.disabled = true;
  newGame.setAttribute('aria-describedby', 'new-game-note');

  const newGameNote = element('p', 'menu-note', t('menu.newGameSoon'));
  newGameNote.id = 'new-game-note';

  menu.append(newGame, newGameNote);

  if (options.onQuit) {
    const quit = element('button', 'menu-button', t('menu.quit'));
    quit.type = 'button';
    quit.addEventListener('click', options.onQuit);
    menu.append(quit);
  }

  const shellName = t(options.shell === 'electron' ? 'build.desktop' : 'build.browser');
  const buildInfo = element(
    'p',
    'build-info',
    `${t('build.version', { version: options.version })} · ${shellName}`,
  );

  panel.append(heading, tagline, menu, buildInfo);
  screen.append(cityHost, panel);
  root.replaceChildren(screen);

  await mountCityView(cityHost);
}
