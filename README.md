# Gang Manager '85

Run a crew in Rico City, 1985. A crime management game for Windows PC, with the depth of a football management game and a GTA-style satirical setting.

**Status:** step 2 of 6, the simulation on its own. Crew members and the first job (the collection) run as plain text from the command line. The title screen is still a placeholder.

## Run it on your Mac

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>. The page reloads as soon as the code changes.

## Commands

| Command             | What it does                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| `npm run dev`       | Runs the browser build with live reload                                     |
| `npm run sim`       | Plays one collection and prints it as a play-by-play                        |
| `npm run sim:batch` | Plays 1,000 collections per crew level and approach, and prints the balance |
| `npm test`          | Runs the unit tests (Vitest)                                                |
| `npm run test:e2e`  | Builds the game and runs the browser test (Playwright)                      |
| `npm run check`     | Type check, lint, formatting check and unit tests in one go                 |
| `npm run electron`  | Builds the game and opens the desktop version                               |
| `npm run dist:win`  | Packages the Windows build (GitHub Actions does this for you)               |

Before your first browser test, install Playwright's browser with `npx playwright install chromium`.

`npm run sim` takes options: `npm run sim -- --seed 1985 --approach loud --quality 14`. The same seed always plays out the same way. [How the collection works](docs/collection-job.md) explains the rules and numbers behind it.

## The Windows build

GitHub Actions runs every check on each pull request and each push to `main`. It then packages the Windows build, launches it to check it opens on the title screen, and attaches the zip to the run under **Artifacts**.

## How the code is laid out

| Folder       | What's in it                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| `src/sim`    | The simulation. No graphics, no browser and no `Math.random()`, so tests can replay thousands of years. |
| `src/report` | Turns simulation results into readable text.                                                            |
| `tools`      | Command-line tools for playing and balancing the simulation.                                            |
| `src/ui`     | The management screens, in plain HTML and CSS.                                                          |
| `src/city`   | The top-down city view, drawn with PixiJS.                                                              |
| `src/i18n`   | Every piece of text the player sees, ready for translation.                                             |
| `src/store`  | One interface for Steam and the other stores, plus a fake store for tests.                              |
| `electron`   | The desktop shell for Windows.                                                                          |
| `tests`      | Unit tests, the browser test and the desktop test.                                                      |
| `docs`       | How the jobs work, and the licence register.                                                            |

## Ground rules

- The simulation only uses the seeded random numbers in `src/sim/rng.ts`. ESLint blocks `Math.random()` there.
- All text the player sees goes through `t()` in `src/i18n`.
- The desktop window is locked down: the game page can't reach Node or the file system, and a strict content security policy blocks anything not shipped with the game.
- Every library, font and image is listed in [the licence register](docs/LICENCES.md) before it ships.

## Art

The game's art is made by Claude, an AI, so the Steam page will carry Steam's AI content disclosure. The city image on the title screen comes from the pixel art test and will be replaced.
