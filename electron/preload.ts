// Runs before the game page loads. It only tells the game it's inside the desktop build;
// anything else the page needs from the desktop gets added here deliberately, one call at a time.
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('gm85', { shell: 'electron' });
