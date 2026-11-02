import '@fontsource/barlow-semi-condensed/400.css';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';
import '@fontsource/silkscreen/400.css';
import './styles.css';
import { showTitleScreen } from './ui/title-screen';

const root = document.getElementById('app');
if (!root) {
  throw new Error('The page is missing its #app element');
}

const shell = window.gm85?.shell === 'electron' ? 'electron' : 'browser';

void showTitleScreen(root, {
  shell,
  version: __APP_VERSION__,
  ...(shell === 'electron' ? { onQuit: () => window.close() } : {}),
});
