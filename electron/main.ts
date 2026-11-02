// The desktop shell: one window that loads the game. The game itself lives in src/.
import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';

// During development, `GM85_DEV_SERVER_URL=http://localhost:5173 npx electron .`
// loads the live Vite dev server instead of the built files.
const devServerUrl = app.isPackaged ? undefined : process.env['GM85_DEV_SERVER_URL'];

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 640,
    title: "Gang Manager '85",
    backgroundColor: '#120f24',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // The game's pages get no direct access to Node or the file system.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());

  // Links to websites open in the player's browser; the game window never navigates away.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event) => event.preventDefault());

  if (devServerUrl) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

void app.whenReady().then(createWindow);

app.on('window-all-closed', () => app.quit());
