import '@fontsource/barlow-semi-condensed/400.css';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';
import '@fontsource/silkscreen/400.css';
import './styles.css';
import { startApp } from './ui/app';

const root = document.getElementById('app');
if (!root) {
  throw new Error('The page is missing its #app element');
}

const shell = window.gm85?.shell === 'electron' ? 'electron' : 'browser';
// ?seed=anything makes the first crew and job the same every time, for tests and bug reports.
const seed = new URLSearchParams(window.location.search).get('seed') ?? undefined;

void startApp(root, {
  shell,
  version: __APP_VERSION__,
  ...(shell === 'electron' ? { onQuit: () => window.close() } : {}),
  ...(seed ? { seed } : {}),
});
