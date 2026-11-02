# Gang Manager '85

Run a crew in Rico City, 1985. A crime management game for Windows PC, with the depth of a football management game and a GTA-style satirical setting.

**Status:** step 3 of 6, watching a job. Pick a crew, a business and an approach, then watch the collection play out on the beach strip and make sideline calls as it goes. The art is rough placeholder art until step 6.

## Run it on your Mac

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm run dev
```

Then open <http://localhost:5173> and choose **Watch a job**. The page reloads as soon as the code changes.

## Watching a job

- **Speed:** Pause, 1×, 2× and 4× along the top. On the keyboard, Space pauses and 1, 2 and 3 pick 1×, 2× and 4×.
- **Sideline calls:** Pull out, Go loud and Lie low light up when the crew can act on them. [How the collection works](docs/collection-job.md) explains what each one does.
- **Speed check:** the counter in the corner shows frames per second. **Stress test** adds 1,000 and then 5,000 people walking round the block, to see how much room there is to spare.
- **Replays:** add `?seed=` and any text to the address, such as <http://localhost:5173/?seed=1985>, and the first crew and job are the same every time. The seed is shown after each job.

## Commands

| Command             | What it does                                                                            |
| ------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`       | Runs the browser build with live reload                                                 |
| `npm run sim`       | Plays one collection and prints it as a play-by-play                                    |
| `npm run sim:batch` | Plays thousands of collections and prints the balance, including what each call changes |
| `npm test`          | Runs the unit tests (Vitest)                                                            |
| `npm run test:e2e`  | Builds the game and runs the browser tests (Playwright)                                 |
| `npm run check`     | Type check, lint, formatting check and unit tests in one go                             |
| `npm run electron`  | Builds the game and opens the desktop version                                           |
| `npm run dist:win`  | Packages the Windows build (GitHub Actions does this for you)                           |

Before your first browser test, install Playwright's browser with `npx playwright install chromium`.

`npm run sim` takes options: `npm run sim -- --seed 1985 --approach loud --quality 14`. The same seed always plays out the same way. [How the collection works](docs/collection-job.md) explains the rules and numbers behind it.

## The Windows build

GitHub Actions runs every check on each pull request and each push to `main`. It then packages the Windows build, launches it to check it opens on the title screen, and attaches the zip to the run under **Artifacts**.

## How the code is laid out

| Folder       | What's in it                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| `src/sim`    | The simulation. No graphics, no browser and no `Math.random()`, so tests can replay thousands of years. |
| `src/report` | Turns simulation results into readable text.                                                            |
| `src/city`   | The city view, drawn with PixiJS, and the director that turns each line of a job into movement.         |
| `src/ui`     | The screens, in plain HTML and CSS, and the player that runs a job in real time.                        |
| `tools`      | Command-line tools for playing and balancing the simulation, and for drawing the placeholder art.       |
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

The game's art is made by Claude, an AI, so the Steam page will carry Steam's AI content disclosure. The city image on the title screen comes from the pixel art test, and the job's block, cars and people are rough placeholders. All of it will be replaced in step 6.

The placeholder job art is drawn by a script, so it can be changed and drawn again. It needs Python 3 with NumPy and Pillow:

```bash
python3 -m pip install numpy pillow
python3 tools/art/placeholder_art.py
```
