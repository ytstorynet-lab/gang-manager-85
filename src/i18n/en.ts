/**
 * Every piece of text the player sees lives here, keyed by an id.
 *
 * To add a language: copy this file (for example to de.ts), translate the values,
 * keep every {placeholder} exactly as it is, and register the file in index.ts.
 */
export const en = {
  'game.title': "Gang Manager '85",
  'title.tagline': 'Run the crew. Take the city. Rico City, 1985.',
  'menu.label': 'Main menu',
  'menu.newGame': 'New game',
  'menu.newGameSoon': 'Not playable yet',
  'menu.quit': 'Quit',
  'build.version': 'Version {version}',
  'build.browser': 'Browser build',
  'build.desktop': 'Desktop build',
} as const;

export type MessageKey = keyof typeof en;
