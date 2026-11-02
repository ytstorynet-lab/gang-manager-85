/// <reference types="vite/client" />

/** The game's version, taken from package.json at build time. */
declare const __APP_VERSION__: string;

interface Window {
  /** Set by the desktop build's preload script; missing in the browser build. */
  gm85?: { readonly shell: 'electron' };
}
