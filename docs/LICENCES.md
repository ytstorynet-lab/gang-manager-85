# Licence register

Every library, font, sound and image that ships with the game, with its licence and what we must do to comply. Add an entry before anything new ships, and check the list before each release.

## Shipped with the game

| Item                                   | Used for                                       | Licence                           | What we must do                                                                           |
| -------------------------------------- | ---------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------- |
| Electron 45                            | Desktop shell (includes Chromium and Node.js)  | MIT                               | Keep the licence files the build adds (`LICENSE.electron.txt`, `LICENSES.chromium.html`). |
| PixiJS 8                               | City view                                      | MIT                               | Show its copyright and licence notice on the game's licences screen.                      |
| Barlow Semi Condensed (via Fontsource) | Screen text                                    | SIL Open Font License 1.1         | Ship the OFL licence text with the game. Never sell the font on its own.                  |
| Silkscreen (via Fontsource)            | Title logo                                     | SIL Open Font License 1.1         | As above.                                                                                 |
| Placeholder city art                   | Title screen background                        | Made by Claude (AI) for this game | Covered by Steam's AI content disclosure. Replace with the finished art before launch.    |
| Placeholder job art (`src/city/art`)   | The block, cars and people when watching a job | Made by Claude (AI) for this game | As above. Drawn by `tools/art/placeholder_art.py`, so no outside art is used.             |

## Development tools only (not shipped)

| Tool                                | Licence    |
| ----------------------------------- | ---------- |
| TypeScript                          | Apache-2.0 |
| Vite, Vitest                        | MIT        |
| ESLint, typescript-eslint, Prettier | MIT        |
| Playwright                          | Apache-2.0 |
| electron-builder                    | MIT        |
| tsx                                 | MIT        |
| Python, for drawing placeholder art | PSF        |
| NumPy                               | BSD-3      |
| Pillow                              | MIT-CMU    |

## Before launch

- Add a licences screen to the game that shows the notices above.
- When Steam is wired in, add the Steamworks SDK redistributables, which come under Valve's own licence.
